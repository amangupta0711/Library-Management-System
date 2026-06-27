import os
from dotenv import load_dotenv

# Load variables from a .env file if it exists
load_dotenv()

class Config:
    # Use environment variables if set, otherwise default config
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-jwt-library-management-system-secret-key-1234'
    
    # SQLite Database URI configuration
    # Points to instance/library.db inside backend directory
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'library.db')
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Registration secret code to grant administrator privileges
    ADMIN_CODE = os.environ.get('ADMIN_CODE') or 'ADMIN123'
