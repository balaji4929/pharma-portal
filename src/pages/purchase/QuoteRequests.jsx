import React, { useState } from 'react'
import { Plus, Send, Search, Eye, Mail, FileText, Clock, CheckCircle, Edit2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = {
  manufacturerId: '', product: '', productType: 'Tablets', strength: '', quantity: '',
  unit: 'strips', packSize: '', packing: '', notes: '', dueDate: '', sentVia: 'email'
}

const productTypes = ['Tablets', 'Capsules', 'Syrup', 'Suspension', 'Powder', 'Sachet', 'Injection', 'Ointment', 'Cream', 'Drops']

export default function QuoteRequests() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showEmail, setShowEmail] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [sending, setSending] = useState(false)

  const filtered = data.quotationRequests.filter(q =>
    q.product?.toLowerCase().includes(search.toLowerCase()) ||
    q.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
    q.reqNo?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedMfr = data.manufacturers.find(m => m.id === parseInt(form.manufacturerId))

  const handleAdd = () => {
    if (!form.manufacturerId || !form.product || !form.quantity) {
      toast.error('Manufacturer, product and quantity are required')
      return
    }
    const mfr = data.manufacturers.find(m => m.id === parseInt(form.manufacturerId))
    const newReq = {
      reqNo: `QR-2024-00${data.quotationRequests.length + 1}`,
      manufacturerId: parseInt(form.manufacturerId),
      manufacturer: mfr?.name || '',
      product: `${form.product} ${form.strength} ${form.productType}`,
      quantity: `${form.quantity} ${form.unit}`,
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      dueDate: form.dueDate,
      sentVia: form.sentVia,
      notes: form.notes,
    }
    addItem('quotationRequests', newReq)
    toast.success('Quote request created')
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleSendEmail = async (req) => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1500))
    updateItem('quotationRequests', req.id, { status: 'sent' })
    setSending(false)
    setShowEmail(null)
    toast.success(`Email sent to ${data.manufacturers.find(m => m.id === req.manufacturerId)?.email || 'manufacturer'}`)
  }

  const statusFlow = [
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'quote_received', label: 'Quote Received' },
    { key: 'approved', label: 'Approved' },
  ]

  const emailPreview = showEmail ? {
    to: data.manufacturers.find(m => m.id === showEmail.manufacturerId)?.email || '',
    subject: `Quotation Request — ${showEmail.product}`,
    body: `Dear Sir/Madam,

We are interested in procuring the following product and request you to please share your best quotation at the earliest.

Product Details:
• Product: ${showEmail.product}
• Required Quantity: ${showEmail.quantity}
• Required By: ${showEmail.dueDate || 'ASAP'}

Please include the following in your quotation:
1. Unit price per pack / strip
2. Minimum Order Quantity (MOQ)
3. Lead time for manufacturing
4. Batch validity / shelf life
5. Payment terms

Kindly revert at the earliest to help us process the purchase order.

Thanks & Regards,
Purchase Department
Glodac Pharma LLP`
  } : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Send size={22} className="text-blue-400" /> Quote Requests</h1>
          <p className="text-slate-400 text-sm mt-0.5">Send RFQs to manufacturers via email</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> New Request</button>
      </div>

      {/* Status flow */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {statusFlow.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-slate-400' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                <span className="text-sm text-slate-300 font-medium">{s.label}</span>
                <span className="badge-gray ml-1">
                  {data.quotationRequests.filter(q => q.status === s.key).length}
                </span>
              </div>
              {i < statusFlow.length - 1 && <div className="flex-1 min-w-4 h-px bg-dark-border" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search requests..." />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">Req No.</th>
                <th className="table-header">Manufacturer</th>
                <th className="table-header">Product</th>
                <th className="table-header">Quantity</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id} className="table-row">
                  <td className="table-cell font-mono text-blue-400 text-xs">{req.reqNo}</td>
                  <td className="table-cell font-medium text-white">{req.manufacturer}</td>
                  <td className="table-cell max-w-48 truncate">{req.product}</td>
                  <td className="table-cell">{req.quantity}</td>
                  <td className="table-cell text-slate-400 text-xs">{req.date}</td>
                  <td className="table-cell"><StatusBadge status={req.status} /></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      {req.status === 'draft' && (
                        <button
                          onClick={() => setShowEmail(req)}
                          className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                          title="Send Email"
                        >
                          <Mail size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowEmail(req)}
                        className="p-1.5 rounded-lg bg-dark-hover hover:bg-dark-border text-slate-400 hover:text-white transition-colors"
                        title="Preview Email"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">No quote requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Quotation Request" size="lg">
        <div className="space-y-5">
          <div className="form-grid">
            <div className="md:col-span-2">
              <label className="label">Manufacturer *</label>
              <select value={form.manufacturerId} onChange={e => setForm(f => ({ ...f, manufacturerId: e.target.value }))} className="input-field">
                <option value="">Select manufacturer...</option>
                {data.manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {selectedMfr && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Mail size={11} /> Will be sent to: {selectedMfr.email}</p>
              )}
            </div>
            <div>
              <label className="label">Product Name *</label>
              <input value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} className="input-field" placeholder="Paracetamol" />
            </div>
            <div>
              <label className="label">Product Type</label>
              <select value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value }))} className="input-field">
                {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Strength / Composition</label>
              <input value={form.strength} onChange={e => setForm(f => ({ ...f, strength: e.target.value }))} className="input-field" placeholder="500mg, 250mg/5ml, etc." />
            </div>
            <div>
              <label className="label">Pack Size</label>
              <input value={form.packSize} onChange={e => setForm(f => ({ ...f, packSize: e.target.value }))} className="input-field" placeholder="10x10, 100ml, etc." />
            </div>
            <div>
              <label className="label">Required Quantity *</label>
              <input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="input-field" placeholder="10000" type="number" />
            </div>
            <div>
              <label className="label">Unit</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input-field">
                {['strips', 'bottles', 'boxes', 'sachets', 'vials', 'tubes', 'units'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Packing Details</label>
              <input value={form.packing} onChange={e => setForm(f => ({ ...f, packing: e.target.value }))} className="input-field" placeholder="As per specification" />
            </div>
            <div>
              <label className="label">Quotation Required By</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Additional Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={3} placeholder="Any specific requirements, quality certifications needed, etc." />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-dark-border">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Create Request</button>
          </div>
        </div>
      </Modal>

      {/* Email Preview Modal */}
      {showEmail && (
        <Modal open={!!showEmail} onClose={() => setShowEmail(null)} title="Email Preview — Quote Request" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">To</p>
                <p className="text-sm text-white">{emailPreview.to}</p>
              </div>
              <div className="p-3 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm text-white font-medium">{emailPreview.subject}</p>
              </div>
              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Email Body</p>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{emailPreview.body}</pre>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
              ⚠️ This email will be sent via your connected Gmail account. Configure Gmail API in Settings.
            </div>
            <div className="flex gap-3 pt-2 border-t border-dark-border">
              <button onClick={() => setShowEmail(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={() => handleSendEmail(showEmail)}
                disabled={sending}
                className="btn-primary flex-1 justify-center"
              >
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Mail size={15} /> Send Email</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
