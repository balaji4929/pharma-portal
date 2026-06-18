import React, { useState } from 'react'
import { PackageCheck, Plus, ArrowRight, Truck, CheckCircle } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const statusSteps = ['qualified', 'procurement_ordered', 'dispatched', 'delivered']
const statusColors = { qualified: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40', procurement_ordered: 'text-blue-400 bg-blue-500/20 border-blue-500/40', dispatched: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40', delivered: 'text-emerald-400 bg-emerald-500/30 border-emerald-500/60' }

const emptyForm = {
  chemistId: '', schemeId: '', giftId: '', qualifiedDate: new Date().toISOString().split('T')[0],
  address: '', status: 'qualified'
}

export default function Fulfillment() {
  const { data, addItem, updateItem } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [showDispatch, setShowDispatch] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [dispatchForm, setDispatchForm] = useState({ courier: '', trackingId: '', dispatchDate: new Date().toISOString().split('T')[0] })
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? data.giftFulfillments : data.giftFulfillments.filter(g => g.status === filter)

  const handleAdd = () => {
    if (!form.chemistId || !form.giftId) { toast.error('Chemist and gift required'); return }
    const chemist = data.chemists.find(c => c.id === parseInt(form.chemistId))
    const gift = data.giftArticles.find(g => g.id === parseInt(form.giftId))
    const scheme = data.schemes.find(s => s.id === parseInt(form.schemeId))
    addItem('giftFulfillments', {
      chemistId: parseInt(form.chemistId), chemist: chemist?.name,
      schemeId: parseInt(form.schemeId), scheme: scheme?.name,
      giftId: parseInt(form.giftId), gift: gift?.name,
      qualifiedDate: form.qualifiedDate, status: 'qualified',
      address: form.address || `${chemist?.shop}, ${chemist?.territory}`,
    })
    toast.success('Fulfillment created')
    setShowModal(false)
    setForm(emptyForm)
  }

  const handleDispatch = () => {
    if (!dispatchForm.courier || !dispatchForm.trackingId) { toast.error('Courier and tracking ID required'); return }
    updateItem('giftFulfillments', showDispatch.id, {
      status: 'dispatched', courier: dispatchForm.courier,
      trackingId: dispatchForm.trackingId, dispatchDate: dispatchForm.dispatchDate
    })
    toast.success('Dispatched with tracking info')
    setShowDispatch(null)
  }

  const handleStatusChange = (g, status) => {
    const updates = { status }
    if (status === 'delivered') updates.deliveredDate = new Date().toISOString().split('T')[0]
    updateItem('giftFulfillments', g.id, updates)
    toast.success(`Status updated to ${status}`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><PackageCheck size={22} className="text-pink-400" /> Gift Fulfillment</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track gift dispatch and delivery lifecycle</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> New Fulfillment</button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...statusSteps].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-brand-primary text-white' : 'bg-dark-hover text-slate-400 hover:text-white'}`}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')} ({s === 'all' ? data.giftFulfillments.length : data.giftFulfillments.filter(g => g.status === s).length})
          </button>
        ))}
      </div>

      {/* Fulfillment cards */}
      <div className="space-y-3">
        {filtered.map(g => {
          const stepIdx = statusSteps.indexOf(g.status)
          return (
            <div key={g.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-white text-base">{g.chemist}</p>
                  <p className="text-sm text-slate-400">{g.gift} · {g.scheme}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.address}</p>
                </div>
                <span className={`badge border ${statusColors[g.status]}`}>{g.status.replace(/_/g,' ')}</span>
              </div>

              {/* Step tracker */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {statusSteps.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`flex flex-col items-center flex-shrink-0 ${i <= stepIdx ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs ${i < stepIdx ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-400' : i === stepIdx ? 'bg-brand-primary/30 border-brand-primary/60 text-brand-primary' : 'bg-dark-hover border-dark-border text-slate-500'}`}>
                        {i < stepIdx ? <CheckCircle size={12} /> : i + 1}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5 whitespace-nowrap">{s.replace(/_/g,' ')}</span>
                    </div>
                    {i < statusSteps.length - 1 && <div className={`flex-1 min-w-4 h-px mb-4 ${i < stepIdx ? 'bg-emerald-500/40' : 'bg-dark-border'}`} />}
                  </React.Fragment>
                ))}
              </div>

              {g.courier && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs">
                  <Truck size={12} className="text-indigo-400" />
                  <span className="text-slate-300">{g.courier}</span>
                  <ArrowRight size={10} className="text-slate-500" />
                  <span className="font-mono text-indigo-400">{g.trackingId}</span>
                  {g.dispatchDate && <span className="text-slate-500 ml-auto">Dispatched: {g.dispatchDate}</span>}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-border">
                {g.status === 'qualified' && (
                  <button onClick={() => handleStatusChange(g, 'procurement_ordered')} className="btn-secondary py-1.5 text-xs">Mark Procurement Ordered</button>
                )}
                {g.status === 'procurement_ordered' && (
                  <button onClick={() => setShowDispatch(g)} className="btn-secondary py-1.5 text-xs"><Truck size={13} /> Mark Dispatched</button>
                )}
                {g.status === 'dispatched' && (
                  <button onClick={() => handleStatusChange(g, 'delivered')} className="btn-primary py-1.5 text-xs"><CheckCircle size={13} /> Confirm Delivered</button>
                )}
                {g.deliveredDate && <span className="text-xs text-slate-500 flex items-center">Delivered: {g.deliveredDate}</span>}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <div className="glass-card p-10 text-center text-slate-500 text-sm">No fulfillment records</div>}
      </div>

      {/* Add Fulfillment */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Gift Fulfillment">
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Chemist *</label>
            <select value={form.chemistId} onChange={e => setForm(f => ({ ...f, chemistId: e.target.value }))} className="input-field">
              <option value="">Select chemist...</option>
              {data.chemists.map(c => <option key={c.id} value={c.id}>{c.name} — {c.shop}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Scheme</label>
            <select value={form.schemeId} onChange={e => setForm(f => ({ ...f, schemeId: e.target.value }))} className="input-field">
              <option value="">Select scheme...</option>
              {data.schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Gift Article *</label>
            <select value={form.giftId} onChange={e => setForm(f => ({ ...f, giftId: e.target.value }))} className="input-field">
              <option value="">Select gift...</option>
              {data.giftArticles.filter(g => g.available > 0).map(g => <option key={g.id} value={g.id}>{g.name} ({g.available} available)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Qualified Date</label>
            <input type="date" value={form.qualifiedDate} onChange={e => setForm(f => ({ ...f, qualifiedDate: e.target.value }))} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Delivery Address</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" rows={2} placeholder="Full delivery address..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleAdd} className="btn-primary flex-1 justify-center">Create Fulfillment</button>
        </div>
      </Modal>

      {/* Dispatch Modal */}
      {showDispatch && (
        <Modal open={!!showDispatch} onClose={() => setShowDispatch(null)} title="Add Dispatch Info" size="sm">
          <div className="space-y-4">
            <div>
              <label className="label">Courier Name *</label>
              <input value={dispatchForm.courier} onChange={e => setDispatchForm(f => ({ ...f, courier: e.target.value }))} className="input-field" placeholder="BlueDart / DTDC / etc." />
            </div>
            <div>
              <label className="label">Tracking ID *</label>
              <input value={dispatchForm.trackingId} onChange={e => setDispatchForm(f => ({ ...f, trackingId: e.target.value }))} className="input-field" placeholder="BD987654321" />
            </div>
            <div>
              <label className="label">Dispatch Date</label>
              <input type="date" value={dispatchForm.dispatchDate} onChange={e => setDispatchForm(f => ({ ...f, dispatchDate: e.target.value }))} className="input-field" />
            </div>
            <div className="flex gap-3 pt-2 border-t border-dark-border">
              <button onClick={() => setShowDispatch(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleDispatch} className="btn-primary flex-1 justify-center"><Truck size={14} /> Save Dispatch</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
