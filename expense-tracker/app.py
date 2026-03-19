from flask import Flask, request, jsonify, render_template, session, redirect, url_for, Response
from flask_pymongo import PyMongo
from bson import ObjectId
from bson.errors import InvalidId
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import csv, io
import os

app = Flask(__name__)
app.secret_key = "change-this-in-production-abc123"

# ── MongoDB ─────────────────────────────────────────────────────────────────
# Local  : mongodb://localhost:27017/expensedb
# Atlas  : mongodb+srv://<user>:<pass>@cluster.mongodb.net/expensedb
app.config["MONGO_URI"] = os.environ.get("MONGO_URI")

mongo        = PyMongo(app)
users_col    = mongo.db.users
expenses_col = mongo.db.expenses


# ── Helpers ──────────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Login required."}), 401
        return f(*args, **kwargs)
    return decorated

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc


# ── Pages ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if "user_id" in session:
        return render_template("dashboard.html")
    return render_template("auth.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


# ── Auth API ─────────────────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    d = request.get_json()
    name, email, password = d.get("name","").strip(), d.get("email","").strip().lower(), d.get("password","")
    if not name or not email or not password:
        return jsonify({"error": "All fields required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if users_col.find_one({"email": email}):
        return jsonify({"error": "Email already registered."}), 409
    uid = users_col.insert_one({"name": name, "email": email, "password": generate_password_hash(password), "created": datetime.utcnow()}).inserted_id
    session["user_id"] = str(uid)
    session["user_name"] = name
    return jsonify({"message": "Registered!", "name": name}), 201

@app.route("/api/login", methods=["POST"])
def login():
    d = request.get_json()
    email, pwd = d.get("email","").strip().lower(), d.get("password","")
    user = users_col.find_one({"email": email})
    if not user or not check_password_hash(user["password"], pwd):
        return jsonify({"error": "Invalid email or password."}), 401
    session["user_id"] = str(user["_id"])
    session["user_name"] = user["name"]
    return jsonify({"message": "Login successful.", "name": user["name"]}), 200

@app.route("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False}), 200
    return jsonify({"logged_in": True, "name": session.get("user_name")}), 200


# ── Expense API ───────────────────────────────────────────────────────────────
@app.route("/api/expenses", methods=["POST"])
@login_required
def add_expense():
    d = request.get_json()
    title, amount, category = d.get("title","").strip(), d.get("amount"), d.get("category","").strip()
    type_ = d.get("type","expense")
    if not title or not amount or not category:
        return jsonify({"error": "Title, amount and category are required."}), 400
    try:
        amount = float(amount)
        assert amount > 0
    except:
        return jsonify({"error": "Amount must be a positive number."}), 400
    try:
        date_obj = datetime.strptime(d.get("date",""), "%Y-%m-%d")
    except:
        date_obj = datetime.utcnow()
    doc = {"user_id": session["user_id"], "title": title, "amount": amount,
           "category": category, "type": type_, "date": date_obj,
           "note": d.get("note","").strip(), "created": datetime.utcnow()}
    result = expenses_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["date"] = date_obj.strftime("%Y-%m-%d")
    doc.pop("created", None)
    return jsonify({"message": "Added.", "expense": doc}), 201

@app.route("/api/expenses", methods=["GET"])
@login_required
def get_expenses():
    q = {"user_id": session["user_id"]}
    if request.args.get("category"): q["category"] = request.args["category"]
    if request.args.get("type"):     q["type"]     = request.args["type"]
    if request.args.get("search"):   q["title"]    = {"$regex": request.args["search"], "$options": "i"}
    month = request.args.get("month","")
    if month:
        try:
            s = datetime.strptime(month, "%Y-%m")
            e = (s + timedelta(days=32)).replace(day=1)
            q["date"] = {"$gte": s, "$lt": e}
        except: pass
    docs = list(expenses_col.find(q).sort("date", -1))
    out = []
    for d in docs:
        d["_id"]  = str(d["_id"])
        d["date"] = d["date"].strftime("%Y-%m-%d")
        d.pop("created", None)
        out.append(d)
    return jsonify(out), 200

@app.route("/api/expenses/<eid>", methods=["PUT"])
@login_required
def update_expense(eid):
    try: oid = ObjectId(eid)
    except: return jsonify({"error": "Invalid ID."}), 400
    doc = expenses_col.find_one({"_id": oid, "user_id": session["user_id"]})
    if not doc: return jsonify({"error": "Not found."}), 404
    d = request.get_json()
    title, amount, category = d.get("title","").strip(), d.get("amount"), d.get("category","").strip()
    if not title or not amount or not category:
        return jsonify({"error": "Title, amount and category are required."}), 400
    try:
        amount = float(amount); assert amount > 0
    except: return jsonify({"error": "Amount must be positive."}), 400
    try: date_obj = datetime.strptime(d.get("date",""), "%Y-%m-%d")
    except: date_obj = doc["date"]
    expenses_col.update_one({"_id": oid}, {"$set": {
        "title": title, "amount": amount, "category": category,
        "type": d.get("type", doc["type"]), "date": date_obj,
        "note": d.get("note","").strip()
    }})
    return jsonify({"message": "Updated."}), 200

@app.route("/api/expenses/<eid>", methods=["DELETE"])
@login_required
def delete_expense(eid):
    try: oid = ObjectId(eid)
    except: return jsonify({"error": "Invalid ID."}), 400
    r = expenses_col.delete_one({"_id": oid, "user_id": session["user_id"]})
    if r.deleted_count == 0: return jsonify({"error": "Not found."}), 404
    return jsonify({"message": "Deleted."}), 200

@app.route("/api/summary")
@login_required
def summary():
    month = request.args.get("month", datetime.utcnow().strftime("%Y-%m"))
    try:
        start = datetime.strptime(month, "%Y-%m")
        end   = (start + timedelta(days=32)).replace(day=1)
    except: return jsonify({"error": "Invalid month."}), 400
    pipeline = [
        {"$match": {"user_id": session["user_id"], "date": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": {"type": "$type", "category": "$category"}, "total": {"$sum": "$amount"}}}
    ]
    raw = list(expenses_col.aggregate(pipeline))
    income, expense, by_cat = 0, 0, {}
    for r in raw:
        t, cat, amt = r["_id"]["type"], r["_id"]["category"], r["total"]
        if t == "income": income += amt
        else: expense += amt; by_cat[cat] = round(by_cat.get(cat, 0) + amt, 2)
    return jsonify({"total_income": round(income,2), "total_expense": round(expense,2),
                    "balance": round(income-expense,2), "by_category": by_cat}), 200

@app.route("/api/export")
@login_required
def export_csv():
    docs = list(expenses_col.find({"user_id": session["user_id"]}).sort("date", -1))
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Date","Title","Category","Type","Amount (₹)","Note"])
    for d in docs:
        w.writerow([d["date"].strftime("%Y-%m-%d"), d["title"], d["category"],
                    d["type"], d["amount"], d.get("note","")])
    return Response(out.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=expenses.csv"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
