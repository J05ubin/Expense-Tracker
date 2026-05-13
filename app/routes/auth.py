from flask import Blueprint, request, jsonify, session
import bcrypt
import re
from app.db import users_collection

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    # Validate email format
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        return jsonify({"error": "Invalid email format"}), 400

    # Check if user exists
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User with this email already exists"}), 409

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    new_user = {
        "name": name,
        "email": email,
        "password": hashed_password
    }

    users_collection.insert_one(new_user)
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    # Validate email format
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        return jsonify({"error": "Invalid email format"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if bcrypt.checkpw(password.encode('utf-8'), user['password']):
        session['user_id'] = str(user['_id'])
        session['user_name'] = user['name']
        return jsonify({"message": "Login successful", "user": {"name": user['name'], "email": user['email']}}), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route('/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"name": session.get('user_name')}), 200
