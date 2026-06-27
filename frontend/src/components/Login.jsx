import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BookMarked, User, ShieldCheck, Mail, Lock, KeyRound, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  
  // Modes & states
  const [isRegister, setIsRegister] = useState(false)
  const [role, setRole] = useState('member') // 'member' or 'admin'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminCode: ''
  })

  // Handle inputs
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const { username, email, password, confirmPassword, adminCode } = formData

    if (isRegister) {
      // Validations
      if (!username || !email || !password || !confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (role === 'admin' && !adminCode) {
        setError('Admin code is required to register as Administrator')
        setLoading(false)
        return
      }

      // Call Register
      const res = await register(username, email, password, role, adminCode)
      if (res.success) {
        setSuccess(`${res.message || 'Registration successful!'} You can now log in.`)
        // Clear registration fields
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          adminCode: ''
        })
        setIsRegister(false)
      } else {
        setError(res.error || 'Registration failed')
      }
    } else {
      // Login
      const loginIdentity = username || email // either one can be used
      if (!loginIdentity || !password) {
        setError('Please enter both identity and password')
        setLoading(false)
        return
      }

      const res = await login(loginIdentity, password)
      if (!res.success) {
        setError(res.error || 'Invalid credentials')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Background ambient glowing details */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        
        {/* Brand Logo header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl border border-brand-500/20 mb-3 shadow-lg shadow-brand-500/5">
            <BookMarked className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
            Athena<span className="text-brand-400">Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {isRegister ? 'Create an account to borrow books' : 'Log in to manage library assets'}
          </p>
        </div>

        {/* Unified Tab Switcher (Only visible for Login, registration selects role manually or toggle) */}
        {!isRegister && (
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6">
            <button
              onClick={() => { setRole('member'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 ${
                role === 'member'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Student Login
            </button>
            <button
              onClick={() => { setRole('admin'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 ${
                role === 'admin'
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/10 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Login
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium leading-relaxed">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email / Username field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {isRegister ? 'Username' : 'Email or Username'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder={isRegister ? 'e.g. john_doe' : 'Enter your email or username'}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                required
              />
            </div>
          </div>

          {/* Registration email field */}
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. john@university.edu"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                  required
                />
              </div>
            </div>
          )}

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                required
              />
            </div>
          </div>

          {/* Register-only password confirmation */}
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                  required
                />
              </div>
            </div>
          )}

          {/* Register-only Role Select & Admin Secret verification */}
          {isRegister && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Register As</label>
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-brand-500 rounded-xl text-slate-200 text-sm outline-none transition duration-150"
                >
                  <option value="member">Student (Library Member)</option>
                  <option value="admin">Library Administrator</option>
                </select>
              </div>

              {role === 'admin' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> Admin Code
                  </label>
                  <input
                    type="password"
                    name="adminCode"
                    value={formData.adminCode}
                    onChange={handleChange}
                    placeholder="Enter code e.g. ADMIN123"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-brand-500/25 focus:border-brand-500 rounded-xl text-slate-200 text-sm placeholder-slate-600 outline-none transition duration-150"
                    required={role === 'admin'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition duration-200 mt-6 flex items-center justify-center gap-2 shadow-lg ${
              role === 'admin'
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/10'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isRegister ? 'Register' : 'Log In'} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch registration / login */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
              setSuccess('')
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                adminCode: ''
              })
            }}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium transition duration-150"
          >
            {isRegister 
              ? 'Already have an account? Log In' 
              : "Don't have an account? Sign Up as Student"
            }
          </button>
        </div>

      </div>
    </div>
  )
}
