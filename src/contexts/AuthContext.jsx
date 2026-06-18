import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const MOCK_USERS = [
  { id: 1, name: 'Admin User', email: 'admin@pharmaops.com', password: 'admin123', role: 'admin', avatar: 'AU' },
  { id: 2, name: 'Rajesh Kumar', email: 'rajesh@pharmaops.com', password: 'exec123', role: 'executive', department: 'purchase', avatar: 'RK' },
  { id: 3, name: 'Priya Sharma', email: 'priya@pharmaops.com', password: 'exec123', role: 'executive', department: 'gift', avatar: 'PS' },
  { id: 4, name: 'Amit Singh', email: 'amit@pharmaops.com', password: 'exec123', role: 'executive', department: 'logistics', avatar: 'AS' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('pharma_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const found = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const { password: _, ...safeUser } = found
      setUser(safeUser)
      localStorage.setItem('pharma_user', JSON.stringify(safeUser))
      setLoading(false)
      return { success: true }
    }
    setLoading(false)
    return { success: false, error: 'Invalid email or password' }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('pharma_user')
  }

  const isAdmin = user?.role === 'admin'
  const canAccess = (module) => {
    if (isAdmin) return true
    if (user?.role === 'executive') {
      if (!user.department) return true
      return user.department === module
    }
    return false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
