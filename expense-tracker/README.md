# 💰 ExpenseIQ — Full-Stack Expense Tracker
> Flask + MongoDB + HTML/CSS/JS + Chart.js

## Setup

```bash
cd expense-tracker
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate      # Mac/Linux
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

Update MongoDB URI in app.py:
- Local:  mongodb://localhost:27017/expensedb
- Atlas:  mongodb+srv://<user>:<pass>@cluster.mongodb.net/expensedb

## Features
- User Register / Login / Logout
- Add Income & Expense transactions
- Monthly filter, live search, category filter
- Doughnut chart (expense by category)
- Edit & Delete transactions
- Export all data to CSV

## Tech Stack
Frontend: HTML, CSS, JavaScript, Chart.js
Backend:  Python + Flask
Database: MongoDB (Flask-PyMongo)
Auth:     Werkzeug password hashing + Flask sessions

## CV Line
"Built a full-stack Expense Tracker using Flask REST API, MongoDB, and vanilla JS — features include user authentication, Chart.js analytics dashboard, monthly filtering, and CSV export."
