from pymongo import MongoClient
from config import Config

# Initialize MongoDB connection globally
try:
    client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_database()
    users_collection = db.users
    transactions_collection = db.transactions
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
