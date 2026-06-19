import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Package, CheckCircle, Clock, Plus, BarChart2,
  IndianRupee, Weight, Box, AlertTriangle, RefreshCw
} from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || '/api'
function getToken() {
  try { return JSON.parse(localStorage.getItem('pharma_user') || '{}').token } catch { return null }
}
const fmt = n => `₹${parseFloat(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const today = () => new Date().toISOString().split('T')[0]
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—'

const TRANSPORTERS = ['Delhivery', 'Bluedart', 'Vtrans', 'DTDC', 'FedEx', 'Ecom Express', 'XpressBees', 'Other']

const STATUS_COLORS = {
  packed:     'bg-amber-100 text-amber-700 border-amber-200',
  dispatched: 'bg-blue-100 text-blue-700 border-blue-200',
  delivered:  'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function LogisticsDashboard() {
  const navigate = useNavigate()
  const [entries, setEntries]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [editEntry, setEditEntry] = useState(null)   // entry to add docket / update
  const [filterDate, setFilterDate] = useState(today())
  const [filterStatus, setFilterStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${getToken()}` }
      const params = new URLSearchParams()
      if (filterDate)   params.set('date',   filterDate)
      if (filterStatus) params.set('status', filterStatus)

      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`${BASE}/logistics?${params}`, { headers }),
        fetch(`${BASE}/logistics/summary`, { headers }),
      ])
      setEntries(await entriesRes.json())
      setSummary(await summaryRes.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterDate, filterStatus])

  const stats = summary ? [
    { label: "Today's Invoices",   value: summary.total_invoices || 0,          icon: Package,       color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
    { label: 'Invoice Value',       value: fmt(summary.total_value),              icon: IndianRupee,   color: 'text-emerald-600',   bg: 'bg-emerald-50' },
    { label: 'Dispatched Today',    value: summary.dispatched || 0,              icon: Truck,         color: 'text-blue-600',      bg: 'bg-blue-50' },
    { label: 'Pending Dispatch',    value: summary.packed_pending || 0,          icon: Clock,         color: 'text-amber-600',     bg: 'bg-amber-50' },
    { label: 'Transport Cost',      value: fmt(summary.total_transport_cost),    icon: IndianRupee,   color: 'text-red-600',       bg: 'bg-red-50' },
    { label: 'Total Boxes',         value: summary.total_boxes || 0,             icon: Box,           color: 'text-violet-600',    bg: 'bg-violet-50' },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-[#1e2820] flex items-center gap-3">
            <Truck className="text-brand-primary" size={26} /> Logistics
          </h1>
          <p className="text-[#7a8875] text-sm mt-1">Invoice packing → dispatch → docket tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={15} /> Add Packing Entry
          </button>
        </div>
      </div>

      {/* Summary stats (today) */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(s => (
            <div key={s.label} className="glass-card p-4 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#8a9885]">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div>
          <label className="label">Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input-field w-40" />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-36">
            <option value="">All</option>
            <option value="packed">Packed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <button onClick={() => { setFilterDate(''); setFilterStatus('') }} className="btn-ghost text-xs mt-4">
          Clear filters
        </button>
        <span className="text-xs text-[#8a9885] mt-4">{entries.length} entries</span>
      </div>

      {/* Entries table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                {['Invoice No', 'Date', 'Value', 'Boxes', 'Wt (kg)', 'Packed By', 'Checked By', 'Time', 'Transporter', 'Status', 'Docket No', 'Actions'].map(h => (
                  <th key={h} className="table-header whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-10 text-[#8a9885]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                </td></tr>
              ) : !entries.length ? (
                <tr><td colSpan={12} className="text-center py-12 text-[#8a9885]">
                  <Package size={28} className="mx-auto mb-2 opacity-30" />
                  <p>No entries for selected filter</p>
                </td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-brand-primary">{e.invoice_no}</td>
                  <td className="table-cell whitespace-nowrap">{fmtDate(e.invoice_date)}</td>
                  <td className="table-cell font-medium text-emerald-600">{fmt(e.invoice_value)}</td>
                  <td className="table-cell text-center">{e.boxes_packed}</td>
                  <td className="table-cell text-center">{e.approx_weight_kg}</td>
                  <td className="table-cell">{e.packed_by || '—'}</td>
                  <td className="table-cell">{e.checked_by || '—'}</td>
                  <td className="table-cell whitespace-nowrap">{e.check_time ? e.check_time.slice(0,5) : '—'}</td>
                  <td className="table-cell">{e.transporter || '—'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[e.status] || ''}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    {e.docket_no ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[#3d4a3a]">{e.docket_no}</span>
                        {e.tracking_url && (
                          <a href={e.tracking_url} target="_blank" rel="noreferrer"
                            className="text-brand-primary hover:underline text-xs flex items-center gap-0.5">
                            Track ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-amber-500 text-xs">Pending docket</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <button onClick={() => setEditEntry(e)}
                      className="text-xs text-brand-primary hover:underline font-medium">
                      {e.status === 'packed' ? '+ Docket' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Packing Entry Modal */}
      {showAdd && <PackingModal onClose={() => setShowAdd(false)} onSaved={load} />}

      {/* Edit / Docket Modal */}
      {editEntry && <DocketModal entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load() }} />}
    </div>
  )
}

// ── Packing Entry Modal ────────────────────────────────────────────────────────
function PackingModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    invoiceNo: '', invoiceDate: today(), invoiceValue: '',
    boxesPacked: '', approxWeightKg: '',
    packedBy: '', checkedBy: '', checkTime: '',
    transporter: '', trackingUrl: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.invoiceNo || !form.invoiceDate) { setError('Invoice number and date are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`${BASE}/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          invoiceNo: form.invoiceNo, invoiceDate: form.invoiceDate,
          invoiceValue: parseFloat(form.invoiceValue) || 0,
          boxesPacked: parseInt(form.boxesPacked) || 0,
          approxWeightKg: parseFloat(form.approxWeightKg) || 0,
          packedBy: form.packedBy, checkedBy: form.checkedBy,
          checkTime: form.checkTime || null,
          transporter: form.transporter, trackingUrl: form.trackingUrl,
          notes: form.notes,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
      onClose()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-dark-border">
          <h2 className="font-bold text-[#1e2820] text-lg flex items-center gap-2"><Package size={18} className="text-brand-primary" /> New Packing Entry</h2>
          <p className="text-xs text-[#8a9885] mt-1">Enter packing details same day as invoicing</p>
        </div>
        <div className="p-5 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="label">Invoice No *</label>
              <input value={form.invoiceNo} onChange={set('invoiceNo')} className="input-field" placeholder="INV-001" />
            </div>
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={set('invoiceDate')} className="input-field" />
            </div>
            <div>
              <label className="label">Invoice Value (₹)</label>
              <input type="number" value={form.invoiceValue} onChange={set('invoiceValue')} className="input-field" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Boxes Packed</label>
              <input type="number" value={form.boxesPacked} onChange={set('boxesPacked')} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Approx Weight (kg)</label>
              <input type="number" step="0.1" value={form.approxWeightKg} onChange={set('approxWeightKg')} className="input-field" placeholder="0.0" />
            </div>
            <div>
              <label className="label">Packed By</label>
              <input value={form.packedBy} onChange={set('packedBy')} className="input-field" placeholder="Name" />
            </div>
            <div>
              <label className="label">Checked By</label>
              <input value={form.checkedBy} onChange={set('checkedBy')} className="input-field" placeholder="Name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Check Time (for CCTV)</label>
              <input type="time" value={form.checkTime} onChange={set('checkTime')} className="input-field" />
            </div>
            <div>
              <label className="label">Transporter</label>
              <select value={form.transporter} onChange={set('transporter')} className="input-field">
                <option value="">Select transporter</option>
                {TRANSPORTERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tracking URL</label>
              <input value={form.trackingUrl} onChange={set('trackingUrl')} className="input-field" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input value={form.notes} onChange={set('notes')} className="input-field" placeholder="Any remarks..." />
          </div>
        </div>
        <div className="p-5 border-t border-dark-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Docket / Status Update Modal ───────────────────────────────────────────────
function DocketModal({ entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    dispatchDate: entry.dispatch_date?.split('T')[0] || today(),
    docketNo: entry.docket_no || '',
    transportCost: entry.transport_cost || '',
    status: entry.status || 'dispatched',
    deliveryDate: entry.delivery_date?.split('T')[0] || '',
    trackingUrl: entry.tracking_url || '',
    notes: entry.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`${BASE}/logistics/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          dispatchDate: form.dispatchDate || null,
          docketNo: form.docketNo || null,
          transportCost: parseFloat(form.transportCost) || null,
          status: form.status,
          deliveryDate: form.deliveryDate || null,
          trackingUrl: form.trackingUrl || null,
          notes: form.notes || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-5 border-b border-dark-border">
          <h2 className="font-bold text-[#1e2820] text-base flex items-center gap-2">
            <Truck size={16} className="text-brand-primary" /> Update Dispatch — {entry.invoice_no}
          </h2>
          <p className="text-xs text-[#8a9885] mt-1">
            {entry.transporter} · {entry.boxes_packed} boxes · {entry.approx_weight_kg} kg
          </p>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dispatch Date</label>
              <input type="date" value={form.dispatchDate} onChange={set('dispatchDate')} className="input-field" />
            </div>
            <div>
              <label className="label">Docket Number</label>
              <input value={form.docketNo} onChange={set('docketNo')} className="input-field" placeholder="DKT-12345" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Transport Cost (₹)</label>
              <input type="number" value={form.transportCost} onChange={set('transportCost')} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={set('status')} className="input-field">
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {form.status === 'delivered' && (
            <div>
              <label className="label">Delivery Date</label>
              <input type="date" value={form.deliveryDate} onChange={set('deliveryDate')} className="input-field" />
            </div>
          )}

          <div>
            <label className="label">Tracking URL</label>
            <div className="flex gap-2">
              <input value={form.trackingUrl} onChange={set('trackingUrl')} className="input-field" placeholder="https://..." />
              {form.trackingUrl && (
                <a href={form.trackingUrl} target="_blank" rel="noreferrer"
                  className="btn-secondary text-xs px-3 whitespace-nowrap">
                  Open ↗
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input value={form.notes} onChange={set('notes')} className="input-field" placeholder="Any remarks..." />
          </div>
        </div>
        <div className="p-5 border-t border-dark-border flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  )
}
