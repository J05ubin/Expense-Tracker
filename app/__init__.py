from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Register Blueprints
    from app.routes.views import views_bp
    from app.routes.auth import auth_bp
    from app.routes.transactions import transactions_bp

    app.register_blueprint(views_bp)
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(transactions_bp, url_prefix='/api')

    return app
