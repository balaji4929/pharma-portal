import React, { useState } from 'react'
import { CreditCard, Plus, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function Payments() {
  const { data, updateItem, addItem } = useApp()
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'NEFT', ref: '', notes: '' })

  const totalPOs = data.purchaseOrders.length
  const totalValue = data.purchaseOrders.reduce((s, po) => s + po.totalAmount, 0)
  const totalAdvance = data.purchaseOrders.reduce((s, po) => s + (po.advancePaid || 0), 0)
  const totalBalance = totalValue - totalAdvance

  const handleRecord = (po) => {
    if (!form.amount) { toast.error('Enter amount'); return }
    const newAdvance = (po.advancePaid || 0) + parseFloat(form.amount)
    updateItem('purchaseOrders', po.id, { advancePaid: newAdvance, status: newAdvance >= po.totalAmount ? 'received' : po.status })
    toast.success('Payment recorded')
    setShowModal(null)
    setForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], mode: 'NEFT', ref: '', notes: '' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard size={22} className="text-amber-400" /> Payments</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track advance and final payments to manufacturers</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><DollarSign size={20} className="text-blue-400" /></div>
          <div><p className="text-2xl font-bold text-white">₹{(totalValue/100000).toFixed(1)}L</p><p className="text-xs text-slate-400">Total PO Value</p></div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-400" /></div>
          <div><p className="text-2xl font-bold text-white">₹{(totalAdvance/100000).toFixed(1)}L</p><p className="text-xs text-slate-400">Paid So Far</p></div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-400" /></div>
          <div><p className="text-2xl font-bold text-white">₹{(totalBalance/100000).toFixed(1)}L</p><p className="text-xs text-slate-400">Outstanding Balance</p></div>
        </div>
      </div>

      {/* Payment table per PO */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border">
          <h3 className="section-title"><CreditCard size={17} className="text-amber-400" /> Payment Ledger by PO</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">PO No.</th>
                <th className="table-header">Manufacturer</th>
                <th className="table-header">Product</th>
                <th className="table-header">Total Value</th>
                <th className="table-header">Advance Paid</th>
                <th className="table-header">Balance</th>
                <th className="table-header">% Paid</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.purchaseOrders.map(po => {
                const balance = po.totalAmount - (po.advancePaid || 0)
                const pct = Math.round(((po.advancePaid || 0) / po.totalAmount) * 100)
                return (
                  <tr key={po.id} className="table-row">
                    <td className="table-cell font-mono text-blue-400 text-xs">{po.poNo}</td>
                    <td className="table-cell text-sm text-white">{po.manufacturer}</td>
                    <td className="table-cell max-w-40 truncate text-sm">{po.product}</td>
                    <td className="table-cell font-semibold text-white">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="table-cell text-emerald-400 font-medium">₹{(po.advancePaid || 0).toLocaleString('en-IN')}</td>
                    <td className={`table-cell font-semibold ${balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>₹{balance.toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {balance > 0 ? (
                        <button onClick={() => setShowModal(po)} className="btn-secondary py-1 px-3 text-xs"><Plus size={12} /> Record</button>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> Paid</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal open={!!showModal} onClose={() => setShowModal(null)} title={`Record Payment — ${showModal.poNo}`} size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-white font-medium">{showModal.product}</p>
              <p className="text-xs text-slate-400 mt-0.5">Balance: ₹{(showModal.totalAmount - (showModal.advancePaid || 0)).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <label className="label">Amount Paid (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Mode</label>
              <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className="input-field">
                {['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reference / UTR No.</label>
              <input value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} className="input-field" placeholder="UTR/Cheque number" />
            </div>
            <div className="flex gap-3 pt-2 border-t border-dark-border">
              <button onClick={() => setShowModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => handleRecord(showModal)} className="btn-primary flex-1 justify-center">Save Payment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
