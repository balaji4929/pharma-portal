import React, { useState } from 'react'
import { Package, Plus, Edit2, AlertTriangle } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = { name: '', brand: '', model: '', totalStock: 0, allocated: 0, toBeOrdered: 0, damaged: 0, returned: 0, unitCost: 0, status: 'adequate' }

export default function GiftInventory() {
  const { data, addItem, updateItem } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = g => {
    setEditing(g.id)
    setForm({ ...g })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name) { toast.error('Gift article name required'); return }
    const available = Math.max(0, form.totalStock - form.allocated - form.damaged)
    const status = available === 0 ? 'out_of_stock' : available <= 5 ? 'low' : 'adequate'
    const data_ = { ...form, available, status, totalStock: Number(form.totalStock), allocated: Number(form.allocated), toBeOrdered: Number(form.toBeOrdered), damaged: Number(form.damaged), returned: Number(form.returned), unitCost: Number(form.unitCost) }
    if (editing) {
      updateItem('giftArticles', editing, data_)
      toast.success('Gift article updated')
    } else {
      addItem('giftArticles', data_)
      toast.success('Gift article added')
    }
    setShowModal(false)
  }

  const statuses = ['adequate', 'low', 'out_of_stock']
  const totalValue = data.giftArticles.reduce((s, g) => s + g.totalStock * g.unitCost, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Package size={22} className="text-purple-400" /> Gift Inventory</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track all gift article stock levels</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Gift Article</button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: data.giftArticles.length, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Total Stock Value', value: `₹${(totalValue/100000).toFixed(1)}L`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Low Stock', value: data.giftArticles.filter(g => g.status === 'low').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Out of Stock', value: data.giftArticles.filter(g => g.status === 'out_of_stock').length, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><Package size={17} className={s.color} /></div>
            <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Inventory grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.giftArticles.map(g => {
          const usedPct = g.totalStock > 0 ? Math.round((g.allocated / g.totalStock) * 100) : 0
          return (
            <div key={g.id} className={`glass-card p-5 ${g.status === 'out_of_stock' ? 'border-red-500/30' : g.status === 'low' ? 'border-amber-500/30' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.brand} · {g.model}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>

              {/* Stock breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Available', value: g.available, color: 'text-emerald-400' },
                  { label: 'Allocated', value: g.allocated, color: 'text-blue-400' },
                  { label: 'To Order', value: g.toBeOrdered, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 bg-dark-bg rounded-lg">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Additional stats */}
              <div className="flex justify-between text-xs text-slate-400 mb-3">
                <span>Total: {g.totalStock} · Damaged: {g.damaged} · Returned: {g.returned}</span>
              </div>

              {/* Usage bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Utilization</span><span>{usedPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`h-full rounded-full transition-all duration-700 ${g.status === 'out_of_stock' ? 'bg-red-500' : g.status === 'low' ? 'bg-amber-500' : 'bg-brand-primary'}`} style={{ width: `${usedPct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                <span className="text-xs text-slate-400">Unit Cost: <span className="text-white font-medium">₹{g.unitCost.toLocaleString('en-IN')}</span></span>
                <button onClick={() => openEdit(g)} className="btn-secondary py-1 px-3 text-xs"><Edit2 size={12} /> Edit</button>
              </div>

              {(g.status === 'out_of_stock' || g.status === 'low') && (
                <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg text-xs ${g.status === 'out_of_stock' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <AlertTriangle size={12} />
                  {g.status === 'out_of_stock' ? 'Urgent: Place procurement order' : `Only ${g.available} units left`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Gift Article' : 'Add Gift Article'}>
        <div className="form-grid">
          <div>
            <label className="label">Article Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Smartwatch" />
          </div>
          <div>
            <label className="label">Brand</label>
            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className="input-field" placeholder="Noise" />
          </div>
          <div>
            <label className="label">Model</label>
            <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="input-field" placeholder="ColorFit Pro 4" />
          </div>
          <div>
            <label className="label">Unit Cost (₹)</label>
            <input type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Total Stock</label>
            <input type="number" value={form.totalStock} onChange={e => setForm(f => ({ ...f, totalStock: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Allocated</label>
            <input type="number" value={form.allocated} onChange={e => setForm(f => ({ ...f, allocated: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">To Be Ordered</label>
            <input type="number" value={form.toBeOrdered} onChange={e => setForm(f => ({ ...f, toBeOrdered: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Damaged</label>
            <input type="number" value={form.damaged} onChange={e => setForm(f => ({ ...f, damaged: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Returned</label>
            <input type="number" value={form.returned} onChange={e => setForm(f => ({ ...f, returned: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save</button>
        </div>
      </Modal>
    </div>
  )
}
