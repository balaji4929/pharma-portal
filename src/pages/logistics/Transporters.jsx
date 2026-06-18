import React, { useState } from 'react'
import { Truck, Plus, Star, Phone, Mail, Globe } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = { name: '', contact: '', email: '', type: 'road', coverage: 'Pan India', rating: 4.0, status: 'active' }

export default function Transporters() {
  const { data, addItem, updateItem, deleteItem } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const openEdit = t => { setEditing(t.id); setForm({ ...t }); setShowModal(true) }
  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }

  const handleSave = () => {
    if (!form.name) { toast.error('Transporter name required'); return }
    if (editing) { updateItem('transporters', editing, form); toast.success('Updated') }
    else { addItem('transporters', form); toast.success('Transporter added') }
    setShowModal(false)
  }

  const types = ['road', 'courier', 'rail', 'air']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Truck size={22} className="text-amber-400" /> Transporters</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your logistics partners</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Transporter</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.transporters.map(t => {
          const dispatches = data.dispatches.filter(d => d.transporter === t.name)
          return (
            <div key={t.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{t.name}</p>
                  <span className="badge-info capitalize">{t.type}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-2"><Phone size={11} /> {t.contact}</div>
                <div className="flex items-center gap-2"><Mail size={11} /> {t.email}</div>
                <div className="flex items-center gap-2"><Globe size={11} /> {t.coverage}</div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {[1,2,3,4,5].map(i => <Star key={i} size={13} className={i <= Math.round(t.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />)}
                <span className="text-xs text-slate-400 ml-1">{t.rating}/5</span>
              </div>
              <div className="p-2 bg-dark-bg rounded-lg text-xs text-center border border-dark-border mb-3">
                <span className="text-slate-400">Total Dispatches: </span>
                <span className="text-white font-semibold">{dispatches.length}</span>
                {' · '}
                <span className="text-slate-400">Delivered: </span>
                <span className="text-emerald-400 font-semibold">{dispatches.filter(d => d.status === 'delivered').length}</span>
              </div>
              <button onClick={() => openEdit(t)} className="w-full btn-secondary py-1.5 text-xs justify-center">Edit</button>
            </div>
          )
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Transporter' : 'Add Transporter'}>
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Company Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="VRL Logistics" />
          </div>
          <div>
            <label className="label">Contact No.</label>
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className="input-field" placeholder="9011223344" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="ops@company.com" />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
              {types.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Coverage</label>
            <input value={form.coverage} onChange={e => setForm(f => ({ ...f, coverage: e.target.value }))} className="input-field" placeholder="Pan India" />
          </div>
          <div>
            <label className="label">Rating (1-5)</label>
            <input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) }))} className="input-field" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
