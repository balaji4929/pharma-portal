/**
 * GiftDispatch — Dispatch invoice management
 * One invoice per distributor, multiple chemists + gifts per invoice
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, ChevronDown, Search, Package, FileText,
  CheckCircle, Truck, AlertTriangle, Download, Eye,
  ChevronRight, Edit3, Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useApp } from '../../contexts/AppContext'
import { exportToExcel } from '../../utils/exportUtils'

const BASE = import.meta.env.VITE_API_URL || '/api'
function getToken() {
  try { return JSON.parse(localStorage.getItem('pharma_user') || '{}').token } catch { return null }
}

const STATUS_COLORS = {
  dispatched: 'bg-blue-500/20 text-blue-400',
  delivered:  'bg-emerald-500/20 text-emerald-400',
  returned:   'bg-amber-500/20 text-amber-400',
  damaged:    'bg-red-500/20 text-red-400',
  partial:    'bg-violet-500/20 text-violet-400',
}

// ── New Dispatch Form ──────────────────────────────────────────────────────────
function NewDispatchModal({ chemists, articles, schemes, onClose, onSaved }) {
  const [invoiceNo, setInvoiceNo]       = useState('')
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [distributor, setDistributor]   = useState('')
  const [notes, setNotes]               = useState('')
  const [items, setItems]               = useState([])
  const [saving, setSaving]             = useState(false)
  const [chemistSearch, setChemistSearch] = useState('')

  const filteredChemists = useMemo(() =>
    chemists.filter(c => !chemistSearch || c.name?.toLowerCase().includes(chemistSearch.toLowerCase()) || c.shop?.toLowerCase().includes(chemistSearch.toLowerCase())),
    [chemists, chemistSearch]
  )

  const addItem = (chemist) => {
    if (items.find(i => i.chemistId === chemist.id)) return
    setItems(prev => [...prev, {
      chemistId: chemist.id, chemistName: chemist.name, shop: chemist.shop || chemist.shop_name,
      giftArticleId: '', schemeId: '', qtyDispatched: 1,
    }])
    setChemistSearch('')
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const handleSave = async () => {
    if (!invoiceNo) return toast.error('Invoice number required')
    if (!distributor) return toast.error('Distributor name required')
    const invalid = items.find(i => !i.giftArticleId || !i.qtyDispatched)
    if (invalid) return toast.error('All items need a gift article and quantity')
    if (!items.length) return toast.error('Add at least one chemist')

    setSaving(true)
    try {
      await fetch(`${BASE}/gift/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          invoiceNo, dispatchDate, distributorName: distributor, notes,
          items: items.map(i => ({
            chemistId: i.chemistId, giftArticleId: i.giftArticleId,
            schemeId: i.schemeId || null, qtyDispatched: parseInt(i.qtyDispatched) || 1,
          }))
        })
      }).then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        return d
      })
      toast.success('Dispatch invoice created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <h3 className="font-bold text-white">New Dispatch Invoice</h3>
          <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Invoice details */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Invoice No *</label>
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="DISP-001" className="input-field" />
            </div>
            <div>
              <label className="form-label">Dispatch Date</label>
              <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="form-label">Distributor Name *</label>
              <input value={distributor} onChange={e => setDistributor(e.target.value)} placeholder="National Distributors" className="input-field" />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="input-field" />
          </div>

          {/* Add chemist */}
          <div>
            <label className="form-label">Add Chemists</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={chemistSearch}
                onChange={e => setChemistSearch(e.target.value)}
                placeholder="Search chemist by name or shop..."
                className="input-field pl-8"
              />
              {chemistSearch && filteredChemists.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
                  {filteredChemists.slice(0, 20).map(c => (
                    <button key={c.id} onClick={() => addItem(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-dark-hover text-sm flex items-center justify-between group">
                      <div>
                        <p className="text-white font-medium text-xs">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.shop || c.shop_name} · {c.territory}</p>
                      </div>
                      <Plus size={12} className="text-brand-primary opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium">{items.length} chemist{items.length !== 1 ? 's' : ''} added</p>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-dark-hover rounded-xl p-3 border border-dark-border/50">
                    <div className="col-span-3">
                      <p className="text-xs font-medium text-white truncate">{item.chemistName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.shop}</p>
                    </div>
                    <select
                      value={item.giftArticleId}
                      onChange={e => updateItem(idx, 'giftArticleId', e.target.value)}
                      className="input-field text-xs py-1.5 col-span-3"
                    >
                      <option value="">Select Gift *</option>
                      {articles.map(a => <option key={a.id} value={a.id}>{a.name} ({a.available ?? '?'} avail)</option>)}
                    </select>
                    <select
                      value={item.schemeId}
                      onChange={e => updateItem(idx, 'schemeId', e.target.value)}
                      className="input-field text-xs py-1.5 col-span-3"
                    >
                      <option value="">No Scheme</option>
                      {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input
                      type="number" min="1"
                      value={item.qtyDispatched}
                      onChange={e => updateItem(idx, 'qtyDispatched', e.target.value)}
                      className="input-field text-xs py-1.5 col-span-2"
                      placeholder="Qty"
                    />
                    <button onClick={() => removeItem(idx)} className="col-span-1 p-1.5 hover:bg-dark-card rounded text-slate-400 hover:text-red-400 transition flex items-center justify-center">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-dark-border">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Create Dispatch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invoice Detail / Update Status ────────────────────────────────────────────
function InvoiceDetail({ invoiceId, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // item id being edited

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${BASE}/gift/dispatches/${invoiceId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      setDetail(await r.json())
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [invoiceId])

  const updateItemStatus = async (item, updates) => {
    try {
      await fetch(`${BASE}/gift/dispatches/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(updates),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      toast.success('Updated')
      load(); onUpdated?.()
      setEditing(null)
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h3 className="font-bold text-white">{detail?.invoice?.invoice_no || 'Loading...'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{detail?.invoice?.distributor_name} · {detail?.invoice?.dispatch_date ? new Date(detail.invoice.dispatch_date).toLocaleDateString('en-IN') : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportToExcel(detail?.items?.map(i => ({
              Chemist: i.chemist_name, Shop: i.shop_name, Gift: i.gift_name,
              Dispatched: i.qty_dispatched, Delivered: i.qty_delivered, Returned: i.qty_returned, Damaged: i.qty_damaged, Status: i.status
            })) || [], detail?.invoice?.invoice_no)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Download size={12} /> Excel
            </button>
            <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg text-slate-400"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </div>
          ) : !detail?.items?.length ? (
            <p className="text-center text-slate-400 py-12">No items found</p>
          ) : (
            <div className="space-y-2">
              {detail.items.map(item => {
                const isEditing = editing === item.id
                return (
                  <div key={item.id} className="bg-dark-hover rounded-xl border border-dark-border/50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Package size={14} className="text-brand-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white">{item.chemist_name}</p>
                          <p className="text-[10px] text-slate-400">{item.shop_name} · {item.gift_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] text-slate-400 text-right">
                          <span className="text-white">{item.qty_dispatched}</span> dispatched ·{' '}
                          <span className="text-emerald-400">{item.qty_delivered}</span> delivered ·{' '}
                          <span className="text-amber-400">{item.qty_returned}</span> returned ·{' '}
                          <span className="text-red-400">{item.qty_damaged}</span> damaged
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || STATUS_COLORS.dispatched}`}>{item.status}</span>
                        <button onClick={() => setEditing(isEditing ? null : item.id)} className="p-1.5 hover:bg-dark-card rounded text-slate-400 hover:text-brand-primary">
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </div>

                    {isEditing && <ItemUpdateForm item={item} onSave={updates => updateItemStatus(item, updates)} onCancel={() => setEditing(null)} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ItemUpdateForm({ item, onSave, onCancel }) {
  const [status, setStatus]       = useState(item.status || 'dispatched')
  const [delivered, setDelivered] = useState(item.qty_delivered ?? 0)
  const [returned, setReturned]   = useState(item.qty_returned ?? 0)
  const [damaged, setDamaged]     = useState(item.qty_damaged ?? 0)
  const [date, setDate]           = useState(item.delivered_date?.slice(0, 10) || '')
  const [notes, setNotes]         = useState(item.notes || '')

  return (
    <div className="border-t border-dark-border px-4 py-3 bg-dark-card/50 grid grid-cols-6 gap-2 items-end">
      <select value={status} onChange={e => setStatus(e.target.value)} className="input-field text-xs py-1.5 col-span-1">
        <option value="dispatched">Dispatched</option>
        <option value="delivered">Delivered</option>
        <option value="partial">Partial</option>
        <option value="returned">Returned</option>
        <option value="damaged">Damaged</option>
      </select>
      <div className="col-span-1">
        <label className="text-[10px] text-slate-400 mb-0.5 block">Delivered</label>
        <input type="number" min="0" max={item.qty_dispatched} value={delivered} onChange={e => setDelivered(e.target.value)} className="input-field text-xs py-1.5" />
      </div>
      <div className="col-span-1">
        <label className="text-[10px] text-slate-400 mb-0.5 block">Returned</label>
        <input type="number" min="0" value={returned} onChange={e => setReturned(e.target.value)} className="input-field text-xs py-1.5" />
      </div>
      <div className="col-span-1">
        <label className="text-[10px] text-slate-400 mb-0.5 block">Damaged</label>
        <input type="number" min="0" value={damaged} onChange={e => setDamaged(e.target.value)} className="input-field text-xs py-1.5" />
      </div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field text-xs py-1.5 col-span-1" />
      <div className="col-span-1 flex gap-1">
        <button onClick={() => onSave({ status, qtyDelivered: +delivered, qtyReturned: +returned, qtyDamaged: +damaged, deliveredDate: date || null, notes })}
          className="flex-1 btn-primary text-xs py-1.5">Save</button>
        <button onClick={onCancel} className="btn-ghost text-xs py-1.5 px-2"><X size={12} /></button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function GiftDispatch() {
  const { data } = useApp()
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showNew, setShowNew]       = useState(false)
  const [viewId, setViewId]         = useState(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${BASE}/gift/dispatches`, { headers: { Authorization: `Bearer ${getToken()}` } })
      setDispatches(await r.json())
    } catch { toast.error('Failed to load dispatches') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = dispatches
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter)
    if (search) list = list.filter(d =>
      d.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
      d.distributor_name?.toLowerCase().includes(search.toLowerCase())
    )
    return list
  }, [dispatches, search, statusFilter])

  const exportAll = () => {
    exportToExcel(
      dispatches.map(d => ({
        'Invoice No': d.invoice_no, 'Date': d.dispatch_date, 'Distributor': d.distributor_name,
        'Total Items': d.total_items, 'Status': d.status
      })),
      'gift_dispatches'
    )
  }

  const totalStats = {
    total: dispatches.length,
    dispatched: dispatches.filter(d => d.status === 'dispatched').length,
    delivered: dispatches.filter(d => d.status === 'delivered').length,
    items: dispatches.reduce((s, d) => s + (d.total_items || 0), 0),
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Gift Dispatch Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track gift shipments from company → distributor → chemist</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAll} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> New Dispatch
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: totalStats.total, color: 'text-white', icon: FileText },
          { label: 'In Transit', value: totalStats.dispatched, color: 'text-blue-400', icon: Truck },
          { label: 'Delivered', value: totalStats.delivered, color: 'text-emerald-400', icon: CheckCircle },
          { label: 'Total Gift Items', value: totalStats.items, color: 'text-brand-primary', icon: Package },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center">
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice / distributor..." className="input-field pl-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm">
          <option value="all">All Status</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="partial">Partial</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card flex items-center justify-center h-48 text-slate-400">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mr-3" /> Loading...
        </div>
      ) : !filtered.length ? (
        <div className="glass-card text-center py-16 text-slate-400">
          <Truck size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search || statusFilter !== 'all' ? 'No results found' : 'No dispatch invoices yet — create the first one'}</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  {['Invoice No', 'Date', 'Distributor', 'Items', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-dark-border/50 hover:bg-dark-hover/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">{d.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{d.distributor_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full text-xs font-medium">{d.total_items}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || STATUS_COLORS.dispatched}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewId(d.id)} className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-primary/80 transition">
                        <Eye size={12} /> View / Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <NewDispatchModal
          chemists={data.chemists}
          articles={data.giftArticles}
          schemes={data.schemes}
          onClose={() => setShowNew(false)}
          onSaved={load}
        />
      )}

      {viewId && (
        <InvoiceDetail
          invoiceId={viewId}
          onClose={() => setViewId(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
