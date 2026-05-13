# Expense Tracker 💰

A professional, full-stack web application designed to help users manage their personal finances. Built with a monolithic, server-side rendered architecture using Flask and MongoDB.

## Features
- **User Authentication:** Secure sign-up and login using bcrypt password hashing.
- **Interactive Dashboard:** Beautiful Chart.js visualizations (Pie charts for categories, Bar charts for monthly expenses, Line charts for savings trends).
- **CRUD Operations:** Easily add, edit, and delete income and expense transactions.
- **Budget Alerts:** Custom logic to warn users when their monthly expenses exceed their budget.
- **Data Export:** Instantly export all your transaction history to a CSV spreadsheet.
- **Premium UI:** Modern "glassmorphism" aesthetic with full Dark Mode and Light Mode support.

## Tech Stack
- **Backend:** Python, Flask, PyMongo
- **Database:** MongoDB
- **Frontend:** HTML5, Vanilla CSS (Custom Glassmorphism Design), Vanilla JavaScript
- **Data Visualization:** Chart.js

## Project Structure
This application follows the professional **Application Factory** pattern with **Flask Blueprints**:
```text
EXPENSE TRACKER/
├── app/                      
│   ├── __init__.py           # Application factory & MongoDB setup
│   ├── routes/               
│   │   ├── views.py          # HTML page routing
│   │   ├── auth.py           # Authentication APIs
│   │   └── transactions.py   # Transactions CRUD & Analytics APIs
│   ├── static/               # CSS and JS files
│   └── templates/            # HTML templates
├── config.py                 # Configuration variables
├── run.py                    # Entry point
└── requirements.txt          # Python dependencies
```

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Expense-Tracker.git
   cd Expense-Tracker
   ```

2. **Install dependencies:**
   Make sure you have Python installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up MongoDB:**
   Ensure you have MongoDB running locally on `mongodb://localhost:27017`.

4. **Environment Variables:**
   Create a `.env` file in the root directory with the following:
   ```env
   SECRET_KEY=your-super-secret-key
   MONGO_URI=mongodb://localhost:27017/expense_tracker
   ```

5. **Start the application:**
   ```bash
   python run.py
   ```
   The app will be running at `http://127.0.0.1:5000/`
