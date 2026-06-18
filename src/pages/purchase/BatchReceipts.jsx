import React, { useState } from 'react'
import { PackageCheck, Plus, Search, CheckCircle, XCircle, Thermometer } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = {
  poId: '', batchNo: '', qtyOrdered: '', qtyReceived: '', qtyRejected: 0,
  mfgDate: '', expDate: '', receivedDate: new Date().toISOString().split('T')[0],
  qcStatus: 'passed', warehouse: 'WH-1 Mumbai', notes: ''
}

export default function BatchReceipts() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.batchReceipts.filter(b =>
    b.product?.toLowerCase().includes(search.toLowerCase()) ||
    b.batchNo?.toLowerCase().includes(search.toLowerCase()) ||
    b.poNo?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingPOs = data.purchaseOrders.filter(po => po.status === 'dispatched' || po.status === 'in_production')

  const handleSave = () => {
    if (!form.poId || !form.qtyReceived) { toast.error('PO and received qty required'); return }
    const po = data.purchaseOrders.find(p => p.id === parseInt(form.poId))
    const receipt = {
      poId: parseInt(form.poId),
      poNo: po?.poNo,
      product: po?.product,
      batchNo: form.batchNo || po?.batchNo,
      qtyOrdered: parseInt(form.qtyOrdered) || 0,
      qtyReceived: parseInt(form.qtyReceived),
      qtyRejected: parseInt(form.qtyRejected) || 0,
      mfgDate: form.mfgDate,
      expDate: form.expDate,
      receivedDate: form.receivedDate,
      status: 'received',
      qcStatus: form.qcStatus,
      warehouse: form.warehouse,
      notes: form.notes,
    }
    addItem('batchReceipts', receipt)
    updateItem('purchaseOrders', parseInt(form.poId), { status: 'received' })
    toast.success('Batch receipt recorded')
    setShowModal(false)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><PackageCheck size={22} className="text-emerald-400" /> Batch Receipts</h1>
          <p className="text-slate-400 text-sm mt-0.5">Record incoming stock from manufacturers</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Log Receipt</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search batches..." />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">PO No.</th>
                <th className="table-header">Product</th>
                <th className="table-header">Batch No.</th>
                <th className="table-header">Qty Ordered</th>
                <th className="table-header">Qty Received</th>
                <th className="table-header">Qty Rejected</th>
                <th className="table-header">Mfg Date</th>
                <th className="table-header">Exp Date</th>
                <th className="table-header">Warehouse</th>
                <th className="table-header">QC Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="table-row">
                  <td className="table-cell font-mono text-blue-400 text-xs">{b.poNo}</td>
                  <td className="table-cell font-medium text-white max-w-40 truncate">{b.product}</td>
                  <td className="table-cell font-mono text-xs text-purple-400">{b.batchNo}</td>
                  <td className="table-cell text-center">{b.qtyOrdered?.toLocaleString('en-IN')}</td>
                  <td className="table-cell text-center text-emerald-400 font-semibold">{b.qtyReceived?.toLocaleString('en-IN')}</td>
                  <td className="table-cell text-center text-red-400">{b.qtyRejected || 0}</td>
                  <td className="table-cell text-xs text-slate-400">{b.mfgDate}</td>
                  <td className="table-cell text-xs text-slate-400">{b.expDate}</td>
                  <td className="table-cell text-xs">{b.warehouse}</td>
                  <td className="table-cell">
                    <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${b.qcStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {b.qcStatus === 'passed' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {b.qcStatus === 'passed' ? 'QC Passed' : 'QC Failed'}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-slate-500 text-sm">No batch receipts logged</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Batch Receipt" size="lg">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Purchase Order *</label>
            <select value={form.poId} onChange={e => {
              const po = data.purchaseOrders.find(p => p.id === parseInt(e.target.value))
              setForm(f => ({ ...f, poId: e.target.value, batchNo: po?.batchNo || '', qtyOrdered: po?.qty?.replace(/,/g,'') || '' }))
            }} className="input-field">
              <option value="">Select purchase order...</option>
              {data.purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.product} ({po.qty})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Batch No.</label>
            <input value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} className="input-field" placeholder="BATCH-24-001" />
          </div>
          <div>
            <label className="label">Qty Ordered</label>
            <input type="number" value={form.qtyOrdered} onChange={e => setForm(f => ({ ...f, qtyOrdered: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Qty Received *</label>
            <input type="number" value={form.qtyReceived} onChange={e => setForm(f => ({ ...f, qtyReceived: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Qty Rejected</label>
            <input type="number" value={form.qtyRejected} onChange={e => setForm(f => ({ ...f, qtyRejected: e.target.value }))} className="input-field" defaultValue={0} />
          </div>
          <div>
            <label className="label">Mfg Date</label>
            <input type="date" value={form.mfgDate} onChange={e => setForm(f => ({ ...f, mfgDate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input type="date" value={form.expDate} onChange={e => setForm(f => ({ ...f, expDate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Received Date</label>
            <input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">QC Status</label>
            <select value={form.qcStatus} onChange={e => setForm(f => ({ ...f, qcStatus: e.target.value }))} className="input-field">
              <option value="passed">QC Passed</option>
              <option value="failed">QC Failed</option>
              <option value="pending">QC Pending</option>
            </select>
          </div>
          <div>
            <label className="label">Warehouse</label>
            <select value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))} className="input-field">
              {data.warehouses.map(w => <option key={w.id} value={`${w.code} ${w.name.split(' ')[0]}`}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes / Remarks</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="Any special notes about this batch..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Receipt</button>
        </div>
      </Modal>
    </div>
  )
}
