import random
from datetime import datetime, timedelta
import pymongo
from pymongo import MongoClient
import sys

# MongoDB Connection
MONGO_URI = "mongodb://127.0.0.1:27017/"
DB_NAME = "customer360"

def generate_demographics():
    cities = [
        "New York", "San Francisco", "London", "Tokyo", "Berlin", 
        "Toronto", "Sydney", "Bangalore", "Mumbai", "Chicago"
    ]
    genders = ["Male", "Female", "Non-binary"]
    # Probabilities
    gender_weights = [0.48, 0.48, 0.04]
    city_weights = [0.20, 0.15, 0.12, 0.10, 0.08, 0.08, 0.07, 0.10, 0.06, 0.04]
    
    return {
        "gender": random.choices(genders, weights=gender_weights)[0],
        "location": random.choices(cities, weights=city_weights)[0],
        "age": int(random.normalvariate(37, 11) // 1 + 18)
    }

def main():
    print("Connecting to MongoDB at 127.0.0.1:27017...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.server_info() # force connection check
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        print("Please ensure MongoDB is running on 127.0.0.1:27017.")
        sys.exit(1)
        
    db = client[DB_NAME]
    
    # Drop existing collections if any
    print("Dropping existing collections...")
    db.customers.drop()
    db.transactions.drop()
    db.support_interactions.drop()
    
    # Setup Indexes
    print("Creating indexes...")
    db.customers.create_index("customer_id", unique=True)
    db.transactions.create_index("transaction_id", unique=True)
    db.transactions.create_index("customer_id")
    db.support_interactions.create_index("interaction_id", unique=True)
    db.support_interactions.create_index("customer_id")

    # Parameters
    NUM_CUSTOMERS = 51000  # Ensure 50,000+
    
    names_male = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Amit", "Rajesh", "Vijay", "Ken", "Hans"]
    names_female = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Priya", "Anjali", "Sita", "Yoko", "Emma"]
    surnames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Sharma", "Karan", "Patel", "Sato", "Müller"]
    
    tiers = ["Free", "Basic", "Premium", "Enterprise"]
    tier_weights = [0.35, 0.40, 0.20, 0.05]
    
    # Pre-calculated subscription prices
    prices = {"Free": 0, "Basic": 15, "Premium": 49, "Enterprise": 299}
    
    start_date = datetime.now() - timedelta(days=365 * 3) # 3 years ago
    
    print(f"Generating {NUM_CUSTOMERS} customers...")
    
    customers = []
    transactions = []
    support_interactions = []
    
    customer_batch = []
    transaction_batch = []
    support_batch = []
    
    inserted_customers_count = 0
    inserted_transactions_count = 0
    inserted_support_count = 0
    
    for i in range(1, NUM_CUSTOMERS + 1):
        cust_id = f"CUST_{i:06d}"
        demo = generate_demographics()
        
        # Determine name based on gender
        if demo["gender"] == "Male":
            name = f"{random.choice(names_male)} {random.choice(surnames)}"
        elif demo["gender"] == "Female":
            name = f"{random.choice(names_female)} {random.choice(surnames)}"
        else:
            name = f"{random.choice(names_male + names_female)} {random.choice(surnames)}"
            
        email = f"{name.lower().replace(' ', '.')}@example.com"
        
        # Signup Date
        signup_days_ago = random.randint(30, 365 * 3)
        signup_date = datetime.now() - timedelta(days=signup_days_ago)
        
        tier = random.choices(tiers, weights=tier_weights)[0]
        
        # Determine Status & Churn behavior
        # Let's make cancellation correlated with:
        # - Lower tier (Free/Basic churn more than Premium/Enterprise)
        # - Support interactions (more negative support tickets = higher chance of cancellation)
        # We will determine the status (Active, Cancelled, Paused)
        status_choices = ["Active", "Cancelled", "Paused"]
        
        # Base churn probabilities
        if tier == "Free":
            status_weights = [0.60, 0.35, 0.05]
        elif tier == "Basic":
            status_weights = [0.75, 0.20, 0.05]
        elif tier == "Premium":
            status_weights = [0.88, 0.10, 0.02]
        else: # Enterprise
            status_weights = [0.95, 0.04, 0.01]
            
        status = random.choices(status_choices, weights=status_weights)[0]
        
        # If cancelled, calculate cancellation date
        cancellation_date = None
        if status == "Cancelled":
            active_days = random.randint(15, signup_days_ago - 5)
            cancellation_date = signup_date + timedelta(days=active_days)
            
        # Support interactions generation
        # Determine number of support interactions. Active loyal customers have few. Churned/Cancelled have more, especially negative.
        if status == "Cancelled":
            num_support = random.choices([0, 1, 2, 3, 4, 5, 6, 7, 8], weights=[0.05, 0.10, 0.15, 0.20, 0.20, 0.15, 0.10, 0.03, 0.02])[0]
        else:
            num_support = random.choices([0, 1, 2, 3, 4], weights=[0.50, 0.30, 0.12, 0.06, 0.02])[0]
            
        # Generate transactions based on signup, tier, and status
        # 1. Subscription charges: monthly
        end_payment_date = cancellation_date if cancellation_date else datetime.now()
        current_payment_date = signup_date
        
        sub_price = prices[tier]
        trans_seq = 1
        
        while current_payment_date < end_payment_date:
            if sub_price > 0:
                t_id = f"TX_{i:06d}_{trans_seq:02d}"
                transaction_batch.append({
                    "transaction_id": t_id,
                    "customer_id": cust_id,
                    "amount": float(sub_price),
                    "timestamp": current_payment_date,
                    "category": "SaaS Subscription",
                    "payment_method": random.choice(["Credit Card", "PayPal", "Bank Transfer"])
                })
                trans_seq += 1
            # increment month
            # simple approximation of 30 days month
            current_payment_date += timedelta(days=30.4)
            
        # 2. Add some one-off purchases (e.g. addons, extra seats, marketplace)
        # Number of purchases depends on subscription tier and status
        if tier == "Enterprise":
            num_purchases = random.randint(5, 20)
            purchase_amounts = [50.0, 100.0, 150.0, 250.0, 500.0]
        elif tier == "Premium":
            num_purchases = random.randint(2, 12)
            purchase_amounts = [20.0, 50.0, 75.0, 100.0, 150.0]
        elif tier == "Basic":
            num_purchases = random.randint(1, 6)
            purchase_amounts = [10.0, 25.0, 40.0, 50.0, 75.0]
        else: # Free
            num_purchases = random.choices([0, 1, 2, 3], weights=[0.60, 0.25, 0.10, 0.05])[0]
            purchase_amounts = [5.0, 10.0, 15.0, 20.0]
            
        categories = ["Electronics Upgrade", "Enterprise Add-on", "Priority Support Fee", "Training Session", "Marketplace Item"]
        cat_weights = [0.15, 0.10, 0.25, 0.20, 0.30]
        
        for _ in range(num_purchases):
            p_days_ago = random.randint(0, signup_days_ago)
            p_date = datetime.now() - timedelta(days=p_days_ago)
            # Make sure it's after signup, and if cancelled, before cancellation (or shortly after for support/refund issues)
            if cancellation_date and p_date > cancellation_date:
                # if after cancellation, skip or make it support fee/refund
                if random.random() > 0.8:
                    p_date = cancellation_date - timedelta(days=random.randint(1, 15))
                else:
                    continue
            
            t_id = f"TX_{i:06d}_{trans_seq:02d}"
            transaction_batch.append({
                "transaction_id": t_id,
                "customer_id": cust_id,
                "amount": float(random.choice(purchase_amounts) * (1.0 + random.uniform(-0.1, 0.1))),
                "timestamp": p_date,
                "category": random.choices(categories, weights=cat_weights)[0],
                "payment_method": random.choice(["Credit Card", "PayPal", "UPI", "Bank Transfer"])
            })
            trans_seq += 1
            
        # Generate support tickets
        support_categories = ["Billing", "Technical", "Account Access", "Feature Request"]
        support_sentiments = ["Positive", "Neutral", "Negative"]
        
        for ticket_seq in range(1, num_support + 1):
            s_days_ago = random.randint(0, signup_days_ago)
            s_date = datetime.now() - timedelta(days=s_days_ago)
            # Align with cancellation date if any
            if cancellation_date and s_date > cancellation_date + timedelta(days=7):
                continue
                
            # If customer cancelled, higher chance of Negative sentiment
            if status == "Cancelled" and ticket_seq >= num_support - 1:
                sentiment = "Negative"
            else:
                sentiment = random.choices(support_sentiments, weights=[0.30, 0.45, 0.25])[0]
                
            # Resolution time details: billing/account resolved faster, tech slower
            s_cat = random.choice(support_categories)
            if s_cat in ["Billing", "Account Access"]:
                res_time = random.randint(10, 120) # 10m to 2h
            else:
                res_time = random.randint(60, 2880) # 1h to 48h
                
            # Enterprise has faster resolution times
            if tier == "Enterprise":
                res_time = max(10, int(res_time * 0.2))
            elif tier == "Premium":
                res_time = max(10, int(res_time * 0.6))
                
            resolved = random.choices([True, False], weights=[0.92, 0.08] if sentiment != "Negative" else [0.70, 0.30])[0]
            
            s_id = f"SUP_{i:06d}_{ticket_seq:02d}"
            support_batch.append({
                "interaction_id": s_id,
                "customer_id": cust_id,
                "timestamp": s_date,
                "category": s_cat,
                "sentiment": sentiment,
                "resolution_time_minutes": res_time,
                "resolved": resolved
            })
            
        # Customer Document
        customer_batch.append({
            "customer_id": cust_id,
            "name": name,
            "email": email,
            "gender": demo["gender"],
            "location": demo["location"],
            "age": demo["age"],
            "signup_date": signup_date,
            "subscription_tier": tier,
            "subscription_status": status,
            "cancellation_date": cancellation_date,
            # Placeholders to be computed by the ML/analytics pipeline script
            "rfm": None,
            "churn_risk": {
                "score": 0.0,
                "category": "Low"
            },
            "projected_clv": 0.0,
            "historical_clv": 0.0
        })
        
        # Write in batches to save memory
        if len(customer_batch) >= 5000:
            db.customers.insert_many(customer_batch)
            inserted_customers_count += len(customer_batch)
            customer_batch = []
            
        if len(transaction_batch) >= 10000:
            db.transactions.insert_many(transaction_batch)
            inserted_transactions_count += len(transaction_batch)
            transaction_batch = []
            
        if len(support_batch) >= 10000:
            db.support_interactions.insert_many(support_batch)
            inserted_support_count += len(support_batch)
            support_batch = []
            
        if i % 10000 == 0:
            print(f"Generated {i} customer profiles...")

    # Write remaining
    if customer_batch:
        db.customers.insert_many(customer_batch)
        inserted_customers_count += len(customer_batch)
    if transaction_batch:
        db.transactions.insert_many(transaction_batch)
        inserted_transactions_count += len(transaction_batch)
    if support_batch:
        db.support_interactions.insert_many(support_batch)
        inserted_support_count += len(support_batch)
        
    print("\n--- Seeding Complete ---")
    print(f"Total customers inserted: {inserted_customers_count}")
    print(f"Total transactions inserted: {inserted_transactions_count}")
    print(f"Total support interactions inserted: {inserted_support_count}")
    
    # Assertions to verify requirements are met
    assert inserted_customers_count >= 50000, "Should have 50,000+ customers!"
    assert inserted_transactions_count >= 500000, f"Should have 500,000+ transactions! Got {inserted_transactions_count}"
    print("Database seeding verification checks passed successfully!")

if __name__ == "__main__":
    main()
