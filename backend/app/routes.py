from flask import Blueprint, request, jsonify, current_app, g
from functools import wraps
from datetime import datetime, timedelta
import jwt
from app import db
from app.models import User, Book, Loan

api_bp = Blueprint('api', __name__)

def token_required(f):
    """
    Decorator to protect routes with JWT authentication.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Authentication token is missing'}), 401
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
            g.current_user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(*args, **kwargs)
        
    return decorated

def admin_required(f):
    """
    Decorator to restrict access to administrator role only.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'current_user') or g.current_user.role != 'admin':
            return jsonify({'message': 'Administrator privileges required'}), 403
        return f(*args, **kwargs)
    return decorated


# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

@api_bp.route('/auth/register', methods=['POST'])
def register():
    """
    Register a new user (Student Member or Administrator).
    """
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'member')
    admin_code = data.get('adminCode')
    
    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400
        
    if role not in ['member', 'admin']:
        return jsonify({'message': 'Invalid role specified'}), 400
        
    if role == 'admin':
        expected_code = current_app.config.get('ADMIN_CODE', 'ADMIN123')
        if admin_code != expected_code:
            return jsonify({'message': 'Invalid Admin Code'}), 403
            
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
        
    # Check if email already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409
        
    new_user = User(username=username, email=email, role=role)
    new_user.set_password(password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            'message': 'Registration successful!',
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500


@api_bp.route('/auth/login', methods=['POST'])
def login():
    """
    Authenticate credentials and return JWT token.
    """
    data = request.get_json() or {}
    username_or_email = data.get('usernameOrEmail')
    password = data.get('password')
    
    if not username_or_email or not password:
        return jsonify({'message': 'Username/Email and password are required'}), 400
        
    # Search for user by username or email
    user = User.query.filter(
        (User.username == username_or_email) | 
        (User.email == username_or_email)
    ).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    # Generate JWT token
    try:
        payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'message': 'Failed to generate token', 'error': str(e)}), 500


@api_bp.route('/auth/me', methods=['GET'])
@token_required
def get_me():
    """
    Get profile of the currently logged-in user.
    """
    return jsonify({'user': g.current_user.to_dict()}), 200


# ==========================================
# SYSTEM & STATISTICS API
# ==========================================

