import sys
import traceback

try:
    # Write initial progress
    with open(r"c:\Users\sachi\OneDrive\Desktop\Library management system\backend\debug_out.txt", "w") as f:
        f.write("Starting import...\n")
        
    from app import create_app, db
    
    with open(r"c:\Users\sachi\OneDrive\Desktop\Library management system\backend\debug_out.txt", "a") as f:
        f.write("Import successful. Creating app...\n")
        
    app = create_app()
    
    with open(r"c:\Users\sachi\OneDrive\Desktop\Library management system\backend\debug_out.txt", "a") as f:
        f.write("App created successfully. Initializing DB...\n")
        
    with app.app_context():
        db.create_all()
        
    with open(r"c:\Users\sachi\OneDrive\Desktop\Library management system\backend\debug_out.txt", "a") as f:
        f.write("DB initialized successfully. Starting server...\n")
        
    # We will try to start the app in a way that doesn't block or run it for a short time to test
    # Actually, let's run it!
    app.run(host='127.0.0.1', port=5000, debug=False) # run without debug to avoid reloader threads
    
except Exception as e:
    tb = traceback.format_exc()
    with open(r"c:\Users\sachi\OneDrive\Desktop\Library management system\backend\debug_out.txt", "a") as f:
        f.write(f"CRASHED:\n{tb}\n")
