import os
import pymongo
from pymongo import MongoClient, UpdateOne
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

MONGO_URI = "mongodb://127.0.0.1:27017/"
DB_NAME = "customer360"

def get_db():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]

def train_and_update():
    db = get_db()
    print("Loading data from MongoDB...")
    
    # 1. Load Customers
    customers_cursor = db.customers.find({}, {
        "customer_id": 1, "age": 1, "gender": 1, "location": 1, 
        "signup_date": 1, "subscription_tier": 1, "subscription_status": 1
    })
    df_cust = pd.DataFrame(list(customers_cursor))
    if df_cust.empty:
        print("No customers found in database. Please run seed_db.py first.")
        return
        
    print(f"Loaded {len(df_cust)} customers.")
    
    # 2. Load Transactions
    trans_cursor = db.transactions.find({}, {"customer_id": 1, "amount": 1, "timestamp": 1, "category": 1})
    df_trans = pd.DataFrame(list(trans_cursor))
    print(f"Loaded {len(df_trans)} transactions.")
    
    # 3. Load Support Interactions
    support_cursor = db.support_interactions.find({}, {"customer_id": 1, "sentiment": 1, "resolution_time_minutes": 1, "resolved": 1})
    df_support = pd.DataFrame(list(support_cursor))
    print(f"Loaded {len(df_support)} support interactions.")
    
    # Preprocess datetimes
    df_cust["signup_date"] = pd.to_datetime(df_cust["signup_date"])
    df_trans["timestamp"] = pd.to_datetime(df_trans["timestamp"])
    
    latest_date = df_trans["timestamp"].max() if not df_trans.empty else datetime.now()
    print(f"Latest transaction date in database: {latest_date}")
    
    print("Computing RFM metrics...")
    # RFM Calculations
    # Group transactions by customer
    if not df_trans.empty:
        tx_agg = df_trans.groupby("customer_id").agg(
            last_purchase=("timestamp", "max"),
            frequency=("timestamp", "size"),
            monetary=("amount", "sum")
        ).reset_index()
        
        tx_agg["recency"] = (latest_date - tx_agg["last_purchase"]).dt.days
    else:
        tx_agg = pd.DataFrame(columns=["customer_id", "recency", "frequency", "monetary"])
        
    # Merge back to customers
    df_metrics = pd.merge(df_cust, tx_agg, on="customer_id", how="left")
    df_metrics["recency"] = df_metrics["recency"].fillna(365 * 3) # default max recency
    df_metrics["frequency"] = df_metrics["frequency"].fillna(0)
    df_metrics["monetary"] = df_metrics["monetary"].fillna(0.0)
    
    # Quintiles for RFM scoring
    # Since recency lower is better, frequency higher is better, monetary higher is better
    # Use percentiles or qcut. Ensure safety for duplicate bins.
    def get_q_score(series, reverse=False):
        try:
            q = pd.qcut(series, 5, labels=False, duplicates='drop') + 1
            if reverse:
                q = 6 - q
            return q.fillna(1).astype(int)
        except Exception:
            # Fallback if qcut fails
            ranks = series.rank(pct=True, method='first')
            q = pd.cut(ranks, bins=[0, 0.2, 0.4, 0.6, 0.8, 1.0], labels=[1, 2, 3, 4, 5], include_lowest=True)
            if reverse:
                q = q.map({1:5, 2:4, 3:3, 4:2, 5:1})
            return q.fillna(1).astype(int)
            
    df_metrics["R"] = get_q_score(df_metrics["recency"], reverse=True)
    df_metrics["F"] = get_q_score(df_metrics["frequency"])
    df_metrics["M"] = get_q_score(df_metrics["monetary"])
    
    # Segment Assignment logic
    def assign_segment(row):
        r, f, m = row["R"], row["F"], row["M"]
        if r >= 4 and f >= 4 and m >= 4:
            return "High-Value"
        elif r >= 3 and f >= 3 and m >= 3:
            return "Loyal"
        elif r >= 4 and f <= 2:
            return "New"
        elif r <= 2 and (f >= 3 or m >= 3):
            return "At-Risk"
        elif r <= 2 and f <= 2:
            return "Hibernating"
        else:
            return "Need Attention"
            
    df_metrics["segment"] = df_metrics.apply(assign_segment, axis=1)
    print("RFM segmentation completed.")
    
    # Support Aggregation
    print("Aggregating support ticket metrics...")
    if not df_support.empty:
        supp_agg = df_support.groupby("customer_id").agg(
            support_count=("sentiment", "size"),
            negative_support_count=("sentiment", lambda x: sum(x == "Negative")),
            avg_resolution_time=("resolution_time_minutes", "mean"),
            unresolved_count=("resolved", lambda x: sum(~x))
        ).reset_index()
    else:
        supp_agg = pd.DataFrame(columns=["customer_id", "support_count", "negative_support_count", "avg_resolution_time", "unresolved_count"])
        
    df_features = pd.merge(df_metrics, supp_agg, on="customer_id", how="left")
    df_features["support_count"] = df_features["support_count"].fillna(0)
    df_features["negative_support_count"] = df_features["negative_support_count"].fillna(0)
    df_features["avg_resolution_time"] = df_features["avg_resolution_time"].fillna(0.0)
    df_features["unresolved_count"] = df_features["unresolved_count"].fillna(0)
    
    # 4. Train ML Models
    # Prepare model directory
    os.makedirs("models", exist_ok=True)
    
    # Churn Risk Prediction (classification)
    # Define churn: subscription_status is Cancelled OR recency > 90 days
    df_features["is_churned"] = (df_features["subscription_status"] == "Cancelled") | (df_features["recency"] > 90)
    df_features["is_churned"] = df_features["is_churned"].astype(int)
    
    # Features for Churn model
    X_cols = [
        "age", "recency", "frequency", "monetary", 
        "support_count", "negative_support_count", "avg_resolution_time", "unresolved_count"
    ]
    
    # Add Categorical Features (One-Hot Encoded)
    df_encoded = pd.get_dummies(df_features[X_cols + ["gender", "subscription_tier", "location"]], columns=["gender", "subscription_tier", "location"], drop_first=True)
    
    # Convert all columns to float for model safety
    X = df_encoded.astype(float)
    y_churn = df_features["is_churned"]
    
    print("Training Churn Risk Model (RandomForest)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y_churn, test_size=0.2, random_state=42)
    
    churn_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    churn_model.fit(X_train, y_train)
    
    train_acc = churn_model.score(X_train, y_train)
    test_acc = churn_model.score(X_test, y_test)
    print(f"Churn Model - Train Accuracy: {train_acc:.4f}, Test Accuracy: {test_acc:.4f}")
    
    # Save Churn Model and feature columns
    joblib.dump(churn_model, "models/churn_model.pkl")
    joblib.dump(list(X.columns), "models/model_features.pkl")
    
    # Predict probabilities for all customers
    churn_probs = churn_model.predict_proba(X)[:, 1]
    df_features["churn_risk_score"] = churn_probs
    
    def get_churn_category(score):
        if score < 0.3:
            return "Low"
        elif score < 0.7:
            return "Medium"
        else:
            return "High"
            
    df_features["churn_risk_category"] = df_features["churn_risk_score"].apply(get_churn_category)
    
    # CLV Regression Model
    # Target: projected spending.
    # Active customers: historical + projected next 12 months (simulated: subscription value + average monthly spend rate * 12)
    # Churned customers: historical spend only.
    # Let's create a realistic "projected_clv" target
    prices = {"Free": 0, "Basic": 15, "Premium": 49, "Enterprise": 299}
    
    def calculate_projected_clv(row):
        hist_spend = row["monetary"]
        status = row["subscription_status"]
        tier = row["subscription_tier"]
        
        if status == "Cancelled":
            return hist_spend # no future spending expected
        else:
            monthly_price = prices.get(tier, 0)
            # Add-on projection: calculate historical average monthly addon spends
            days_active = max(1, (latest_date - row["signup_date"]).days)
            addons_only = max(0, hist_spend - (monthly_price * (days_active / 30.4)))
            avg_monthly_addon = addons_only / (days_active / 30.4)
            
            # project 12 months forward
            future_sub = monthly_price * 12
            future_addon = avg_monthly_addon * 12
            
            # Churn penalty: multiply future projections by (1 - churn_risk_score)
            retention_factor = 1.0 - row["churn_risk_score"]
            projected = hist_spend + (future_sub + future_addon) * retention_factor
            return projected

    df_features["historical_clv"] = df_features["monetary"]
    df_features["projected_target"] = df_features.apply(calculate_projected_clv, axis=1)
    
    print("Training CLV Regressor Model...")
    y_clv = df_features["projected_target"]
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clv, test_size=0.2, random_state=42)
    
    clv_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    clv_model.fit(X_train_c, y_train_c)
    
    clv_r2 = clv_model.score(X_test_c, y_test_c)
    print(f"CLV Regressor Model - Test R2 Score: {clv_r2:.4f}")
    
    joblib.dump(clv_model, "models/clv_model.pkl")
    
    # Predict projected CLV
    projected_clvs = clv_model.predict(X)
    df_features["projected_clv"] = projected_clvs
    
    # Save Churn & CLV Feature Importance for dashboard analytics
    importances = churn_model.feature_importances_
    feature_importance_dict = [{"feature": col, "importance": float(imp)} for col, imp in zip(X.columns, importances)]
    # sort by importance
    feature_importance_dict = sorted(feature_importance_dict, key=lambda x: x["importance"], reverse=True)[:10]
    
    db.analytics_metadata.update_one(
        {"type": "model_metadata"},
        {"$set": {
            "last_updated": datetime.now(),
            "churn_train_accuracy": float(train_acc),
            "churn_test_accuracy": float(test_acc),
            "clv_r2_score": float(clv_r2),
            "feature_importance": feature_importance_dict
        }},
        upsert=True
    )
    
    # Bulk Update Customer Documents
    print("Updating customer documents with analytics and model predictions...")
    bulk_updates = []
    for idx, row in df_features.iterrows():
        bulk_updates.append(UpdateOne(
            {"customer_id": row["customer_id"]},
            {"$set": {
                "rfm": {
                    "recency": int(row["recency"]),
                    "frequency": int(row["frequency"]),
                    "monetary": float(row["monetary"]),
                    "R": int(row["R"]),
                    "F": int(row["F"]),
                    "M": int(row["M"]),
                    "segment": row["segment"]
                },
                "churn_risk": {
                    "score": float(row["churn_risk_score"]),
                    "category": row["churn_risk_category"]
                },
                "historical_clv": float(row["historical_clv"]),
                "projected_clv": float(row["projected_clv"])
            }}
        ))
        
        # execute in batches
        if len(bulk_updates) >= 5000:
            db.customers.bulk_write(bulk_updates)
            bulk_updates = []
            
    if bulk_updates:
        db.customers.bulk_write(bulk_updates)
        
    print("Finished updating customer documents.")

    # 5. Cohort Analysis Generation
    print("Generating Cohort Analysis Matrices...")
    # Calculate Cohort Retention
    # Month of signup
    df_cust["signup_month"] = df_cust["signup_date"].dt.to_period("M")
    
    # Merge transactions with signup months
    df_tx_cohort = pd.merge(df_trans, df_cust[["customer_id", "signup_month"]], on="customer_id", how="inner")
    df_tx_cohort["tx_month"] = df_tx_cohort["timestamp"].dt.to_period("M")
    
    # Calculate period differences
    df_tx_cohort["cohort_index"] = (df_tx_cohort["tx_month"] - df_tx_cohort["signup_month"]).apply(lambda x: x.n)
    
    # Filter for valid cohorts (tx after signup date, index >= 0)
    df_tx_cohort = df_tx_cohort[df_tx_cohort["cohort_index"] >= 0]
    
    # Cohort Sizes
    cohort_sizes = df_cust.groupby("signup_month").size().reset_index(name="cohort_size")
    
    # Customer Cohort Retention Matrix (Count of active users)
    cohort_active = df_tx_cohort.groupby(["signup_month", "cohort_index"])["customer_id"].nunique().reset_index()
    cohort_active_pivot = cohort_active.pivot(index="signup_month", columns="cohort_index", values="customer_id").fillna(0)
    
    # Revenue Cohort Retention Matrix
    cohort_revenue = df_tx_cohort.groupby(["signup_month", "cohort_index"])["amount"].sum().reset_index()
    cohort_revenue_pivot = cohort_revenue.pivot(index="signup_month", columns="cohort_index", values="amount").fillna(0)
    
    # Convert indexes to strings for DB storage
    db.cohort_analytics.drop()
    
    cohorts_list = []
    # Limit to last 18 months for clean visualization
    recent_cohorts = cohort_sizes.sort_values("signup_month", ascending=False).head(18)["signup_month"].tolist()
    
    for cm in sorted(recent_cohorts):
        cm_str = str(cm)
        size = int(cohort_sizes[cohort_sizes["signup_month"] == cm]["cohort_size"].values[0])
        
        retention_row = cohort_active_pivot.loc[cm] if cm in cohort_active_pivot.index else pd.Series()
        revenue_row = cohort_revenue_pivot.loc[cm] if cm in cohort_revenue_pivot.index else pd.Series()
        
        retention_data = {}
        revenue_data = {}
        
        # limit index to 12 months for readable heatmap
        for col_idx in range(12):
            active_count = int(retention_row.get(col_idx, 0)) if col_idx in retention_row else 0
            revenue_sum = float(revenue_row.get(col_idx, 0.0)) if col_idx in revenue_row else 0.0
            
            # cap count at cohort size
            active_count = min(size, active_count)
            # For index 0, make sure it is near 100%
            if col_idx == 0:
                active_count = size
                
            ret_pct = float(active_count / size) if size > 0 else 0.0
            
            retention_data[str(col_idx)] = {
                "active_count": active_count,
                "percentage": ret_pct
            }
            
            # Revenue index 0 acts as base
            base_rev = float(revenue_row.get(0, 1.0)) if 0 in revenue_row else 1.0
            if base_rev == 0:
                base_rev = 1.0
            rev_pct = float(revenue_sum / base_rev)
            
            revenue_data[str(col_idx)] = {
                "amount": revenue_sum,
                "percentage": rev_pct
            }
            
        cohorts_list.append({
            "cohort_month": cm_str,
            "cohort_size": size,
            "retention": retention_data,
            "revenue_retention": revenue_data
        })
        
    if cohorts_list:
        db.cohort_analytics.insert_many(cohorts_list)
    print("Cohort Analysis Matrices generated and saved.")
    
    print("\n--- Analytics & Model Training Complete ---")

if __name__ == "__main__":
    train_and_update()
