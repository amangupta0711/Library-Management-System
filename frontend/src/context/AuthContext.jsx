import React, { createContext, useState, useEffect, useContext } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Fetch current user details on load if token exists
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Session invalid or expired')
        }
        return res.json()
      })
      .then(data => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        // Clear token on failure (expired/altered token)
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [token])

  // Login action handler
  const login = async (usernameOrEmail, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }
      
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Register action handler (supports admin_code validation)
  const register = async (username, email, password, role, adminCode) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role, adminCode })
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed')
      }
      return { success: true, message: data.message }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Logout action handler
  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  // Helper fetch helper attaching the authentication header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return fetch(url, { ...options, headers })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
