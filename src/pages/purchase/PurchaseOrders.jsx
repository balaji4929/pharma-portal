import React, { useState } from 'react'
import { Plus, Search, ClipboardList, Send, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = { quoteId: '', poDate: new Date().toISOString().split('T')[0], expectedDelivery: '', paymentTerms: 'Net 30', batchNo: '', advancePaid: 0, notes: '' }

export default function PurchaseOrders() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showAdvance, setShowAdvance] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [advanceForm, setAdvanceForm] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'NEFT', ref: '' })

  const filtered = data.purchaseOrders.filter(po =>
    po.poNo?.toLowerCase().includes(search.toLowerCase()) ||
    po.product?.toLowerCase().includes(search.toLowerCase()) ||
    po.manufacturer?.toLowerCase().includes(search.toLowerCase())
  )

  const approvedQuotes = data.quotes.filter(q => q.status === 'approved')

  const handleCreatePO = () => {
    if (!form.quoteId) { toast.error('Select an approved quote'); return }
    const q = data.quotes.find(qt => qt.id === parseInt(form.quoteId))
    if (!q) return
    const po = {
      poNo: `PO-2024-00${data.purchaseOrders.length + 1}`,
      quoteId: q.id,
      manufacturer: q.manufacturer,
      product: q.product,
      qty: q.qty,
      unitPrice: q.unitPrice,
      totalAmount: q.totalPrice,
      advancePaid: parseInt(form.advancePaid) || 0,
      status: 'po_raised',
      poDate: form.poDate,
      expectedDelivery: form.expectedDelivery,
      batchNo: form.batchNo || `BATCH-${Date.now()}`,
      paymentTerms: form.paymentTerms,
    }
    addItem('purchaseOrders', po)
    updateItem('quotes', q.id, { status: 'po_raised' })
    toast.success(`PO ${po.poNo} raised successfully`)
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleStatusUpdate = (po, newStatus) => {
    updateItem('purchaseOrders', po.id, { status: newStatus })
    toast.success(`Status updated to: ${newStatus.replace('_', ' ')}`)
  }

  const handleAdvancePayment = () => {
    if (!advanceForm.amount) { toast.error('Enter amount'); return }
    updateItem('purchaseOrders', showAdvance.id, {
      advancePaid: (showAdvance.advancePaid || 0) + parseFloat(advanceForm.amount),
      status: 'advance_paid',
    })
    toast.success('Advance payment recorded')
    setShowAdvance(null)
    setAdvanceForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'NEFT', ref: '' })
  }

  const statusWorkflow = ['po_raised', 'advance_paid', 'in_production', 'dispatched', 'received']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList size={22} className="text-indigo-400" /> Purchase Orders</h1>
          <p className="text-slate-400 text-sm mt-0.5">Raise, track and manage all POs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Raise PO</button>
      </div>

      {/* Workflow visual */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">PO Lifecycle</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {statusWorkflow.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex-shrink-0 flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : i === 4 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-dark-hover text-slate-400 border border-dark-border'}`}>{i+1}</div>
                <span className="text-xs text-slate-400 capitalize">{s.replace(/_/g,' ')}</span>
              </div>
              {i < statusWorkflow.length - 1 && <div className="flex-1 min-w-3 h-px bg-dark-border" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search POs..." />
      </div>

      {/* PO Cards */}
      <div className="space-y-4">
        {filtered.map(po => {
          const balance = po.totalAmount - (po.advancePaid || 0)
          const advancePct = Math.round(((po.advancePaid || 0) / po.totalAmount) * 100)
          const statusIdx = statusWorkflow.indexOf(po.status)
          return (
            <div key={po.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-blue-400 text-sm font-semibold">{po.poNo}</span>
                    <StatusBadge status={po.status} />
                  </div>
                  <p className="text-white font-semibold">{po.product}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{po.manufacturer} · Qty: {po.qty} · Batch: {po.batchNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">₹{po.totalAmount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400">PO Date: {po.poDate}</p>
                  <p className="text-xs text-slate-400">Expected: {po.expectedDelivery}</p>
                </div>
              </div>

              {/* Payment progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Payment ({advancePct}% advance paid)</span>
                  <span className="text-slate-400">Balance: <span className={balance > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>₹{balance.toLocaleString('en-IN')}</span></span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${advancePct}%` }} />
                </div>
              </div>

              {/* Timeline mini */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {statusWorkflow.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i < statusIdx ? 'bg-emerald-500/30 border border-emerald-500/50' : i === statusIdx ? 'bg-brand-primary/30 border border-brand-primary/60' : 'bg-dark-hover border border-dark-border'}`}>
                      {i < statusIdx ? <CheckCircle size={10} className="text-emerald-400" /> : <span className="text-[8px] text-slate-500">{i+1}</span>}
                    </div>
                    {i < statusWorkflow.length - 1 && <div className={`flex-1 min-w-2 h-px ${i < statusIdx ? 'bg-emerald-500/40' : 'bg-dark-border'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-border">
                {po.status === 'po_raised' && (
                  <button onClick={() => setShowAdvance(po)} className="btn-secondary py-1.5 text-xs"><Package size={13} /> Record Advance</button>
                )}
                {po.status === 'advance_paid' && (
                  <button onClick={() => handleStatusUpdate(po, 'in_production')} className="btn-secondary py-1.5 text-xs"><CheckCircle size={13} /> Mark In Production</button>
                )}
                {po.status === 'in_production' && (
                  <button onClick={() => handleStatusUpdate(po, 'dispatched')} className="btn-secondary py-1.5 text-xs"><Send size={13} /> Mark Dispatched</button>
                )}
                {po.status === 'dispatched' && (
                  <button onClick={() => handleStatusUpdate(po, 'received')} className="btn-primary py-1.5 text-xs"><CheckCircle size={13} /> Mark Received</button>
                )}
                <button className="btn-secondary py-1.5 text-xs">View Proforma</button>
                <button className="btn-secondary py-1.5 text-xs">Attachments</button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="glass-card p-10 text-center text-slate-500 text-sm">No purchase orders yet. Raise your first PO from an approved quote.</div>
        )}
      </div>

      {/* Create PO Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Raise Purchase Order">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Approved Quote *</label>
            <select value={form.quoteId} onChange={e => setForm(f => ({ ...f, quoteId: e.target.value }))} className="input-field">
              <option value="">Select approved quote...</option>
              {approvedQuotes.map(q => <option key={q.id} value={q.id}>{q.reqNo} — {q.product} (₹{q.totalPrice?.toLocaleString('en-IN')})</option>)}
            </select>
            {approvedQuotes.length === 0 && <p className="text-xs text-amber-400 mt-1">No approved quotes. Approve a quote first.</p>}
          </div>
          <div>
            <label className="label">PO Date</label>
            <input type="date" value={form.poDate} onChange={e => setForm(f => ({ ...f, poDate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Expected Delivery</label>
            <input type="date" value={form.expectedDelivery} onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Batch No. (auto-generated if blank)</label>
            <input value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} className="input-field" placeholder="BATCH-24-001" />
          </div>
          <div>
            <label className="label">Payment Terms</label>
            <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} className="input-field">
              {['Net 15', 'Net 30', 'Net 45', 'Advance 50%', 'Advance 100%'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Advance Amount (₹)</label>
            <input type="number" value={form.advancePaid} onChange={e => setForm(f => ({ ...f, advancePaid: e.target.value }))} className="input-field" placeholder="0" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleCreatePO} className="btn-primary flex-1 justify-center">Raise PO</button>
        </div>
      </Modal>

      {/* Advance Payment Modal */}
      {showAdvance && (
        <Modal open={!!showAdvance} onClose={() => setShowAdvance(null)} title={`Advance Payment — ${showAdvance.poNo}`} size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
              <p className="text-white">Total Amount: <span className="font-bold">₹{showAdvance.totalAmount.toLocaleString('en-IN')}</span></p>
              <p className="text-slate-400 text-xs mt-0.5">{showAdvance.product}</p>
            </div>
            <div>
              <label className="label">Advance Amount (₹) *</label>
              <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="62500" />
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input type="date" value={advanceForm.paymentDate} onChange={e => setAdvanceForm(f => ({ ...f, paymentDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select value={advanceForm.mode} onChange={e => setAdvanceForm(f => ({ ...f, mode: e.target.value }))} className="input-field">
                {['NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI', 'Cash'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reference / UTR No.</label>
              <input value={advanceForm.ref} onChange={e => setAdvanceForm(f => ({ ...f, ref: e.target.value }))} className="input-field" placeholder="UTR/Cheque number" />
            </div>
            <div className="flex gap-3 pt-2 border-t border-dark-border">
              <button onClick={() => setShowAdvance(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleAdvancePayment} className="btn-primary flex-1 justify-center">Record Payment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
