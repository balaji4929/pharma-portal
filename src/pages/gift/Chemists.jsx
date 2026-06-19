import React, { useState } from 'react'
import { Users, Plus, Search, Phone, MapPin, Star, TrendingUp, ChevronRight, X, Eye, BookOpen, Download } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import ChemistLedger from './ChemistLedger'
import { exportToExcel } from '../../utils/exportUtils'

const emptyForm = { name: '', shop: '', dlNo: '', phone: '', territory: '', zone: '', rep: '', status: 'active' }

export default function Chemists() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(null)
  const [ledgerChemist, setLedgerChemist] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.chemists.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.shop?.toLowerCase().includes(search.toLowerCase()) ||
    c.territory?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!form.name || !form.shop) { toast.error('Name and shop required'); return }
    addItem('chemists', { ...form, totalPurchase: 0, activeSchemes: 0 })
    toast.success('Chemist added')
    setShowModal(false)
    setForm(emptyForm)
  }

  const getChemistSchemes = (id) => data.schemes.filter(s => s.enrolled?.includes(id))
  const getChemistInvoices = (id) => data.distributorInvoices.filter(i => i.chemistId === id)
  const getChemistGifts = (id) => data.giftFulfillments.filter(g => g.chemistId === id)

  const getSchemeProgress = (chemistId, scheme) => {
    const invoices = getChemistInvoices(chemistId).filter(i => i.schemeId === scheme.id)
    const total = invoices.reduce((s, i) => s + i.amount, 0)
    const maxSlab = scheme.slabs[scheme.slabs.length - 1]
    const pct = Math.min(100, Math.round((total / maxSlab.min) * 100))
    const qualified = scheme.slabs.find(sl => total >= sl.min)
    return { total, pct, qualified }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Users size={22} className="text-emerald-400" /> Chemists</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data.chemists.length} enrolled chemists</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToExcel(data.chemists.map(c => ({ Name: c.name, Shop: c.shop || c.shop_name, Phone: c.phone, Territory: c.territory, Zone: c.zone, Rep: c.rep || c.assigned_rep, 'Total Purchase': c.totalPurchase, Status: c.status })), 'chemists')} className="btn-ghost flex items-center gap-1.5 text-sm"><Download size={14} /> Excel</button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Add Chemist</button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search chemists..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="glass-card p-5 hover:border-slate-600 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-sm text-slate-400">{c.shop}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="space-y-1.5 text-xs text-slate-400 mb-4">
              <div className="flex items-center gap-2"><Phone size={11} /> {c.phone}</div>
              <div className="flex items-center gap-2"><MapPin size={11} /> {c.territory}, {c.zone}</div>
              <div className="flex items-center gap-2"><Star size={11} /> DL: {c.dlNo}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-dark-bg rounded-lg">
              <div className="text-center">
                <p className="text-base font-bold text-white">₹{(c.totalPurchase/1000).toFixed(0)}K</p>
                <p className="text-[10px] text-slate-500">Total Purchase</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white">{c.activeSchemes}</p>
                <p className="text-[10px] text-slate-500">Active Schemes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProfile(c)} className="flex-1 btn-secondary justify-center py-1.5 text-xs">
                <Eye size={13} /> 360° Profile
              </button>
              <button onClick={() => setLedgerChemist(c)} className="flex-1 btn-primary justify-center py-1.5 text-xs">
                <BookOpen size={13} /> Ledger
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Chemist">
        <div className="form-grid">
          <div>
            <label className="label">Chemist / Owner Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Dr. Anil Verma" />
          </div>
          <div>
            <label className="label">Shop Name *</label>
            <input value={form.shop} onChange={e => setForm(f => ({ ...f, shop: e.target.value }))} className="input-field" placeholder="Verma Medical Store" />
          </div>
          <div>
            <label className="label">Drug License No.</label>
            <input value={form.dlNo} onChange={e => setForm(f => ({ ...f, dlNo: e.target.value }))} className="input-field" placeholder="MH-BOM-DL-12345" />
          </div>
          <div>
            <label className="label">Contact Number</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="9876543210" />
          </div>
          <div>
            <label className="label">Territory</label>
            <input value={form.territory} onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} className="input-field" placeholder="Andheri West" />
          </div>
          <div>
            <label className="label">Zone</label>
            <input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="input-field" placeholder="Mumbai North" />
          </div>
          <div>
            <label className="label">Assigned Rep</label>
            <input value={form.rep} onChange={e => setForm(f => ({ ...f, rep: e.target.value }))} className="input-field" placeholder="Rajesh Kumar" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Add Chemist</button>
        </div>
      </Modal>

      {/* 360° Profile Modal */}
      {showProfile && (
        <Modal open={!!showProfile} onClose={() => setShowProfile(null)} title={`${showProfile.name} — 360° Profile`} size="xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap gap-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
              <div className="flex-1">
                <p className="text-xl font-bold text-white">{showProfile.shop}</p>
                <p className="text-slate-400 text-sm">{showProfile.name} · {showProfile.phone}</p>
                <p className="text-slate-400 text-sm">{showProfile.territory}, {showProfile.zone}</p>
                <p className="text-xs text-slate-500 mt-1">DL: {showProfile.dlNo} · Rep: {showProfile.rep}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">₹{(showProfile.totalPurchase).toLocaleString('en-IN')}</p>
                <p className="text-sm text-slate-400">Total Lifetime Purchase</p>
              </div>
            </div>

            {/* Active Schemes with progress */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Star size={15} className="text-pink-400" /> Active Schemes</h4>
              <div className="space-y-3">
                {getChemistSchemes(showProfile.id).length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4 bg-dark-bg rounded-lg">Not enrolled in any scheme</p>
                ) : getChemistSchemes(showProfile.id).map(s => {
                  const prog = getSchemeProgress(showProfile.id, s)
                  return (
                    <div key={s.id} className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{s.name}</p>
                          <p className="text-xs text-slate-400">Valid until {s.endDate}</p>
                        </div>
                        {prog.qualified && (
                          <span className="badge-success">✓ {prog.qualified.gift}</span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {s.slabs.map((sl, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">Slab {i+1}: ₹{sl.min.toLocaleString('en-IN')}+ → {sl.gift}</span>
                              <span className={prog.total >= sl.min ? 'text-emerald-400' : 'text-slate-500'}>
                                ₹{prog.total.toLocaleString('en-IN')} / ₹{sl.min.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${Math.min(100, (prog.total/sl.min)*100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp size={15} className="text-blue-400" /> Purchase History</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-dark-border">
                    <th className="table-header">Invoice No.</th>
                    <th className="table-header">Distributor</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Amount</th>
                  </tr></thead>
                  <tbody>
                    {getChemistInvoices(showProfile.id).map(inv => (
                      <tr key={inv.id} className="table-row">
                        <td className="table-cell font-mono text-xs text-blue-400">{inv.invoiceNo}</td>
                        <td className="table-cell">{inv.distributor}</td>
                        <td className="table-cell text-xs text-slate-400">{inv.date}</td>
                        <td className="table-cell font-semibold text-emerald-400">₹{inv.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {getChemistInvoices(showProfile.id).length === 0 && (
                      <tr><td colSpan={4} className="text-center py-4 text-slate-500 text-sm">No invoices recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gift fulfillments */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp size={15} className="text-pink-400" /> Gift History</h4>
              <div className="space-y-2">
                {getChemistGifts(showProfile.id).map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
                    <div>
                      <p className="text-sm text-white font-medium">{g.gift}</p>
                      <p className="text-xs text-slate-400">{g.scheme}</p>
                    </div>
                    <span className={`badge ${g.status === 'delivered' ? 'badge-success' : g.status === 'dispatched' ? 'badge-info' : 'badge-warning'}`}>{g.status}</span>
                  </div>
                ))}
                {getChemistGifts(showProfile.id).length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-3 bg-dark-bg rounded-lg">No gift records</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Chemist Ledger Modal */}
      {ledgerChemist && (
        <ChemistLedger chemist={ledgerChemist} onClose={() => setLedgerChemist(null)} />
      )}
    </div>
  )
}
