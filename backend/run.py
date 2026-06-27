import os
from app import create_app, db

app = create_app()

if __name__ == '__main__':
    # Ensure database tables are created on startup
    with app.app_context():
        db.create_all()
    
    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)
