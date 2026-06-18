import React, { useState } from 'react'
import { FileText, Plus, Upload, Search } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const emptyForm = {
  chemistId: '', invoiceNo: '', distributor: '', date: new Date().toISOString().split('T')[0],
  amount: '', qty: '', schemeId: ''
}

export default function DataEntry() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.distributorInvoices.filter(i =>
    i.chemist?.toLowerCase().includes(search.toLowerCase()) ||
    i.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    i.distributor?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = () => {
    if (!form.chemistId || !form.invoiceNo || !form.amount) {
      toast.error('Chemist, invoice no. and amount required')
      return
    }
    const chemist = data.chemists.find(c => c.id === parseInt(form.chemistId))
    addItem('distributorInvoices', {
      ...form,
      chemistId: parseInt(form.chemistId),
      chemist: chemist?.name,
      amount: parseFloat(form.amount),
      qty: parseInt(form.qty) || 0,
      schemeId: parseInt(form.schemeId) || null,
      enteredBy: 'Current User',
    })
    // Update chemist total purchase
    updateItem('chemists', parseInt(form.chemistId), {
      totalPurchase: (chemist?.totalPurchase || 0) + parseFloat(form.amount)
    })
    toast.success('Invoice recorded')
    setShowModal(false)
    setForm(emptyForm)
  }

  const totalAmount = data.distributorInvoices.reduce((s, i) => s + i.amount, 0)
  const totalCount = data.distributorInvoices.length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={22} className="text-indigo-400" /> Data Entry</h1>
          <p className="text-slate-400 text-sm mt-0.5">Log distributor invoices for scheme tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Upload size={15} /> Bulk Upload</button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Add Invoice</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><FileText size={20} className="text-indigo-400" /></div>
          <div><p className="text-2xl font-bold text-white">{totalCount}</p><p className="text-xs text-slate-400">Total Invoices</p></div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><FileText size={20} className="text-emerald-400" /></div>
          <div><p className="text-2xl font-bold text-white">₹{(totalAmount/100000).toFixed(1)}L</p><p className="text-xs text-slate-400">Total Sales Recorded</p></div>
        </div>
      </div>

      {/* Bulk upload zone */}
      <div className="glass-card p-6 border-dashed border-2 border-dark-border hover:border-brand-primary/40 transition-colors text-center cursor-pointer group">
        <Upload size={32} className="mx-auto text-slate-500 group-hover:text-brand-primary mb-3 transition-colors" />
        <p className="text-sm font-medium text-slate-300">Drop distributor CSV/Excel file here</p>
        <p className="text-xs text-slate-500 mt-1">Supports .csv, .xlsx — auto-matches chemists by DL number</p>
        <button className="btn-secondary mt-3 mx-auto text-xs">Browse Files</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search invoices..." />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">Invoice No.</th>
                <th className="table-header">Chemist</th>
                <th className="table-header">Distributor</th>
                <th className="table-header">Date</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Scheme</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="table-row">
                  <td className="table-cell font-mono text-xs text-blue-400">{inv.invoiceNo}</td>
                  <td className="table-cell font-medium text-white">{inv.chemist}</td>
                  <td className="table-cell text-slate-300">{inv.distributor}</td>
                  <td className="table-cell text-xs text-slate-400">{inv.date}</td>
                  <td className="table-cell font-semibold text-emerald-400">₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td className="table-cell text-center">{inv.qty}</td>
                  <td className="table-cell text-xs text-purple-400">
                    {data.schemes.find(s => s.id === inv.schemeId)?.name || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">No invoices logged yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Distributor Invoice">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Chemist *</label>
            <select value={form.chemistId} onChange={e => setForm(f => ({ ...f, chemistId: e.target.value }))} className="input-field">
              <option value="">Select chemist...</option>
              {data.chemists.map(c => <option key={c.id} value={c.id}>{c.name} — {c.shop}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Invoice No. *</label>
            <input value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} className="input-field" placeholder="INV-2024-001" />
          </div>
          <div>
            <label className="label">Invoice Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Distributor Name</label>
            <input value={form.distributor} onChange={e => setForm(f => ({ ...f, distributor: e.target.value }))} className="input-field" placeholder="National Distributors" />
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="15000" />
          </div>
          <div>
            <label className="label">Qty (units/boxes)</label>
            <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} className="input-field" placeholder="120" />
          </div>
          <div>
            <label className="label">Apply to Scheme</label>
            <select value={form.schemeId} onChange={e => setForm(f => ({ ...f, schemeId: e.target.value }))} className="input-field">
              <option value="">No scheme</option>
              {data.schemes.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Invoice</button>
        </div>
      </Modal>
    </div>
  )
}