@api_bp.route('/status', methods=['GET'])
def get_status():
    """
    Check API backend status and return live database statistics.
    """
    try:
        total_books = Book.query.count()
        total_members = User.query.filter_by(role='member').count()
        active_loans = Loan.query.filter_by(status='borrowed').count()
        
        # Calculate overdue loans
        now = datetime.utcnow()
        overdue_loans = Loan.query.filter(Loan.status == 'borrowed', Loan.due_date < now).count()
        
        return jsonify({
            'status': 'online',
            'message': 'Library Management API is running.',
            'database': 'SQLite configured',
            'stats': {
                'totalBooks': total_books,
                'totalMembers': total_members,
                'activeLoans': active_loans,
                'overdueLoans': overdue_loans
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'online',
            'message': 'Library Management API is running.',
            'database': 'SQLite error',
            'error': str(e),
            'stats': {
                'totalBooks': 0,
                'totalMembers': 0,
                'activeLoans': 0,
                'overdueLoans': 0
            }
        }), 200


# ==========================================
# BOOK CRUD ENDPOINTS
# ==========================================

@api_bp.route('/books', methods=['GET'])
@token_required
def get_books():
    """
    Retrieve and search/filter list of books.
    Supports query parameters: ?search=... &category=...
    """
    search_query = request.args.get('search', '')
    category_filter = request.args.get('category', '')
    
    query = Book.query
    
    if category_filter:
        query = query.filter_by(category=category_filter)
        
    if search_query:
        search_pattern = f"%{search_query}%"
        query = query.filter(
            (Book.title.like(search_pattern)) | 
            (Book.author.like(search_pattern)) | 
            (Book.isbn.like(search_pattern))
        )
        
    books = query.all()
    
    # Get distinct categories for filtering UI
    categories = [row[0] for row in db.session.query(Book.category).distinct().all() if row[0]]
    
    return jsonify({
        'books': [b.to_dict() for b in books],
        'categories': categories
    }), 200

@api_bp.route('/books/<int:book_id>', methods=['GET'])
@token_required
def get_book(book_id):
    """
    Get details of a single book.
    """
    book = Book.query.get_or_404(book_id)
    return jsonify({'book': book.to_dict()}), 200

@api_bp.route('/books', methods=['POST'])
@token_required
@admin_required
def add_book():
    """
    Add a new book (Admin only).
    """
    data = request.get_json() or {}
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    category = data.get('category', 'General')
    total_copies = data.get('total_copies', 1)
    
    if not title or not author:
        return jsonify({'message': 'Title and Author are required fields'}), 400
        
    # Check if ISBN is unique (if provided)
    if isbn:
        existing_isbn = Book.query.filter_by(isbn=isbn).first()
        if existing_isbn:
            return jsonify({'message': f'Book with ISBN {isbn} already exists'}), 409

    try:
        total_copies = int(total_copies)
        if total_copies < 1:
            return jsonify({'message': 'Total copies must be at least 1'}), 400
    except ValueError:
        return jsonify({'message': 'Total copies must be a valid number'}), 400
        
    new_book = Book(
        title=title,
        author=author,
        isbn=isbn,
        category=category,
        total_copies=total_copies,
        available_copies=total_copies
    )
    
    try:
        db.session.add(new_book)
        db.session.commit()
        return jsonify({
            'message': 'Book added successfully',
            'book': new_book.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500

@api_bp.route('/books/<int:book_id>', methods=['PUT'])
@token_required
@admin_required
def edit_book(book_id):
    """
    Edit an existing book details (Admin only).
    """
    book = Book.query.get_or_404(book_id)
    data = request.get_json() or {}
    
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    category = data.get('category')
    total_copies = data.get('total_copies')
    
    if not title or not author:
        return jsonify({'message': 'Title and Author are required'}), 400
        
    if isbn and isbn != book.isbn:
        existing_isbn = Book.query.filter_by(isbn=isbn).first()
        if existing_isbn:
            return jsonify({'message': f'Book with ISBN {isbn} already exists'}), 409
            
    if total_copies is not None:
        try:
            total_copies = int(total_copies)
            if total_copies < 0:
                return jsonify({'message': 'Total copies cannot be negative'}), 400
                
            # Calculate copies difference and update availability
            copies_diff = total_copies - book.total_copies
            new_available = book.available_copies + copies_diff
            
            if new_available < 0:
                return jsonify({
                    'message': f'Cannot reduce copies to {total_copies}. There are currently {book.total_copies - book.available_copies} copies checked out.'
                }), 400
                
            book.total_copies = total_copies
            book.available_copies = new_available
        except ValueError:
            return jsonify({'message': 'Total copies must be a valid number'}), 400

    book.title = title
    book.author = author
    book.isbn = isbn
    if category:
        book.category = category
        
    try:
        db.session.commit()
        return jsonify({
            'message': 'Book updated successfully',
            'book': book.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500

@api_bp.route('/books/<int:book_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_book(book_id):
    """
    Delete a book (Admin only).
    Fails if the book is currently borrowed (has active loans).
    """
    book = Book.query.get_or_404(book_id)
    
    # Check if there are active loans
    active_loans = Loan.query.filter_by(book_id=book_id, status='borrowed').first()
    if active_loans:
        return jsonify({
            'message': 'Cannot delete book. There are currently active loans checked out for this book.'
        }), 400
        
    try:
        # Delete any returned transaction histories for this book first
        Loan.query.filter_by(book_id=book_id).delete()
        db.session.delete(book)
        db.session.commit()
        return jsonify({'message': 'Book deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500


# ==========================================
# LOAN & TRANSACTION ENDPOINTS
# ==========================================

@api_bp.route('/loans/borrow', methods=['POST'])
@token_required
def borrow_book():
    """
    Issue / Borrow a book.
    Required payload: { "book_id": 12 }
    Students borrow for themselves. Admins can borrow for users (if user_id passed) or themselves.
    """
    data = request.get_json() or {}
    book_id = data.get('book_id')
    user_id = data.get('user_id') or g.current_user.id
    
    if not book_id:
        return jsonify({'message': 'Missing book_id'}), 400
        
    # Check roles
    if user_id != g.current_user.id and g.current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized action'}), 403
        
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'message': 'Book not found'}), 404
        
    if book.available_copies < 1:
        return jsonify({'message': 'Book is currently out of stock (no available copies)'}), 409
        
    # Check if user already has an active loan for this specific book
    existing_loan = Loan.query.filter_by(user_id=user_id, book_id=book_id, status='borrowed').first()
    if existing_loan:
        return jsonify({'message': 'You have already borrowed a copy of this book. Return it before borrowing again.'}), 409
        
    # Create the loan transaction
    borrow_date = datetime.utcnow()
    due_date = borrow_date + timedelta(days=14) # 2 weeks borrow duration
    
    loan = Loan(
        user_id=user_id,
        book_id=book_id,
        borrow_date=borrow_date,
        due_date=due_date,
        status='borrowed'
    )
    
    # Decrement available copies
    book.available_copies -= 1
    
    try:
        db.session.add(loan)
        db.session.commit()
        return jsonify({
            'message': 'Book borrowed successfully',
            'loan': loan.to_dict(),
            'book': book.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500

@api_bp.route('/loans/return/<int:loan_id>', methods=['POST'])
@token_required
def return_book(loan_id):
    """
    Return a borrowed book.
    """
    loan = Loan.query.get(loan_id)
    if not loan:
        return jsonify({'message': 'Transaction loan record not found'}), 404
        
    # Check authorizations
    if loan.user_id != g.current_user.id and g.current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized action'}), 403
        
    if loan.status != 'borrowed':
        return jsonify({'message': 'This book has already been returned'}), 400
        
    book = Book.query.get(loan.book_id)
    if not book:
        return jsonify({'message': 'Associated book record not found'}), 404
        
    # Update loan
    loan.status = 'returned'
    loan.return_date = datetime.utcnow()
    
    # Increment available copies
    book.available_copies = min(book.total_copies, book.available_copies + 1)
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Book returned successfully',
            'loan': loan.to_dict(),
            'book': book.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Database error occurred', 'error': str(e)}), 500

@api_bp.route('/loans/my-active', methods=['GET'])
@token_required
def get_my_active_loans():
    """
    Get active borrowings of the currently logged-in user.
    """
    loans = Loan.query.filter_by(user_id=g.current_user.id, status='borrowed').all()
    
    loans_with_books = []
    for l in loans:
        book = Book.query.get(l.book_id)
        loan_dict = l.to_dict()
        loan_dict['book'] = book.to_dict() if book else None
        loans_with_books.append(loan_dict)
        
    return jsonify({'loans': loans_with_books}), 200

@api_bp.route('/loans/my-history', methods=['GET'])
@token_required
def get_my_loan_history():
    """
    Get all past returned borrowings of the currently logged-in user.
    """
    loans = Loan.query.filter_by(user_id=g.current_user.id, status='returned').order_by(Loan.return_date.desc()).all()
    
    loans_with_books = []
    for l in loans:
        book = Book.query.get(l.book_id)
        loan_dict = l.to_dict()
        loan_dict['book'] = book.to_dict() if book else None
        loans_with_books.append(loan_dict)
        
    return jsonify({'loans': loans_with_books}), 200

@api_bp.route('/loans/all', methods=['GET'])
@token_required
@admin_required
def get_all_loans():
    """
    Get all loan records in the database (Admin only).
    """
    loans = Loan.query.order_by(Loan.borrow_date.desc()).all()
    
    loans_detailed = []
    for l in loans:
        book = Book.query.get(l.book_id)
        user = User.query.get(l.user_id)
        loan_dict = l.to_dict()
        loan_dict['book'] = book.to_dict() if book else None
        loan_dict['user'] = {
            'username': user.username,
            'email': user.email
        } if user else None
        loans_detailed.append(loan_dict)
        
    return jsonify({'loans': loans_detailed}), 200


# ==========================================
# DATABASE SEED ENDPOINT
# ==========================================

@api_bp.route('/seed', methods=['POST'])
def seed_database():
    """
    Seeds database with mock data.
    Will create an admin user (if none exists) and generic books.
    """
    try:
        # Check if books already exist
        if Book.query.count() > 0:
            return jsonify({'message': 'Database already seeded. Seed skipped.'}), 200
            
        # Seed Admin User if not exists
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            admin = User(username='admin', email='admin@athena.edu', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            
        # Seed Student Member if not exists
        student = User.query.filter_by(username='student').first()
        if not student:
            student = User(username='student', email='student@athena.edu', role='member')
            student.set_password('student123')
            db.session.add(student)

        # Seed Books
        sample_books = [
            Book(title='The Clean Coder', author='Robert C. Martin', isbn='978-0137081073', category='Software Engineering', total_copies=5, available_copies=5),
            Book(title='Clean Code', author='Robert C. Martin', isbn='978-0132350884', category='Software Engineering', total_copies=3, available_copies=3),
            Book(title='Design Patterns', author='Erich Gamma', isbn='978-0201633610', category='Computer Science', total_copies=2, available_copies=2),
            Book(title='Introduction to Algorithms', author='Thomas H. Cormen', isbn='978-0262033848', category='Algorithms', total_copies=4, available_copies=4),
            Book(title='You Don\'t Know JS', author='Kyle Simpson', isbn='978-1491904244', category='Web Development', total_copies=6, available_copies=6),
            Book(title='JavaScript: The Good Parts', author='Douglas Crockford', isbn='978-0596517748', category='Web Development', total_copies=2, available_copies=2),
            Book(title='The Pragmatic Programmer', author='David Thomas', isbn='978-0135957059', category='Software Engineering', total_copies=4, available_copies=4),
            Book(title='Artificial Intelligence: A Modern Approach', author='Stuart Russell', isbn='978-0136083207', category='Artificial Intelligence', total_copies=2, available_copies=2),
            Book(title='The Hobbit', author='J.R.R. Tolkien', isbn='978-0547928227', category='Fiction', total_copies=3, available_copies=3),
            Book(title='1984', author='George Orwell', isbn='978-0451524935', category='Fiction', total_copies=5, available_copies=5),
        ]
        
        for b in sample_books:
            db.session.add(b)
            
        db.session.commit()
        return jsonify({'message': 'Successfully seeded admin (admin/admin123), student (student/student123), and 10 tech books.'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Seeding failed', 'error': str(e)}), 500
