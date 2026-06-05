# Customer360 – Customer Analytics & Retention Intelligence Platform

Customer360 is an enterprise-grade customer analytics platform designed to analyze customer behavior, track cohort retention, calculate customer lifetime value (CLV), and predict churn risk using machine learning. The project replicates metrics dashboards used by major consumer platforms like Netflix, Amazon, and Swiggy.

---

## 🚀 Key Features

* **Overview Dashboard**: High-level KPIs including active account counts, annualized churn rate, customer retention percentage, ARPU, and average projected CLV alongside monthly revenue trends.
* **Customer Segmentation**: Automatic RFM Analysis (Recency, Frequency, Monetary value) classifying users into Champion, Loyal, New, At-Risk, and Hibernating segments.
* **Cohort Analysis Heatmap**: Interactive cohort matrix toggling between user retention count percentages and Net Revenue Retention (NRR) highlighting expansion revenue.
* **Journey Lifecycle Analytics**: Lifecycle funnel visualization mapping stages from Acquisition (Signup) → Activation (1st Purchase) → Repeat purchases → Retention (Loyal) → Churn.
* **Churn Risk Predictor**: Machine learning classification assigning churn probabilities to all customers. Includes Scikit-Learn feature importance rankings.
* **CLV Analytics**: Lifetime value projections comparing actual spends against future valuations using a Scikit-Learn regressor, alongside segment profitability margin analysis.
* **Campaign Recommendation Engine**: Dynamic retention Win-Backs, upgrades, and addon cross-sell campaigns with simulated triggers showing targeted segment sizes and lift rates.
* **Customer 360 Card Drawer**: Detailed side-panel overlays showing user demographics, invoice histories, support tickets, and chronological timeline logs.

---

## 🛠️ Tech Stack

* **Frontend**: React, TypeScript, Tailwind CSS (v4), Recharts, Axios, Lucide Icons.
* **Backend**: Flask, PyMongo, Flask-CORS.
* **Database**: MongoDB (Local Instance).
* **Analytics & Machine Learning**: Python, Pandas, NumPy, Scikit-Learn, Joblib.

---

## ⚙️ Architecture

The platform uses a **hybrid batch/real-time analytics pattern** for sub-second page loads:
1. **Raw Database**: Customer profiles, transactions, and support interactions are stored across indexed collections in MongoDB.
2. **Offline Pipeline (`train_models.py`)**: A Python Pandas script aggregates data in bulk, calculates RFM scores, trains a `RandomForestClassifier` (for churn risk) and a `RandomForestRegressor` (for projected CLV), and writes results directly back to the database.
3. **REST API (`app.py`)**: A Flask application serves these pre-computed metrics and supports paginated listings. Retraining can be dispatched in a background thread using the `/api/analytics/recalculate` endpoint.

---

## 📦 Getting Started & Installation

Ensure you have **Python 3.12+**, **Node v22+**, and **MongoDB** installed and running on your local machine.

### 1. Database Seeding & Model Training

Navigate to the `backend/` directory, set up a virtual environment, install requirements, and seed/train:

```powershell
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the database seeder (generates 51,000 customers & 750,000+ transactions)
python seed_db.py

# Run the analytics pipeline (computes RFM & trains ML models)
python train_models.py
```

### 2. Launch the Flask API Backend

From the `backend/` directory with the virtual environment active:

```powershell
python app.py
```
*API will run on `http://127.0.0.1:5000`.*

### 3. Launch the React Frontend Dashboard

Open a new terminal, navigate to the `frontend/` directory, install packages, and start the Vite dev server:

```powershell
cd frontend
npm install
npm run dev
```
*Access the dashboard at [http://localhost:5173/](http://localhost:5173/).*

---

## 🧠 Machine Learning Model Results

* **Churn Prediction (Random Forest Classifier)**: **99.36% Test Accuracy** (Predicts cancellation likelihood using support interaction sentiment counts, recency, and purchase velocities).
* **CLV Valuation (Random Forest Regressor)**: **0.9330 R² validation score** (Estimates customer contract expansions over the next 12 months).
