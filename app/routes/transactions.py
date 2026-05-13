from flask import Blueprint, request, jsonify, session, send_file
from bson.objectid import ObjectId
import io
import csv
from datetime import datetime
from app.db import transactions_collection

transactions_bp = Blueprint('transactions', __name__)

def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    if doc and 'user_id' in doc:
        doc['user_id'] = str(doc['user_id'])
    return doc

@transactions_bp.route('/transactions', methods=['GET'])
def get_transactions():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    
    # Optional filters
    month = request.args.get('month') # Format YYYY-MM
    category = request.args.get('category')
    tx_type = request.args.get('type')

    query = {"user_id": user_id}

    if month:
        query["date"] = {"$regex": f"^{month}"}
    if category:
        query["category"] = category
    if tx_type:
        query["type"] = tx_type

    # Sort by date descending
    transactions = list(transactions_collection.find(query).sort("date", -1))
    return jsonify([serialize_doc(tx) for tx in transactions]), 200

@transactions_bp.route('/transactions', methods=['POST'])
def add_transaction():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    amount = data.get('amount')
    category = data.get('category')
    tx_type = data.get('type') # 'income' or 'expense'
    date = data.get('date') # YYYY-MM-DD
    notes = data.get('notes', '')

    if not all([amount, category, tx_type, date]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        amount = float(amount)
    except ValueError:
        return jsonify({"error": "Amount must be a number"}), 400

    transaction = {
        "user_id": session['user_id'],
        "amount": amount,
        "category": category,
        "type": tx_type,
        "date": date,
        "notes": notes,
        "created_at": datetime.now().isoformat()
    }

    result = transactions_collection.insert_one(transaction)
    transaction['_id'] = result.inserted_id
    
    return jsonify({"message": "Transaction added", "transaction": serialize_doc(transaction)}), 201

@transactions_bp.route('/transactions/<tx_id>', methods=['PUT'])
def update_transaction(tx_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    update_fields = {}
    
    if 'amount' in data:
        try:
            update_fields['amount'] = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
    if 'category' in data: update_fields['category'] = data['category']
    if 'type' in data: update_fields['type'] = data['type']
    if 'date' in data: update_fields['date'] = data['date']
    if 'notes' in data: update_fields['notes'] = data['notes']

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    result = transactions_collection.update_one(
        {"_id": ObjectId(tx_id), "user_id": session['user_id']},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Transaction not found or unauthorized"}), 404

    return jsonify({"message": "Transaction updated successfully"}), 200

@transactions_bp.route('/transactions/<tx_id>', methods=['DELETE'])
def delete_transaction(tx_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    result = transactions_collection.delete_one({"_id": ObjectId(tx_id), "user_id": session['user_id']})

    if result.deleted_count == 0:
        return jsonify({"error": "Transaction not found or unauthorized"}), 404

    return jsonify({"message": "Transaction deleted successfully"}), 200

@transactions_bp.route('/summary', methods=['GET'])
def get_summary():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    month = request.args.get('month')

    query = {"user_id": user_id}
    if month:
        query["date"] = {"$regex": f"^{month}"}

    transactions = list(transactions_collection.find(query))

    total_income = 0
    total_expense = 0
    category_expenses = {}
    monthly_expenses = {} # For bar chart: { "YYYY-MM": amount }
    monthly_savings = {} # For line chart: { "YYYY-MM": income - expense }

    for tx in transactions:
        amt = float(tx['amount'])
        tx_month = tx['date'][:7] # YYYY-MM
        
        if tx['type'] == 'income':
            total_income += amt
            # Savings calc
            monthly_savings[tx_month] = monthly_savings.get(tx_month, 0) + amt
        elif tx['type'] == 'expense':
            total_expense += amt
            cat = tx['category']
            category_expenses[cat] = category_expenses.get(cat, 0) + amt
            monthly_expenses[tx_month] = monthly_expenses.get(tx_month, 0) + amt
            # Savings calc
            monthly_savings[tx_month] = monthly_savings.get(tx_month, 0) - amt

    balance = total_income - total_expense

    return jsonify({
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "category_expenses": category_expenses,
        "monthly_expenses": monthly_expenses,
        "monthly_savings": monthly_savings
    }), 200

@transactions_bp.route('/export', methods=['GET'])
def export_csv():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    transactions = list(transactions_collection.find({"user_id": user_id}).sort("date", -1))

    if not transactions:
        return jsonify({"error": "No transactions to export"}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    cols = ['date', 'type', 'category', 'amount', 'notes']
    writer.writerow(cols)
    
    # Write data
    for tx in transactions:
        writer.writerow([
            tx.get('date', ''),
            tx.get('type', ''),
            tx.get('category', ''),
            tx.get('amount', ''),
            tx.get('notes', '')
        ])

    output.seek(0)

    # Return as file
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"transactions_{datetime.now().strftime('%Y%m%d')}.csv"
    )
