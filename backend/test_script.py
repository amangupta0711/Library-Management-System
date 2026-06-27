import sys
import os

try:
    from app import create_app, db
    
    app = create_app()
    with app.app_context():
        # This will create database tables in instance/library.db
        db.create_all()
        
    output_path = r"C:\Users\sachi\OneDrive\Desktop\Library management system\backend\out.txt"
    with open(output_path, "w") as f:
        f.write("SUCCESS: App context loaded and database initialized successfully.\n")
        f.write(f"Database path: {app.config['SQLALCHEMY_DATABASE_URI']}\n")
except Exception as e:
    import traceback
    output_path = r"C:\Users\sachi\OneDrive\Desktop\Library management system\backend\out.txt"
    with open(output_path, "w") as f:
        f.write(f"ERROR: {str(e)}\n")
        f.write(traceback.format_exc())
