import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from app.config import Config

# Initialize SQLAlchemy extension
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure the instance folder exists (where SQLite DB is stored)
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS to allow requests from the React development frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints (routes)
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
