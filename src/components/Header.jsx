import React, { useState, useRef, useEffect } from 'react'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAllRead } = useApp()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const navigate = useNavigate()
  const notifRef = useRef()
  const userRef = useRef()

  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleLabel = user?.role === 'admin' ? 'Super Admin' : `Executive — ${user?.department || 'General'}`

  return (
    <header className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-dark-hover text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif(o => !o); setShowUser(false) }}
            className="relative p-2 rounded-lg hover:bg-dark-hover text-slate-400 hover:text-white transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <button onClick={markAllRead} className="text-xs text-brand-primary hover:underline">Mark all read</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-dark-border last:border-0 ${!n.read ? 'bg-brand-primary/5' : ''}`}>
                    <p className={`text-sm ${!n.read ? 'text-white' : 'text-slate-400'}`}>{n.msg}</p>
                    <p className="text-xs text-slate-500 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUser(o => !o); setShowNotif(false) }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-hover transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-[#0d1117] text-xs font-bold">
              {user?.avatar}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
          {showUser && (
            <div className="absolute right-0 top-12 w-52 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate('/settings'); setShowUser(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-dark-hover hover:text-white transition-colors"
              >
                <User size={15} /> Profile & Settings
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-dark-border"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
