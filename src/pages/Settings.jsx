import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Settings, User, Lock, Eye, EyeOff, Palette, Shield, CheckCircle, Mail,
  Database, Download, Upload, HardDrive, RefreshCw, AlertTriangle,
  Cloud, X, ChevronDown, ChevronRight, ExternalLink, Wifi, WifiOff,
  Check, Loader
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

// ── backup data keys ──────────────────────────────────────────────────────────
const BACKUP_KEYS = [
  'pharma_sales_data',
  'pharma_sales_meta',
  'pharma_sales_schema',
  'pharma_distributors',
  'pharma_expenses',
  'pharma_product_costs',
]
const LS_BACKUP_CFG = 'pharma_backup_config'

function loadBackupCfg() {
  try { return JSON.parse(localStorage.getItem(LS_BACKUP_CFG) || '{}') } catch { return {} }
}
function saveBackupCfg(cfg) {
  localStorage.setItem(LS_BACKUP_CFG, JSON.stringify(cfg))
}

function collectBackup() {
  const backup = {
    version: '1.0',
    app: 'Glodac Pharma OMS',
    exported: new Date().toISOString(),
    data: {},
  }
  BACKUP_KEYS.forEach(k => {
    const v = localStorage.getItem(k)
    if (v) { try { backup.data[k] = JSON.parse(v) } catch {} }
  })
  return backup
}

function restoreBackup(backup) {
  if (!backup?.data) throw new Error('Invalid backup file — missing data block')
  let count = 0
  Object.entries(backup.data).forEach(([k, v]) => {
    if (BACKUP_KEYS.includes(k)) { localStorage.setItem(k, JSON.stringify(v)); count++ }
  })
  return count
}

function getDataSummary() {
  const summary = []
  const salesData = (() => { try { return JSON.parse(localStorage.getItem('pharma_sales_data') || 'null') } catch { return null } })()
  const distData  = (() => { try { return JSON.parse(localStorage.getItem('pharma_distributors') || 'null') } catch { return null } })()
  const expData   = (() => { try { return JSON.parse(localStorage.getItem('pharma_expenses') || 'null') } catch { return null } })()
  const costData  = (() => { try { return JSON.parse(localStorage.getItem('pharma_product_costs') || 'null') } catch { return null } })()

  if (salesData)  summary.push({ label: 'Sales Records',   value: `${salesData.length} rows` })
  if (distData)   summary.push({ label: 'Distributors',    value: `${distData.length} parties` })
  if (expData)    summary.push({ label: 'Expenses',        value: `${expData.length} entries` })
  if (costData)   summary.push({ label: 'Product Costs',   value: `${Object.keys(costData).length} products` })

  let totalBytes = 0
  BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v) totalBytes += v.length })
  const sizeStr = totalBytes > 1024 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${totalBytes} B`

  return { items: summary, size: sizeStr, hasData: summary.length > 0 }
}

// ── load external script helper ───────────────────────────────────────────────
function loadScript(src, check) {
  return new Promise((resolve, reject) => {
    if (check?.()) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

// ── Google Drive helpers ──────────────────────────────────────────────────────
async function gdGetToken(clientId) {
  await loadScript('https://accounts.google.com/gsi/client', () => !!window.google?.accounts)
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => r.error ? reject(new Error(r.error_description || r.error)) : resolve(r.access_token),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

async function gdUpload(token, jsonStr) {
  // find existing file
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='glodac-oms-backup.json' and trashed=false")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const { files } = await search.json()
  const existingId = files?.[0]?.id

  const meta = { name: 'glodac-oms-backup.json', mimeType: 'application/json' }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file',     new Blob([jsonStr],              { type: 'application/json' }))

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed: ' + res.status)
  return await res.json()
}

async function gdDownload(token) {
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='glodac-oms-backup.json' and trashed=false")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const { files } = await search.json()
  const fileId = files?.[0]?.id
  if (!fileId) throw new Error('No backup found in Google Drive')
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return await res.json()
}

// ── OneDrive helpers ──────────────────────────────────────────────────────────
async function odGetToken(clientId) {
  await loadScript('https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js', () => !!window.msal)
  const msalApp = new window.msal.PublicClientApplication({
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin + (window.location.pathname.startsWith('/operations') ? '/operations/' : '/'),
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await msalApp.initialize()
  const result = await msalApp.loginPopup({ scopes: ['Files.ReadWrite', 'User.Read'] })
  return result.accessToken
}

async function odUpload(token, jsonStr) {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/root:/GlodacOMS/glodac-oms-backup.json:/content',
    { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: jsonStr }
  )
  if (!res.ok) throw new Error('OneDrive upload failed: ' + res.status)
  return await res.json()
}

async function odDownload(token) {
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me/drive/root:/GlodacOMS/glodac-oms-backup.json:/content',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('No backup found in OneDrive')
  return await res.json()
}

// ── DigiBoxx helpers ──────────────────────────────────────────────────────────
async function dboxLogin(identifier, password) {
  const res = await fetch('https://dev.digiboxx.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  if (!res.ok) throw new Error('DigiBoxx login failed — check credentials')
  const d = await res.json()
  return d?.data?.auth_token || d?.token || d?.auth_token
}

async function dboxUpload(token, jsonStr) {
  const form = new FormData()
  form.append('file', new Blob([jsonStr], { type: 'application/json' }), 'glodac-oms-backup.json')
  const res = await fetch('https://dev.digiboxx.com/api/v1/file/upload', {
    method: 'POST',
    headers: { 'auth-token': token },
    body: form,
  })
  if (!res.ok) throw new Error('DigiBoxx upload failed: ' + res.status)
  return await res.json()
}

async function dboxDownload(token) {
  const listRes = await fetch('https://dev.digiboxx.com/api/v1/file/list', {
    headers: { 'auth-token': token },
  })
  if (!listRes.ok) throw new Error('Could not list DigiBoxx files')
  const listData = await listRes.json()
  const file = (listData?.data?.files || []).find(f => f.name === 'glodac-oms-backup.json')
  if (!file) throw new Error('No backup found in DigiBoxx')
  const dlRes = await fetch(`https://dev.digiboxx.com/api/v1/file/download/${file.id}`, {
    headers: { 'auth-token': token },
  })
  return await dlRes.json()
}

