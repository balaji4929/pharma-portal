import React, { useState } from 'react'
import { Building2, Plus, Package, Edit2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

const emptyForm = { code: '', name: '', address: '', capacity: 10000, used: 0, type: 'primary' }

export default function Warehouses() {
  const { data, addItem, updateItem } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const openEdit = w => { setEditing(w.id); setForm({ ...w }); setShowModal(true) }
  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }

  const handleSave = () => {
    if (!form.name || !form.code) { toast.error('Code and name required'); return }
    if (editing) { updateItem('warehouses', editing, { ...form, capacity: Number(form.capacity), used: Number(form.used) }); toast.success('Updated') }
    else { addItem('warehouses', { ...form, capacity: Number(form.capacity), used: Number(form.used) }); toast.success('Warehouse added') }
    setShowModal(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 size={22} className="text-amber-400" /> Warehouses</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage storage facilities</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Warehouse</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.warehouses.map(w => {
          const usedPct = Math.round((w.used / w.capacity) * 100)
          const available = w.capacity - w.used
          return (
            <div key={w.id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Building2 size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{w.code}</p>
                    <p className="text-slate-400 text-sm">{w.name}</p>
                  </div>
                </div>
                <span className={`badge ${w.type === 'primary' ? 'badge-info' : 'badge-gray'}`}>{w.type}</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">{w.address}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total', value: w.capacity.toLocaleString('en-IN'), color: 'text-white' },
                  { label: 'Used', value: w.used.toLocaleString('en-IN'), color: 'text-blue-400' },
                  { label: 'Available', value: available.toLocaleString('en-IN'), color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-dark-bg rounded-lg border border-dark-border">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Utilization</span>
                  <span className={usedPct > 80 ? 'text-red-400' : usedPct > 60 ? 'text-amber-400' : 'text-emerald-400'}>{usedPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`h-full rounded-full transition-all ${usedPct > 80 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-brand-primary'}`} style={{ width: `${usedPct}%` }} />
                </div>
              </div>

              <button onClick={() => openEdit(w)} className="w-full btn-secondary py-1.5 text-xs justify-center"><Edit2 size={12} /> Edit</button>
            </div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Warehouse' : 'Add Warehouse'}>
        <div className="form-grid">
          <div>
            <label className="label">Warehouse Code *</label>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="WH-3" />
          </div>
          <div>
            <label className="label">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Delhi Warehouse" />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="transit">Transit</option>
            </select>
          </div>
          <div>
            <label className="label">Total Capacity</label>
            <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Currently Used</label>
            <input type="number" value={form.used} onChange={e => setForm(f => ({ ...f, used: e.target.value }))} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" rows={2} placeholder="Full address..." />
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
