import React, { useState } from 'react'
import { Send, Plus, Search, CheckCircle, Truck } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = {
  batchReceiptId: '', product: '', batchNo: '', from: 'WH-1 Mumbai', toType: 'distributor', toName: '',
  toAddress: '', qty: '', units: 'strips', transporterId: '', trackingNo: '', dispatchDate: new Date().toISOString().split('T')[0],
  driverName: '', driverPhone: '', vehicleNo: '',
}

export default function Dispatches() {
  const { data, addItem, updateItem } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.dispatches.filter(d => {
    const matchSearch = d.dispatchNo?.toLowerCase().includes(search.toLowerCase()) || d.toName?.toLowerCase().includes(search.toLowerCase()) || d.product?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || d.status === filter
    return matchSearch && matchFilter
  })

  const handleSave = () => {
    if (!form.toName || !form.qty) { toast.error('Recipient and quantity required'); return }
    const transporter = data.transporters.find(t => t.id === parseInt(form.transporterId))
    const batch = data.batchReceipts.find(b => b.id === parseInt(form.batchReceiptId))
    addItem('dispatches', {
      dispatchNo: `DSP-2024-00${data.dispatches.length + 1}`,
      poId: batch?.poId,
      product: batch?.product || form.product,
      batchNo: batch?.batchNo || form.batchNo,
      from: form.from,
      toType: form.toType,
      toName: form.toName,
      toAddress: form.toAddress,
      qty: parseInt(form.qty),
      units: form.units,
      transporter: transporter?.name || form.transporterId,
      trackingNo: form.trackingNo,
      status: 'pending',
      dispatchDate: form.dispatchDate,
      deliveryDate: null,
      driverName: form.driverName,
      driverPhone: form.driverPhone,
      vehicleNo: form.vehicleNo,
    })
    toast.success('Dispatch created')
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleDeliver = (d) => {
    updateItem('dispatches', d.id, { status: 'delivered', deliveryDate: new Date().toISOString().split('T')[0] })
    toast.success('Marked as delivered')
  }

  const handleDispatch = (d) => {
    updateItem('dispatches', d.id, { status: 'in_transit', dispatchDate: new Date().toISOString().split('T')[0] })
    toast.success('Dispatch initiated')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Send size={22} className="text-amber-400" /> Dispatches</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage all outgoing shipments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> New Dispatch</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search dispatches..." />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'in_transit', 'delivered'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-brand-primary text-white' : 'bg-dark-hover text-slate-400 hover:text-white'}`}>
              {s === 'all' ? 'All' : s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatch cards */}
      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-amber-400 text-sm font-semibold">{d.dispatchNo}</span>
                  <StatusBadge status={d.status} />
                  <span className={`badge ${d.toType === 'distributor' ? 'badge-purple' : 'badge-info'}`}>{d.toType}</span>
                </div>
                <p className="font-semibold text-white">{d.product}</p>
                <p className="text-xs text-slate-400 mt-0.5">Batch: {d.batchNo} · From: {d.from}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{d.qty?.toLocaleString('en-IN')} <span className="text-sm text-slate-400">{d.units}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-xs text-slate-400">
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">To</p>
                <p className="text-white font-medium">{d.toName}</p>
                <p>{d.toAddress}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Transporter</p>
                <p className="text-white font-medium">{d.transporter || '—'}</p>
                {d.trackingNo && <p className="font-mono text-blue-400">{d.trackingNo}</p>}
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Driver / Vehicle</p>
                <p className="text-white">{d.driverName || '—'}</p>
                <p>{d.vehicleNo} {d.driverPhone && `· ${d.driverPhone}`}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dark-border text-xs">
              {d.dispatchDate && <span className="text-slate-500">Dispatched: {d.dispatchDate}</span>}
              {d.deliveryDate && <span className="text-emerald-400">Delivered: {d.deliveryDate}</span>}
              <div className="ml-auto flex gap-2">
                {d.status === 'pending' && (
                  <button onClick={() => handleDispatch(d)} className="btn-secondary py-1 text-xs"><Truck size={12} /> Initiate Dispatch</button>
                )}
                {d.status === 'in_transit' && (
                  <button onClick={() => handleDeliver(d)} className="btn-primary py-1 text-xs"><CheckCircle size={12} /> Confirm Delivered</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="glass-card p-10 text-center text-slate-500 text-sm">No dispatches found</div>}
      </div>

      {/* New Dispatch Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Dispatch" size="lg">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Batch (from Receipts)</label>
            <select value={form.batchReceiptId} onChange={e => {
              const b = data.batchReceipts.find(r => r.id === parseInt(e.target.value))
              setForm(f => ({ ...f, batchReceiptId: e.target.value, product: b?.product || '', batchNo: b?.batchNo || '' }))
            }} className="input-field">
              <option value="">Select received batch...</option>
              {data.batchReceipts.map(b => <option key={b.id} value={b.id}>{b.batchNo} — {b.product} ({b.qtyReceived?.toLocaleString('en-IN')} units)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Dispatch From</label>
            <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} className="input-field">
              {data.warehouses.map(w => <option key={w.id} value={`${w.code} ${w.name.split(' ')[0]}`}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Dispatch To (Type)</label>
            <select value={form.toType} onChange={e => setForm(f => ({ ...f, toType: e.target.value }))} className="input-field">
              <option value="distributor">Distributor</option>
              <option value="chemist">Chemist</option>
              <option value="warehouse">Warehouse Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Recipient Name *</label>
            <input value={form.toName} onChange={e => setForm(f => ({ ...f, toName: e.target.value }))} className="input-field" placeholder="National Distributors" />
          </div>
          <div>
            <label className="label">Quantity *</label>
            <input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Unit</label>
            <select value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} className="input-field">
              {['strips', 'bottles', 'boxes', 'sachets', 'units'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Transporter</label>
            <select value={form.transporterId} onChange={e => setForm(f => ({ ...f, transporterId: e.target.value }))} className="input-field">
              <option value="">Select transporter...</option>
              {data.transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tracking / AWB No.</label>
            <input value={form.trackingNo} onChange={e => setForm(f => ({ ...f, trackingNo: e.target.value }))} className="input-field" placeholder="AWB12345678" />
          </div>
          <div>
            <label className="label">Driver Name</label>
            <input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} className="input-field" placeholder="Ramu Prasad" />
          </div>
          <div>
            <label className="label">Driver Phone</label>
            <input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} className="input-field" placeholder="9988001122" />
          </div>
          <div>
            <label className="label">Vehicle No.</label>
            <input value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} className="input-field" placeholder="MH04AB1234" />
          </div>
          <div>
            <label className="label">Dispatch Date</label>
            <input type="date" value={form.dispatchDate} onChange={e => setForm(f => ({ ...f, dispatchDate: e.target.value }))} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Delivery Address</label>
            <textarea value={form.toAddress} onChange={e => setForm(f => ({ ...f, toAddress: e.target.value }))} className="input-field" rows={2} placeholder="Full delivery address..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Create Dispatch</button>
        </div>
      </Modal>
    </div>
  )
}
