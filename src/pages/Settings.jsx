import React, { useState } from 'react'
import { Settings, User, Lock, Eye, EyeOff, Palette, Shield, Bell, CheckCircle, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User, adminOnly: false },
  { id: 'security', label: 'Security', icon: Lock, adminOnly: false },
  { id: 'branding', label: 'Branding', icon: Palette, adminOnly: true },
  { id: 'gmail', label: 'Gmail API', icon: Mail, adminOnly: true },
  { id: 'logs', label: 'Session Logs', icon: Shield, adminOnly: true },
]

const mockLogs = [
  { id: 1, user: 'Admin User', ip: '192.168.1.100', device: 'Chrome / Windows', time: '2024-01-22 09:30:00', action: 'Login' },
  { id: 2, user: 'Rajesh Kumar', ip: '192.168.1.101', device: 'Safari / iPhone', time: '2024-01-22 08:15:00', action: 'Login' },
  { id: 3, user: 'Priya Sharma', ip: '192.168.1.102', device: 'Chrome / macOS', time: '2024-01-21 16:45:00', action: 'Login' },
  { id: 4, user: 'Admin User', ip: '192.168.1.100', device: 'Chrome / Windows', time: '2024-01-21 09:00:00', action: 'Login' },
]

export default function SettingsPage() {
  const { user, isAdmin, changePassword } = useAuth()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ name: user?.name || '', phone: '', email: user?.email || '' })
  const [pass, setPass] = useState({ current: '', new: '', confirm: '' })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  const [branding, setBranding] = useState({ company: 'Glodac Pharma LLP', portal: 'Glodac Pharma OMS', primaryColor: '#00e5ff', accentColor: '#00b8d4' })
  const [gmail, setGmail] = useState({ clientId: '', clientSecret: '', redirectUri: 'http://localhost:5000/auth/google/callback', fromEmail: '' })

  const passStrength = (p) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = passStrength(pass.new)
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-400', 'bg-emerald-500']
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  const handleSaveProfile = () => {
    if (!profile.name || !profile.email) { toast.error('Name and email required'); return }
    toast.success('Profile updated successfully')
  }

  const handleChangePass = () => {
    if (!pass.current) { toast.error('Enter current password'); return }
    if (pass.new.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (pass.new !== pass.confirm) { toast.error('Passwords do not match'); return }
    const result = changePassword(pass.current, pass.new)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Password changed successfully')
    setPass({ current: '', new: '', confirm: '' })
  }

  const handleSaveBranding = () => toast.success('Branding settings saved')
  const handleSaveGmail = () => toast.success('Gmail API configuration saved')

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={22} className="text-slate-400" /> Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="glass-card p-2 space-y-1">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 'text-slate-400 hover:text-white hover:bg-dark-hover'}`}
              >
                <t.icon size={15} />
                {t.label}
                {t.adminOnly && <span className="ml-auto text-[9px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded font-semibold">ADMIN</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile */}
          {tab === 'profile' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><User size={17} className="text-brand-primary" /> Profile Information</h2>
              <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="w-14 h-14 rounded-xl bg-brand-primary flex items-center justify-center text-[#0d1117] text-xl font-bold flex-shrink-0">
                  {user?.avatar}
                </div>
                <div>
                  <p className="font-bold text-white">{user?.name}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                  <p className="text-xs text-brand-primary mt-0.5 capitalize">{user?.role}{user?.department ? ` — ${user.department}` : ''}</p>
                </div>
              </div>
              <div className="form-grid">
                <div>
                  <label className="label">Full Name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="input-field" placeholder="9876543210" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Email Address</label>
                  <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="input-field" />
                </div>
              </div>
              <button onClick={handleSaveProfile} className="btn-primary"><CheckCircle size={15} /> Save Profile</button>
            </div>
          )}

          {/* Security */}
          {tab === 'security' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><Lock size={17} className="text-brand-primary" /> Change Password</h2>
              <div className="space-y-4">
                {(['current', 'new', 'confirm']).map(key => (
                  <div key={key}>
                    <label className="label">{key === 'current' ? 'Current Password' : key === 'new' ? 'New Password' : 'Confirm New Password'}</label>
                    <div className="relative">
                      <input
                        type={showPass[key] ? 'text' : 'password'}
                        value={pass[key]}
                        onChange={e => setPass(p => ({ ...p, [key]: e.target.value }))}
                        className="input-field pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPass[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pass.new && (
                  <div className="animate-fade-in">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-dark-border'}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {strengthLabels[strength]} {strength >= 3 ? '✓' : ''}
                    </p>
                  </div>
                )}
              </div>
              <button onClick={handleChangePass} className="btn-primary"><Lock size={15} /> Update Password</button>
            </div>
          )}

          {/* Branding (Admin only) */}
          {tab === 'branding' && isAdmin && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><Palette size={17} className="text-brand-primary" /> White-Label Branding</h2>
              <div className="form-grid">
                <div>
                  <label className="label">Company Name</label>
                  <input value={branding.company} onChange={e => setBranding(b => ({ ...b, company: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Portal Title</label>
                  <input value={branding.portal} onChange={e => setBranding(b => ({ ...b, portal: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Primary Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} className="w-12 h-10 rounded-lg border border-dark-border bg-dark-bg cursor-pointer" />
                    <input value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} className="input-field flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="label">Accent Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={branding.accentColor} onChange={e => setBranding(b => ({ ...b, accentColor: e.target.value }))} className="w-12 h-10 rounded-lg border border-dark-border bg-dark-bg cursor-pointer" />
                    <input value={branding.accentColor} onChange={e => setBranding(b => ({ ...b, accentColor: e.target.value }))} className="input-field flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="label">Company Logo URL</label>
                  <input className="input-field" placeholder="https://cdn.company.com/logo.png" />
                </div>
                <div>
                  <label className="label">Favicon URL</label>
                  <input className="input-field" placeholder="https://cdn.company.com/favicon.ico" />
                </div>
              </div>
              <div className="p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-xs text-brand-primary">
                ℹ️ Color changes will apply across the portal after saving. A full reload may be needed to see the effects.
              </div>
              <button onClick={handleSaveBranding} className="btn-primary"><CheckCircle size={15} /> Save Branding</button>
            </div>
          )}

          {/* Gmail API */}
          {tab === 'gmail' && isAdmin && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2"><Mail size={17} className="text-brand-primary" /> Gmail API Configuration</h2>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                ⚠️ Configure your Google Cloud OAuth 2.0 credentials to enable email sending for quote requests. See <span className="underline cursor-pointer">Google Cloud Console</span>.
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Client ID</label>
                  <input value={gmail.clientId} onChange={e => setGmail(g => ({ ...g, clientId: e.target.value }))} className="input-field font-mono text-sm" placeholder="123456789-abc.apps.googleusercontent.com" />
                </div>
                <div>
                  <label className="label">Client Secret</label>
                  <input type="password" value={gmail.clientSecret} onChange={e => setGmail(g => ({ ...g, clientSecret: e.target.value }))} className="input-field font-mono text-sm" placeholder="GOCSPX-..." />
                </div>
                <div>
                  <label className="label">Redirect URI</label>
                  <input value={gmail.redirectUri} onChange={e => setGmail(g => ({ ...g, redirectUri: e.target.value }))} className="input-field font-mono text-sm" />
                </div>
                <div>
                  <label className="label">From Email Address</label>
                  <input type="email" value={gmail.fromEmail} onChange={e => setGmail(g => ({ ...g, fromEmail: e.target.value }))} className="input-field" placeholder="purchase@yourcompany.com" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveGmail} className="btn-primary"><CheckCircle size={15} /> Save Configuration</button>
                <button className="btn-secondary">Test Connection</button>
              </div>
            </div>
          )}

          {/* Session Logs */}
          {tab === 'logs' && isAdmin && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-border">
                <h2 className="section-title"><Shield size={17} className="text-brand-primary" /> Session & Login Logs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-dark-border">
                    <th className="table-header">User</th>
                    <th className="table-header">IP Address</th>
                    <th className="table-header">Device / Browser</th>
                    <th className="table-header">Action</th>
                    <th className="table-header">Timestamp</th>
                  </tr></thead>
                  <tbody>
                    {mockLogs.map(l => (
                      <tr key={l.id} className="table-row">
                        <td className="table-cell font-medium text-white">{l.user}</td>
                        <td className="table-cell font-mono text-xs text-slate-400">{l.ip}</td>
                        <td className="table-cell text-xs text-slate-400">{l.device}</td>
                        <td className="table-cell"><span className="badge-success">{l.action}</span></td>
                        <td className="table-cell text-xs text-slate-400">{l.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}