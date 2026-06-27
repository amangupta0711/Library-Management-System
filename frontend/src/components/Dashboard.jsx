import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  BookMarked, 
  LayoutDashboard, 
  BookOpen, 
  ArrowRightLeft, 
  History, 
  LogOut, 
  ShieldAlert, 
  GraduationCap, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Database, 
  AlertTriangle, 
  Users,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react'

export default function Dashboard() {
  const { user, logout, authFetch } = useAuth()
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'catalog', 'loans', 'history'
  
  // Global Data
  const [stats, setStats] = useState({ totalBooks: 0, totalMembers: 0, activeLoans: 0, overdueLoans: 0 })
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [myLoans, setMyLoans] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [allLoans, setAllLoans] = useState([]) // Admin only
  
  // State loaders & alerts
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Compute filtered books locally from the full loaded list.
  // This avoids any API call or component re-mount while the user is typing.
  const filteredBooks = useMemo(() => {
    let result = books
    if (selectedCategory) {
      result = result.filter(b => b.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(b =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q)
      )
    }
    return result
  }, [books, searchQuery, selectedCategory])

  // Book Modal (Add / Edit)
  const [showBookModal, setShowBookModal] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    total_copies: 1
  })

  // Load backend stats & data
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch system stats
      const statsRes = await authFetch('/api/status')
      const statsData = await statsRes.json()
      if (statsRes.ok && statsData.stats) {
        setStats(statsData.stats)
      }

      // 2. Fetch all books once — search/category filtering is done locally
      const booksRes = await authFetch('/api/books')
      const booksData = await booksRes.json()
      if (booksRes.ok) {
        setBooks(booksData.books || [])
        setCategories(booksData.categories || [])
      }

      // 3. Role specific fetches
      if (user?.role === 'admin') {
        const loansRes = await authFetch('/api/loans/all')
        const loansData = await loansRes.json()
        if (loansRes.ok) {
          setAllLoans(loansData.loans || [])
        }
      } else {
        const activeRes = await authFetch('/api/loans/my-active')
        const activeData = await activeRes.json()
        if (activeRes.ok) {
          setMyLoans(activeData.loans || [])
        }

        const historyRes = await authFetch('/api/loans/my-history')
        const historyData = await historyRes.json()
        if (historyRes.ok) {
          setMyHistory(historyData.loans || [])
        }
      }
    } catch (err) {
      setError('Failed to fetch data from the server')
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial data — only re-fetch when the active tab changes or after CRUD actions.
  // Search/category filtering is handled locally, so no API call fires on every keystroke.
  useEffect(() => {
    fetchData()
  }, [activeTab])

  // Trigger database seed
  const handleSeed = async () => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authFetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Seeded successfully!')
        fetchData()
      } else {
        setError(data.message || 'Seeding failed')
      }
    } catch (err) {
      setError('Connection error during seeding')
    } finally {
      setActionLoading(false)
    }
  }

  // Add / Edit Book Submit
  const handleBookSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setError('')
    setSuccess('')
    
    if (!bookForm.title || !bookForm.author) {
      setError('Title and Author are required')
      setActionLoading(false)
      return
    }

    try {
      let res
      if (modalMode === 'add') {
        res = await authFetch('/api/books', {
          method: 'POST',
          body: JSON.stringify(bookForm)
        })
      } else {
        res = await authFetch(`/api/books/${selectedBookId}`, {
          method: 'PUT',
          body: JSON.stringify(bookForm)
        })
      }

      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Book saved successfully!')
        setShowBookModal(false)
        setBookForm({ title: '', author: '', isbn: '', category: '', total_copies: 1 })
        fetchData()
      } else {
        setError(data.message || 'Failed to save book')
      }
    } catch (err) {
      setError('API connection error')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Book
  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authFetch(`/api/books/${bookId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Book deleted successfully')
        fetchData()
      } else {
        setError(data.message || 'Failed to delete book')
      }
    } catch (err) {
      setError('Failed to communicate with API server')
    } finally {
      setActionLoading(false)
    }
  }

  // Student: Borrow Book
  const handleBorrowBook = async (bookId) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authFetch('/api/loans/borrow', {
        method: 'POST',
        body: JSON.stringify({ book_id: bookId })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Book checked out successfully!')
        fetchData()
      } else {
        setError(data.message || 'Failed to borrow book')
      }
    } catch (err) {
      setError('Failed to contact API server')
    } finally {
      setActionLoading(false)
    }
  }

  // Return Book
  const handleReturnBook = async (loanId) => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await authFetch(`/api/loans/return/${loanId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(data.message || 'Book returned successfully!')
        fetchData()
      } else {
        setError(data.message || 'Failed to return book')
      }
    } catch (err) {
      setError('Failed to contact API server')
    } finally {
      setActionLoading(false)
    }
  }

  // Helper: Open Modal in Edit Mode
  const openEditModal = (book) => {
    setModalMode('edit')
    setSelectedBookId(book.id)
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category: book.category || 'General',
      total_copies: book.total_copies
    })
    setShowBookModal(true)
  }

  // Helper: Open Modal in Add Mode
  const openAddModal = () => {
    setModalMode('add')
    setSelectedBookId(null)
    setBookForm({
      title: '',
      author: '',
      isbn: '',
      category: 'General',
      total_copies: 1
    })
    setShowBookModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between p-6 shrink-0 z-40">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Athena<span className="text-brand-400">Library</span>
              </h1>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {user?.role === 'admin' ? 'Admin' : 'Student'}
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('catalog'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                activeTab === 'catalog'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Book Catalog
            </button>
            <button 
              onClick={() => { setActiveTab('loans'); setError(''); setSuccess(''); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                activeTab === 'loans'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" /> {user?.role === 'admin' ? 'All Transactions' : 'My Borrowings'}
            </button>
            
            {user?.role !== 'admin' && (
              <button 
                onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition duration-150 ${
                  activeTab === 'history'
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <History className="w-4 h-4" /> Return History
              </button>
            )}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="border-t border-slate-800 pt-6 mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              user?.role === 'admin' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {user?.role === 'admin' ? <ShieldAlert className="w-4.5 h-4.5" /> : <GraduationCap className="w-4.5 h-4.5" />}
            </div>
            <div className="truncate text-left">
              <p className="text-sm font-bold text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition duration-150"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        
        {/* Banner for system-level actions/alerts */}
        <div className="px-6 md:px-8 pt-6">
          {error && (
            <div className="flex justify-between items-center px-4 py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
              <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </div>
          )}
          {success && (
            <div className="flex justify-between items-center px-4 py-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {success}</span>
              <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Dynamic Inner Tab View */}
        <div className="p-6 md:p-8 flex-1">
          {loading ? (
            <div className="h-96 flex flex-col justify-center items-center gap-4 text-slate-400">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              <p className="text-xs font-semibold uppercase tracking-wider animate-pulse">Loading Workspace Database...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD HOME */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Hero banner */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/20">
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                        Welcome, {user?.username}!
                      </h2>
                      <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                        Database stats show active synchronizations. Switch pages using the left sidebar to manage books or review transaction histories.
                      </p>
                    </div>

                    <button 
                      onClick={fetchData}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-xl transition duration-150"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Sync Data
                    </button>
                  </div>

                  {/* Empty state prompt to seed data */}
                  {stats.totalBooks === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-amber-300">Database is Empty</h4>
                          <p className="text-xs text-slate-300 mt-1 max-w-md">
                            It looks like there are no book inventories or students initialized yet. Press "Seed Sample Data" to set up a sample library.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleSeed}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition duration-150 disabled:opacity-50"
                      >
                        {actionLoading ? 'Seeding...' : 'Seed Sample Data'}
                      </button>
                    </div>
                  )}

                  {/* Stats card panel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition duration-150">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Book Inventory</p>
                          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.totalBooks}</h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-indigo-400 font-semibold tracking-wide uppercase mt-4">Total books registered</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition duration-150">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Members</p>
                          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.totalMembers}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase mt-4">Registered student accounts</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition duration-150">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Borrowings</p>
                          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.activeLoans}</h3>
                        </div>
                        <div className="p-3 bg-sky-500/10 text-sky-400 rounded-lg">
                          <ArrowRightLeft className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-sky-400 font-semibold tracking-wide uppercase mt-4">Books currently issued</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition duration-150">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Issues</p>
                          <h3 className="text-3xl font-extrabold text-white mt-1">{stats.overdueLoans}</h3>
                        </div>
                        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-rose-400 font-semibold tracking-wide uppercase mt-4">Unreturned past due date</p>
                    </div>
                  </div>

                  {/* Backend Status details */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-brand-400" /> Database Specifications
                    </h3>
                    <div className="divide-y divide-slate-800 text-sm">
                      <div className="py-3.5 flex justify-between">
                        <span className="text-slate-400">Database Engine</span>
                        <span className="text-white font-medium">SQLite 3 (File-based)</span>
                      </div>
                      <div className="py-3.5 flex justify-between">
                        <span className="text-slate-400">Connection URI</span>
                        <code className="text-brand-300 font-mono text-xs">sqlite:///instance/library.db</code>
                      </div>
                      <div className="py-3.5 flex justify-between">
                        <span className="text-slate-400">Database Models</span>
                        <span className="text-white">User (roles: admin, member), Book, Loan</span>
                      </div>
                      <div className="py-3.5 flex justify-between">
                        <span className="text-slate-400">System Mode</span>
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Development (Flask Debug)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BOOK CATALOG */}
              {activeTab === 'catalog' && (
                <div className="space-y-6">
                  {/* Title & Add Action */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-white">Book Inventory Catalog</h2>
                      <p className="text-xs text-slate-400">Browse, search, or edit books in the library inventory.</p>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition duration-150 shadow-md shadow-brand-600/10"
                      >
                        <Plus className="w-4 h-4" /> Add Book Record
                      </button>
                    )}
                  </div>

                  {/* Search, Filter, and Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Search query input */}
                    <div className="relative sm:col-span-2">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Title, Author, or ISBN..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-500 outline-none transition duration-150"
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-3 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-300 text-sm outline-none transition duration-150"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Catalog display - grid card format */}
                  {filteredBooks.length === 0 ? (
                    <div className="h-64 flex flex-col justify-center items-center gap-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-400">
                      <BookOpen className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold">
                        {searchQuery || selectedCategory ? 'No books match your search' : 'No books found in the catalog'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBooks.map((book) => (
                        <div 
                          key={book.id}
                          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition duration-150 flex flex-col justify-between relative overflow-hidden"
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-800">
                                {book.category || 'General'}
                              </span>
                              
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                book.available_copies > 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {book.available_copies > 0 ? `Available (${book.available_copies})` : 'Out of Stock'}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-base font-bold text-white truncate" title={book.title}>
                                {book.title}
                              </h4>
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                by {book.author}
                              </p>
                            </div>
                            
                            <div className="text-[10px] text-slate-500 font-mono">
                              ISBN: {book.isbn || 'N/A'}
                            </div>
                          </div>

                          {/* Footer action buttons */}
                          <div className="border-t border-slate-800/60 pt-4 mt-5 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              Total copies: {book.total_copies}
                            </span>
                            
                            <div className="flex gap-2">
                              {user?.role === 'admin' ? (
                                <>
                                  <button
                                    onClick={() => openEditModal(book)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg border border-slate-700/50 transition duration-150"
                                    title="Edit Book details"
                                    disabled={actionLoading}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBook(book.id)}
                                    className="p-2 bg-slate-800 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 rounded-lg border border-slate-700/50 hover:border-rose-500/20 transition duration-150"
                                    title="Delete Book record"
                                    disabled={actionLoading}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleBorrowBook(book.id)}
                                  disabled={book.available_copies < 1 || actionLoading}
                                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-lg text-xs font-bold transition duration-150 border border-transparent disabled:border-slate-800"
                                >
                                  {book.available_copies > 0 ? 'Borrow Book' : 'Out of Stock'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LOANS & TRANSACTIONS */}
              {activeTab === 'loans' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {user?.role === 'admin' ? 'Library Lending Ledger' : 'My Current Book Issues'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {user?.role === 'admin' 
                        ? 'Auditing list of active and historic borrowings across all members.'
                        : 'Manage your active issues. Return books to make them available for others.'
                      }
                    </p>
                  </div>

                  {/* Admin Ledger Panel */}
                  {user?.role === 'admin' ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                              <th className="p-4">Book Title</th>
                              <th className="p-4">Borrower</th>
                              <th className="p-4">Issued On</th>
                              <th className="p-4">Due Date</th>
                              <th className="p-4">Returned On</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-sm">
                            {allLoans.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-6 text-center text-slate-500">
                                  No transaction records found.
                                </td>
                              </tr>
                            ) : (
                              allLoans.map((loan) => (
                                <tr key={loan.id} className="hover:bg-slate-800/10">
                                  <td className="p-4 font-semibold text-white">
                                    {loan.book?.title || 'Unknown Book'}
                                    <p className="text-xs text-slate-500 font-normal">{loan.book?.author}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-white font-medium">{loan.user?.username}</p>
                                    <p className="text-xs text-slate-500">{loan.user?.email}</p>
                                  </td>
                                  <td className="p-4 text-xs font-mono text-slate-400">
                                    {new Date(loan.borrow_date).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-xs font-mono text-slate-400">
                                    {new Date(loan.due_date).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-xs font-mono text-slate-400">
                                    {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                      loan.status === 'returned'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                    }`}>
                                      {loan.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Student active loans grid */
                    myLoans.length === 0 ? (
                      <div className="h-64 flex flex-col justify-center items-center gap-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-400">
                        <ArrowRightLeft className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-semibold">You have no active borrowings</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {myLoans.map((loan) => (
                          <div 
                            key={loan.id}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 text-[10px] font-bold uppercase tracking-wider rounded border border-brand-500/20">
                                  Borrowed
                                </span>
                                
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ID: #{loan.id}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-base font-bold text-white truncate">
                                  {loan.book?.title}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  by {loan.book?.author}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/60 pt-3">
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Issued On</p>
                                  <p className="text-slate-300 font-medium font-mono mt-0.5">
                                    {new Date(loan.borrow_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Due Date</p>
                                  <p className="text-brand-300 font-semibold font-mono mt-0.5">
                                    {new Date(loan.due_date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleReturnBook(loan.id)}
                              disabled={actionLoading}
                              className="mt-6 w-full py-2.5 bg-slate-850 hover:bg-emerald-600 hover:text-white border border-slate-800 hover:border-emerald-500 text-slate-300 text-xs font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
                            >
                              Return Book
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* TAB 4: RETURN HISTORY (Student only) */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">Borrowing Return History</h2>
                    <p className="text-xs text-slate-400">Review logs of your past library returns.</p>
                  </div>

                  {myHistory.length === 0 ? (
                    <div className="h-64 flex flex-col justify-center items-center gap-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-400">
                      <History className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold">No historic records found</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                              <th className="p-4">Book Title</th>
                              <th className="p-4">Issued On</th>
                              <th className="p-4">Due Date</th>
                              <th className="p-4">Returned On</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-sm">
                            {myHistory.map((loan) => (
                              <tr key={loan.id} className="hover:bg-slate-850/20">
                                <td className="p-4 font-semibold text-white">
                                  {loan.book?.title || 'Unknown Book'}
                                  <p className="text-xs text-slate-500 font-normal">{loan.book?.author}</p>
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-400">
                                  {new Date(loan.borrow_date).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-400">
                                  {new Date(loan.due_date).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-400">
                                  {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase rounded">
                                    Returned
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ADMIN BOOK CREATION / MODIFICATION MODAL */}
      {showBookModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowBookModal(false)}
              className="absolute right-4 top-4 p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition duration-150"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {modalMode === 'add' ? 'Add New Book Record' : 'Edit Book Details'}
            </h3>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Book Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean Code"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Author Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert C. Martin"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ISBN Code</label>
                <input
                  type="text"
                  placeholder="e.g. 978-0132350884"
                  value={bookForm.isbn}
                  onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Fiction"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookForm.total_copies}
                    onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm outline-none transition duration-150"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition duration-150 mt-6 shadow-md shadow-brand-600/10 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {modalMode === 'add' ? 'Create Book Record' : 'Save Book Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
      
    </div>
  )
}
