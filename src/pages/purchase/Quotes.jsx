import React, { useState } from 'react'
import { FileText, CheckCircle, XCircle, Plus, Search, ThumbsUp } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = {
  reqId: '', manufacturer: '', product: '', qty: '', unitPrice: '', totalPrice: '',
  validUntil: '', leadTime: '', terms: 'Net 30', receivedDate: new Date().toISOString().split('T')[0]
}

export default function Quotes() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.quotes.filter(q =>
    q.product?.toLowerCase().includes(search.toLowerCase()) ||
    q.manufacturer?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!form.reqId || !form.unitPrice) { toast.error('Quote details required'); return }
    const req = data.quotationRequests.find(r => r.id === parseInt(form.reqId))
    const total = parseFloat(form.unitPrice) * parseInt(form.qty || 1)
    addItem('quotes', {
      ...form,
      reqNo: req?.reqNo,
      manufacturer: req?.manufacturer || form.manufacturer,
      product: req?.product || form.product,
      qty: req?.quantity || form.qty,
      unitPrice: parseFloat(form.unitPrice),
      totalPrice: total,
      status: 'pending',
    })
    // Update req status
    if (req) updateItem('quotationRequests', req.id, { status: 'quote_received' })
    toast.success('Quote recorded')
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleApprove = (q) => {
    updateItem('quotes', q.id, { status: 'approved' })
    toast.success('Quote approved — proceed to raise PO')
  }

  const handleReject = (q) => {
    updateItem('quotes', q.id, { status: 'rejected' })
    toast.error('Quote rejected')
  }

  const pendingRequests = data.quotationRequests.filter(r => r.status === 'sent' || r.status === 'quote_received')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={22} className="text-purple-400" /> Quotes Received</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and approve manufacturer quotations</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Log Quote</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search quotes..." />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">RFQ Ref</th>
                <th className="table-header">Manufacturer</th>
                <th className="table-header">Product</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Unit Price</th>
                <th className="table-header">Total Value</th>
                <th className="table-header">Valid Until</th>
                <th className="table-header">Lead Time</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="table-row">
                  <td className="table-cell font-mono text-blue-400 text-xs">{q.reqNo}</td>
                  <td className="table-cell font-medium text-white">{q.manufacturer}</td>
                  <td className="table-cell max-w-40 truncate">{q.product}</td>
                  <td className="table-cell">{q.qty}</td>
                  <td className="table-cell font-medium text-emerald-400">₹{parseFloat(q.unitPrice).toFixed(2)}</td>
                  <td className="table-cell font-semibold text-white">₹{parseFloat(q.totalPrice).toLocaleString('en-IN')}</td>
                  <td className="table-cell text-xs text-slate-400">{q.validUntil}</td>
                  <td className="table-cell text-xs">{q.leadTime}</td>
                  <td className="table-cell"><StatusBadge status={q.status} /></td>
                  <td className="table-cell">
                    {q.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApprove(q)} className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400" title="Approve"><CheckCircle size={13} /></button>
                        <button onClick={() => handleReject(q)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400" title="Reject"><XCircle size={13} /></button>
                      </div>
                    )}
                    {q.status === 'approved' && <span className="text-emerald-400 text-xs flex items-center gap-1"><ThumbsUp size={12} /> Approved</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-slate-500 text-sm">No quotes logged yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Received Quote">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Quote Against RFQ</label>
            <select value={form.reqId} onChange={e => setForm(f => ({ ...f, reqId: e.target.value }))} className="input-field">
              <option value="">Select quote request...</option>
              {pendingRequests.map(r => <option key={r.id} value={r.id}>{r.reqNo} — {r.product}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit Price (₹)</label>
            <input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} className="input-field" placeholder="12.50" />
          </div>
          <div>
            <label className="label">Lead Time</label>
            <input value={form.leadTime} onChange={e => setForm(f => ({ ...f, leadTime: e.target.value }))} className="input-field" placeholder="15 days" />
          </div>
          <div>
            <label className="label">Valid Until</label>
            <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Payment Terms</label>
            <select value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} className="input-field">
              {['Net 15', 'Net 30', 'Net 45', 'Advance 50%', 'Advance 100%', 'COD'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Received Date</label>
            <input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Save Quote</button>
        </div>
      </Modal>
    </div>
  )
}