// ── tabs ──────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'profile',  label: 'Profile',        icon: User,     adminOnly: false },
  { id: 'security', label: 'Security',       icon: Lock,     adminOnly: false },
  { id: 'backup',   label: 'Backup',         icon: Database, adminOnly: false },
  { id: 'branding', label: 'Branding',       icon: Palette,  adminOnly: true  },
  { id: 'gmail',    label: 'Gmail API',      icon: Mail,     adminOnly: true  },
  { id: 'logs',     label: 'Session Logs',   icon: Shield,   adminOnly: true  },
]

const mockLogs = [
  { id: 1, user: 'Admin User',    ip: '192.168.1.100', device: 'Chrome / Windows', time: '2024-01-22 09:30:00', action: 'Login' },
  { id: 2, user: 'Rajesh Kumar',  ip: '192.168.1.101', device: 'Safari / iPhone',  time: '2024-01-22 08:15:00', action: 'Login' },
  { id: 3, user: 'Priya Sharma',  ip: '192.168.1.102', device: 'Chrome / macOS',   time: '2024-01-21 16:45:00', action: 'Login' },
  { id: 4, user: 'Admin User',    ip: '192.168.1.100', device: 'Chrome / Windows', time: '2024-01-21 09:00:00', action: 'Login' },
]

// ── service logos (inline SVG) ────────────────────────────────────────────────
const GoogleDriveLogo = () => (
  <svg viewBox="0 0 87.3 78" className="w-8 h-8">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
)

