import React, { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pharma_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await api.login(email, password)
      // data: { token, user: { id, full_name, email, role, department, avatar } }
      const safeUser = {
        id:         data.user.id,
        name:       data.user.full_name,
        email:      data.user.email,
        role:       data.user.role,
        department: data.user.department,
        avatar:     data.user.avatar,
        token:      data.token,
      }
      setUser(safeUser)
      localStorage.setItem('pharma_user', JSON.stringify(safeUser))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Invalid email or password' }
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
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
    <AuthContext.Provider value={{ user, login, logout, changePassword, loading, isAdmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
