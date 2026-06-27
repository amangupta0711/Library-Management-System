# AthenaLibrary — Modern Library Management System

AthenaLibrary is a premium, responsive Library Management System built with a decoupled architecture. It features a modern Single-Page Application (SPA) React frontend and a lightweight Flask REST API backend, backed by a persistent SQLite database.

---

## 🚀 Key Features

### 🔐 Security & Access Control
* **JWT Authentication**: Secure stateless session control via JSON Web Tokens.
* **Role-Based Authorization (RBAC)**: Distinct layouts, tabs, views, and capabilities for **Administrators** and **Student Members**.
* **Password Hashing**: Secure encryption via PBKDF2 hashing algorithms.
* **API Access Guard**: Flask `@token_required` and `@admin_required` custom decorators defending private CRUD endpoints.

### 📚 Administrator Features
* **Inventory Control Dashboard**: Real-time summary metrics reporting total book counts, registered students, active loans, and overdue counts.
* **Book Record CRUD**: Complete create, read, update, and delete screens.
* **Lending Log Audit**: Unified ledger displaying loan details mapping books, borrowers, issue dates, and return statuses.
* **Validation Shields**: ISBN duplication checks, copy inventory integrity validations, and borrow state guards.

### 🎓 Student (Member) Features
* **Interactive Catalog**: Search by title, author, or ISBN, and filter dynamically by category.
* **Self-Checkout System**: One-click book borrowing directly from the catalog.
* **My Borrowings Panel**: View active issues, due dates, and return books instantly.
* **Return History**: Scrollable ledger logging past returned textbooks.

---

## 🛠️ Tech Stack

* **Frontend**: React.js (Vite) + Tailwind CSS + Lucide Icons
* **Backend**: Flask + Flask-SQLAlchemy + Flask-Cors + PyJWT + python-dotenv
* **Database**: SQLite 3 (persistent file-based relational store)

---

## 📁 Project Structure

```text
/
├── backend/                  # Flask REST API Backend
│   ├── app/                  # Core application package
│   │   ├── __init__.py      # Application factory & setup
│   │   ├── config.py         # SQLAlchemy & JWT configs
│   │   ├── models.py         # Database model schemas (SQLite)
│   │   └── routes.py         # REST API routes & decorators
│   ├── run.py                # App entry bootstrapper
│   └── requirements.txt      # Python package requirements
│
├── frontend/                 # React.js SPA Frontend
│   ├── src/                  # React source codes
│   │   ├── components/       # Interface pages (Login, Dashboard)
│   │   ├── context/          # React Context (AuthContext session state)
│   │   ├── App.jsx           # Routing & context wrapping
│   │   ├── index.css         # Styling directives & typography
│   │   └── main.jsx          # React rendering mount
│   ├── index.html            # Entry HTML template
│   ├── package.json          # Node scripts & dependencies
│   ├── vite.config.js        # Vite & API proxy setup
│   ├── tailwind.config.js    # Tailwind color tokens & grids
│   └── postcss.config.js     # PostCSS configurations
│
├── .gitignore                # Global git ignore mappings
└── README.md                 # System documentation
```

---

## 📊 Database Schema (SQLite)

```mermaid
erDiagram
    users {
        int id PK
        string username UNIQUE
        string email UNIQUE
        string password_hash
        string role "member | admin"
        datetime created_at
    }
    books {
        int id PK
        string title
        string author
        string isbn UNIQUE
        string category
        int total_copies
        int available_copies
        datetime created_at
    }
    loans {
        int id PK
        int user_id FK
        int book_id FK
        datetime borrow_date
        datetime due_date
        datetime return_date
        string status "borrowed | returned"
    }

    users ||--o{ loans : "borrows"
    books ||--o{ loans : "logged in"
```

---

## 🔌 API Endpoints Mapping

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| **GET** | `/api/status` | Retrieve API status & database stats | No |
| **POST** | `/api/seed` | Seed database with default admin, student & books | No |
| **POST** | `/api/auth/register` | Register new Student Member or Administrator | No |
| **POST** | `/api/auth/login` | Authenticate credentials and get JWT token | No |
| **GET** | `/api/auth/me` | Retrieve profile of the logged-in user | Yes (Any) |
| **GET** | `/api/books` | Retrieve and search book inventories | Yes (Any) |
| **POST** | `/api/books` | Add a new book record | Yes (Admin) |
| **PUT** | `/api/books/<id>` | Update details of a book record | Yes (Admin) |
| **DELETE** | `/api/books/<id>` | Remove a book record from database | Yes (Admin) |
| **POST** | `/api/loans/borrow` | Checkout/Issue a book | Yes (Any) |
| **POST** | `/api/loans/return/<id>`| Return a checked-out book | Yes (Any) |
| **GET** | `/api/loans/my-active` | Retrieve list of active issues for current user | Yes (Member) |
| **GET** | `/api/loans/my-history` | Retrieve return history logs for current user | Yes (Member) |
| **GET** | `/api/loans/all` | Audit all system transactions | Yes (Admin) |

---

## 🛠️ Installation & Setup Guide

Ensure you have **Python 3.8+** and **Node.js 16+** installed on your system.

### 1. Backend Setup

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (CMD / PowerShell):
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required package dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask development server:
   ```bash
   python run.py
   ```
   The backend API server will start on **`http://127.0.0.1:5000`**. The SQLite database is created automatically as `backend/instance/library.db`.

---

### 2. Frontend Setup

1. Open a separate terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install package dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend web application will start on **`http://localhost:3000`** (requests to `/api` are automatically proxied to the backend Flask server).

---

## 🔑 Default Accounts & Seeding

On your first run, log in with the administrator details to seed sample data:

1. Go to `http://localhost:3000`.
2. Toggle the tab to **Admin Login** and enter:
   * **Username**: `admin`
   * **Password**: `admin123`
3. Upon logging in, you will see a banner prompting you to seed the empty database. Click **"Seed Sample Data"**.
4. The system will seed a default member account and 10 textbooks.
5. Log out and try logging in as a student member:
   * **Username**: `student`
   * **Password**: `student123`