const OneDriveLogo = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8">
    <path d="M28.0 18.0C25.8 12.6 20.4 9 14.5 9 7.6 9 2 14.4 1.5 21.2 -1.3 22.3 -2 28 4 31h16l8-3z" fill="#0364b8"/>
    <path d="M30 18.7C31.3 18.2 32.6 18 34 18c6.6 0 12 5.4 12 12S40.6 42 34 42H16l14-4z" fill="#0078d4"/>
    <path d="M16 42h18l4-3-22-8z" fill="#1490df"/>
    <path d="M4 31c0 6.1 4.9 11 11 11h1l6-2-4-9z" fill="#28a8e8"/>
  </svg>
)

const DigiBoxxLogo = () => (
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
    <span className="text-white text-xs font-black">DB</span>
  </div>
)

// ── cloud service card ────────────────────────────────────────────────────────
function CloudServiceCard({ id, name, logo: Logo, configured, lastBackup, configFields, onBackup, onRestore, onConfigure, busy }) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState(configFields.reduce((a, f) => ({ ...a, [f.key]: '' }), {}))

  return (
    <div className={`glass-card overflow-hidden transition-all ${configured ? 'border-brand-primary/25' : ''}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Logo />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">{name}</p>
            <div className={`flex items-center gap-1.5 text-xs mt-0.5 ${configured ? 'text-emerald-400' : 'text-slate-500'}`}>
              {configured ? <Wifi size={10} /> : <WifiOff size={10} />}
              {configured ? 'Configured' : 'Not connected'}
            </div>
          </div>
        </div>

        {lastBackup && (
          <p className="text-[10px] text-slate-500 mb-3">Last backup: {new Date(lastBackup).toLocaleString()}</p>
        )}

        <div className="flex gap-2">
          {configured ? (
            <>
              <button
                onClick={onBackup}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-xs font-semibold hover:bg-brand-primary/25 disabled:opacity-50 transition-colors"
              >
                {busy === 'backup' ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                Backup
              </button>
              <button
                onClick={onRestore}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-dark-hover border border-dark-border text-slate-300 text-xs font-medium hover:text-white disabled:opacity-50 transition-colors"
              >
                {busy === 'restore' ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                Restore
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpen(o => !o)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-dark-hover border border-dark-border text-slate-300 text-xs font-medium hover:text-white transition-colors"
            >
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Configure
            </button>
          )}
          {configured && (
            <button
              onClick={() => setOpen(o => !o)}
              className="px-3 py-2 rounded-lg bg-dark-hover border border-dark-border text-slate-400 text-xs hover:text-white transition-colors"
              title="Edit credentials"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-dark-border p-4 bg-dark-bg/40 space-y-3 animate-fade-in">
          {configFields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">{f.label}</label>
              <input
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={fields[f.key]}
                onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-hover border border-dark-border rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:border-brand-primary/50 font-mono"
              />
              {f.hint && <p className="text-[10px] text-slate-600 mt-1">{f.hint}</p>}
            </div>
          ))}
          {configFields[0]?.helpUrl && (
            <a href={configFields[0].helpUrl} target="_blank" rel="noreferrer"
              className="text-[10px] text-brand-primary hover:underline flex items-center gap-1">
              <ExternalLink size={10} /> How to get credentials
            </a>
          )}
          <button
            onClick={() => { onConfigure(fields); setOpen(false) }}
            className="w-full py-2 rounded-lg bg-brand-primary text-dark-bg font-bold text-xs hover:bg-brand-primary/90 transition-colors"
          >
            <Check size={12} className="inline mr-1" /> Save &amp; Connect
          </button>
        </div>
      )}
    </div>
  )
}

// ── main settings page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, isAdmin, changePassword } = useAuth()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ name: user?.name || '', phone: '', email: user?.email || '' })
  const [pass, setPass] = useState({ current: '', new: '', confirm: '' })
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false })
  const [branding, setBranding] = useState({ company: 'Glodac Pharma LLP', portal: 'Glodac Pharma OMS', primaryColor: '#00e5ff', accentColor: '#00b8d4' })
  const [gmail, setGmail] = useState({ clientId: '', clientSecret: '', redirectUri: 'http://localhost:5000/auth/google/callback', fromEmail: '' })

  // backup state
  const [backupCfg, setBackupCfg] = useState(loadBackupCfg)
  const [busy, setBusy] = useState({}) // { gdrive: 'backup'|'restore', onedrive: ..., digiboxx: ... }
  const restoreRef = useRef()

  const dataSummary = getDataSummary()

  const updateCfg = (key, updates) => {
    const next = { ...backupCfg, [key]: { ...(backupCfg[key] || {}), ...updates } }
    setBackupCfg(next)
    saveBackupCfg(next)
  }

  // ── local backup ─────────────────────────────────────────────────────────
  const handleLocalDownload = () => {
    if (!dataSummary.hasData) { toast.error('No data to backup yet'); return }
    const json = JSON.stringify(collectBackup(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `glodac-oms-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    updateCfg('local', { lastBackup: new Date().toISOString() })
    toast.success('✅ Backup downloaded!')
  }

  const handleLocalRestore = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const backup = JSON.parse(e.target.result)
        const count = restoreBackup(backup)
        toast.success(`✅ ${count} data sets restored — reload the page to see changes`)
      } catch (err) {
        toast.error('Restore failed: ' + err.message)
      }
    }
    reader.readAsText(file)
    restoreRef.current.value = ''
  }

  // ── Google Drive ──────────────────────────────────────────────────────────
  const handleGDrive = async (action) => {
    const clientId = backupCfg.gdrive?.clientId
    if (!clientId) { toast.error('Configure Google Drive Client ID first'); return }
    setBusy(b => ({ ...b, gdrive: action }))
    try {
      const token = await gdGetToken(clientId)
      if (action === 'backup') {
        const json = JSON.stringify(collectBackup())
        await gdUpload(token, json)
        updateCfg('gdrive', { lastBackup: new Date().toISOString() })
        toast.success('✅ Backed up to Google Drive!')
      } else {
        const backup = await gdDownload(token)
        const count = restoreBackup(backup)
        toast.success(`✅ ${count} data sets restored from Google Drive — reload to apply`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(b => ({ ...b, gdrive: null }))
    }
  }

  // ── OneDrive ──────────────────────────────────────────────────────────────
  const handleOneDrive = async (action) => {
    const clientId = backupCfg.onedrive?.clientId
    if (!clientId) { toast.error('Configure OneDrive App ID first'); return }
    setBusy(b => ({ ...b, onedrive: action }))
    try {
      const token = await odGetToken(clientId)
      if (action === 'backup') {
        const json = JSON.stringify(collectBackup())
        await odUpload(token, json)
        updateCfg('onedrive', { lastBackup: new Date().toISOString() })
        toast.success('✅ Backed up to OneDrive!')
      } else {
        const backup = await odDownload(token)
        const count = restoreBackup(backup)
        toast.success(`✅ ${count} data sets restored from OneDrive — reload to apply`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(b => ({ ...b, onedrive: null }))
    }
  }

  // ── DigiBoxx ──────────────────────────────────────────────────────────────
  const handleDigiBoxx = async (action) => {
    const cfg = backupCfg.digiboxx
    if (!cfg?.identifier || !cfg?.password) { toast.error('Configure DigiBoxx credentials first'); return }
    setBusy(b => ({ ...b, digiboxx: action }))
    try {
      const token = await dboxLogin(cfg.identifier, cfg.password)
      if (action === 'backup') {
        const json = JSON.stringify(collectBackup())
        await dboxUpload(token, json)
        updateCfg('digiboxx', { lastBackup: new Date().toISOString() })
        toast.success('✅ Backed up to DigiBoxx!')
      } else {
        const backup = await dboxDownload(token)
        const count = restoreBackup(backup)
        toast.success(`✅ ${count} data sets restored from DigiBoxx — reload to apply`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(b => ({ ...b, digiboxx: null }))
    }
  }

  // ── pass strength ─────────────────────────────────────────────────────────
  const passStrength = p => {
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
  const handleSaveGmail    = () => toast.success('Gmail API configuration saved')

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={22} className="text-slate-400" /> Settings
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="glass-card p-2 space-y-1">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                    : 'text-slate-400 hover:text-white hover:bg-dark-hover'
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {t.adminOnly && (
                  <span className="ml-auto text-[9px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded font-semibold">
                    ADMIN
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <User size={17} className="text-brand-primary" /> Profile Information
              </h2>
              <div className="flex items-center gap-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="w-14 h-14 rounded-xl bg-brand-primary flex items-center justify-center text-[#0d1117] text-xl font-bold flex-shrink-0">
                  {user?.avatar}
                </div>
                <div>
                  <p className="font-bold text-white">{user?.name}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                  <p className="text-xs text-brand-primary mt-0.5 capitalize">
                    {user?.role}{user?.department ? ` — ${user.department}` : ''}
                  </p>
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

          {/* ── Security ── */}
          {tab === 'security' && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Lock size={17} className="text-brand-primary" /> Change Password
              </h2>
              <div className="space-y-4">
                {(['current', 'new', 'confirm']).map(key => (
                  <div key={key}>
                    <label className="label">
                      {key === 'current' ? 'Current Password' : key === 'new' ? 'New Password' : 'Confirm New Password'}
                    </label>
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
                      {[1, 2, 3, 4].map(i => (
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

          {/* ── Backup & Restore ── */}
          {tab === 'backup' && (
            <div className="space-y-5">
              {/* what's in the backup */}
              <div className="glass-card p-5">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <Database size={17} className="text-brand-primary" /> Data in This Device
                </h2>
                {dataSummary.hasData ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {dataSummary.items.map((item, i) => (
                        <div key={i} className="p-3 bg-dark-bg rounded-xl border border-dark-border text-center">
                          <p className="text-sm font-bold text-white">{item.value}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Total backup size: <span className="text-slate-300 font-medium">{dataSummary.size}</span></p>
                  </>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    No data uploaded yet. Use Sales Analysis or Distributor Ledger to upload data first.
                  </div>
                )}
              </div>

              {/* local backup */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <HardDrive size={18} className="text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Local Drive</h3>
                    <p className="text-xs text-slate-500">Download backup to your computer — works instantly, no login needed</p>
                  </div>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                    ✓ Ready
                  </span>
                </div>

                {backupCfg.local?.lastBackup && (
                  <p className="text-[10px] text-slate-500 mb-3">
                    Last backup: {new Date(backupCfg.local.lastBackup).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleLocalDownload}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-dark-bg font-bold text-sm hover:bg-brand-primary/90 transition-colors"
                  >
                    <Download size={14} /> Download Backup
                  </button>
                  <button
                    onClick={() => restoreRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dark-border text-slate-300 hover:text-white hover:bg-dark-hover text-sm font-medium transition-colors"
                  >
                    <Upload size={14} /> Restore from File
                  </button>
                  <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={e => handleLocalRestore(e.target.files?.[0])} />
                </div>
              </div>

              {/* cloud services */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Cloud Backup — Auto-sync</p>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 mb-4 flex items-start gap-2">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  Cloud services require a one-time setup — enter your app credentials below. Data is backed up directly from your browser to your personal cloud storage.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <CloudServiceCard
                    id="gdrive"
                    name="Google Drive"
                    logo={GoogleDriveLogo}
                    configured={!!backupCfg.gdrive?.clientId}
                    lastBackup={backupCfg.gdrive?.lastBackup}
                    busy={busy.gdrive}
                    onBackup={() => handleGDrive('backup')}
                    onRestore={() => handleGDrive('restore')}
                    onConfigure={f => updateCfg('gdrive', { clientId: f.clientId })}
                    configFields={[
                      {
                        key: 'clientId',
                        label: 'OAuth Client ID',
                        placeholder: '123456789-abc.apps.googleusercontent.com',
                        hint: 'From Google Cloud Console → APIs & Services → Credentials',
                        helpUrl: 'https://console.cloud.google.com/apis/credentials',
                      },
                    ]}
                  />

                  <CloudServiceCard
                    id="onedrive"
                    name="OneDrive"
                    logo={OneDriveLogo}
                    configured={!!backupCfg.onedrive?.clientId}
                    lastBackup={backupCfg.onedrive?.lastBackup}
                    busy={busy.onedrive}
                    onBackup={() => handleOneDrive('backup')}
                    onRestore={() => handleOneDrive('restore')}
                    onConfigure={f => updateCfg('onedrive', { clientId: f.clientId })}
                    configFields={[
                      {
                        key: 'clientId',
                        label: 'Application (Client) ID',
                        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                        hint: 'From Azure Portal → App registrations',
                        helpUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
                      },
                    ]}
                  />

                  <CloudServiceCard
                    id="digiboxx"
                    name="DigiBoxx"
                    logo={DigiBoxxLogo}
                    configured={!!(backupCfg.digiboxx?.identifier && backupCfg.digiboxx?.password)}
                    lastBackup={backupCfg.digiboxx?.lastBackup}
                    busy={busy.digiboxx}
                    onBackup={() => handleDigiBoxx('backup')}
                    onRestore={() => handleDigiBoxx('restore')}
                    onConfigure={f => updateCfg('digiboxx', { identifier: f.identifier, password: f.password })}
                    configFields={[
                      {
                        key: 'identifier',
                        label: 'DigiBoxx Username / Mobile',
                        placeholder: 'user@example.com',
                        helpUrl: 'https://digiboxx.com',
                      },
                      {
                        key: 'password',
                        label: 'Password',
                        type: 'password',
                        placeholder: '••••••••',
                        hint: 'Your DigiBoxx account password — stored only in this browser',
                      },
                    ]}
                  />

                </div>
              </div>

              {/* setup guides */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Cloud Setup Quick Guide</h3>
                <div className="space-y-4 text-xs text-slate-400">
                  <div>
                    <p className="font-semibold text-white mb-1">Google Drive</p>
                    <ol className="space-y-0.5 list-decimal list-inside text-slate-500">
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">console.cloud.google.com</a> → Create Project</li>
                      <li>Enable <strong className="text-slate-400">Google Drive API</strong></li>
                      <li>Create Credentials → OAuth 2.0 Client → Web Application</li>
                      <li>Add <code className="bg-dark-bg px-1 rounded">https://pulss.co.in</code> to Authorized JavaScript Origins</li>
                      <li>Copy the Client ID → paste above</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">OneDrive</p>
                    <ol className="space-y-0.5 list-decimal list-inside text-slate-500">
                      <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">portal.azure.com</a> → App registrations → New</li>
                      <li>Set Redirect URI type to <strong className="text-slate-400">Single-page application</strong></li>
                      <li>Add <code className="bg-dark-bg px-1 rounded">https://pulss.co.in/operations/</code> as Redirect URI</li>
                      <li>Copy the Application (Client) ID → paste above</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">DigiBoxx</p>
                    <p className="text-slate-500">Sign up at <a href="https://digiboxx.com" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">digiboxx.com</a> and enter your login credentials above. Backup is saved as <code className="bg-dark-bg px-1 rounded">glodac-oms-backup.json</code> in your DigiBoxx storage.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Branding (Admin) ── */}
          {tab === 'branding' && isAdmin && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Palette size={17} className="text-brand-primary" /> White-Label Branding
              </h2>
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
                ℹ️ Color changes apply across the portal after saving. A full reload may be needed.
              </div>
              <button onClick={handleSaveBranding} className="btn-primary"><CheckCircle size={15} /> Save Branding</button>
            </div>
          )}

          {/* ── Gmail API (Admin) ── */}
          {tab === 'gmail' && isAdmin && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Mail size={17} className="text-brand-primary" /> Gmail API Configuration
              </h2>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                ⚠️ Configure Google Cloud OAuth 2.0 credentials to enable email sending for quote requests.
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

          {/* ── Session Logs (Admin) ── */}
          {tab === 'logs' && isAdmin && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-border">
                <h2 className="section-title"><Shield size={17} className="text-brand-primary" /> Session &amp; Login Logs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="table-header">User</th>
                      <th className="table-header">IP Address</th>
                      <th className="table-header">Device / Browser</th>
                      <th className="table-header">Action</th>
                      <th className="table-header">Timestamp</th>
                    </tr>
                  </thead>
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
