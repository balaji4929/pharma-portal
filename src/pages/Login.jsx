import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill, Eye, EyeOff, LogIn, Lock, Mail, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    const res = await login(email, password)
    if (res.success) navigate('/')
    else setError(res.error)
  }

  const demoAccounts = [
    { label: 'Admin', email: 'admin@pharmaops.com', pass: 'admin123', dot: '#00e5ff' },
    { label: 'Purchase Exec', email: 'rajesh@pharmaops.com', pass: 'exec123', dot: '#58a6ff' },
    { label: 'Gift Exec', email: 'priya@pharmaops.com', pass: 'exec123', dot: '#3fb950' },
    { label: 'Logistics Exec', email: 'amit@pharmaops.com', pass: 'exec123', dot: '#d29922' },
  ]

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary mb-4">
            <Pill size={28} className="text-[#0d1117]" />
          </div>
          <h1 className="text-3xl font-bold text-white">Glodac Pharma LLP</h1>
          <p className="text-slate-400 mt-1 text-sm">Operations Management System</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-9"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-9 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0d1117]/30 border-t-[#0d1117] rounded-full animate-spin" />
              ) : (
                <><LogIn size={18} /> Sign In</>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-dark-border">
            <p className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wider">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); setError('') }}
                  className="p-2.5 rounded-lg border border-dark-border hover:border-dark-hover bg-dark-hover/50 hover:bg-dark-hover text-xs text-left transition-all duration-150 group"
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: acc.dot }} />
                  <span className="text-slate-300 group-hover:text-white font-medium">{acc.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 text-center mt-2">Click to fill credentials, then Sign In</p>
          </div>
        </div>
      </div>
    </div>
  )
}
