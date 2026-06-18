import React, { useState } from 'react'
import { Plus, Search, Building2, Phone, Mail, MapPin, Edit2, Trash2, CheckCircle } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = { name: '', email: '', phone: '', gst: '', address: '', contact: '', category: 'Tablets/Capsules', status: 'active' }

export default function Manufacturers() {
  const { data, addItem, updateItem, deleteItem } = useApp()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = data.manufacturers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (m) => { setEditing(m.id); setForm({ ...m }); setShowModal(true) }

  const handleSave = () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return }
    if (editing) {
      updateItem('manufacturers', editing, form)
      toast.success('Manufacturer updated')
    } else {
      addItem('manufacturers', form)
      toast.success('Manufacturer added')
    }
    setShowModal(false)
  }

  const handleDelete = (id) => {
    deleteItem('manufacturers', id)
    toast.success('Manufacturer removed')
  }

  const categories = ['Tablets/Capsules', 'Syrups/Liquids', 'Powder/Granules', 'Injections', 'Ointments/Creams', 'Other']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Building2 size={22} className="text-purple-400" /> Manufacturers</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage your manufacturing partners</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Manufacturer</button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search manufacturers..." />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="glass-card p-5 hover:border-slate-600 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Building2 size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.category}</p>
                </div>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2"><Mail size={12} className="text-slate-500" /> {m.email}</div>
              <div className="flex items-center gap-2"><Phone size={12} className="text-slate-500" /> {m.phone}</div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-500" /> {m.address}</div>
              <div className="flex items-center gap-2"><CheckCircle size={12} className="text-slate-500" /> GST: {m.gst}</div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-dark-border">
              <button onClick={() => openEdit(m)} className="btn-secondary flex-1 justify-center py-1.5"><Edit2 size={13} /> Edit</button>
              <button onClick={() => handleDelete(m.id)} className="btn-danger flex-1 justify-center py-1.5"><Trash2 size={13} /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Manufacturer' : 'Add Manufacturer'}>
        <div className="form-grid">
          <div className="md:col-span-2">
            <label className="label">Company Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Sunrise Pharma Pvt Ltd" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="orders@company.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="9876543210" />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input value={form.gst} onChange={e => setForm(f => ({ ...f, gst: e.target.value }))} className="input-field" placeholder="27AABCS1234F1Z5" />
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className="input-field" placeholder="Mr. Patel" />
          </div>
          <div>
            <label className="label">Product Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-field" rows={2} placeholder="Full address..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Manufacturer</button>
        </div>
      </Modal>
    </div>
  )
}
