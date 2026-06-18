import React, { useState } from 'react'
import { Star, Plus, Users, Target, Edit2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import Modal from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const emptyForm = {
  name: '', startDate: '', endDate: '', status: 'draft', description: '',
  targetType: 'value', slabs: [{ min: 10000, max: 24999, gift: '' }],
  enrolled: [],
}

export default function Schemes() {
  const { data, addItem, updateItem, deleteItem } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [showEnroll, setShowEnroll] = useState(null)
  const [selectedChemists, setSelectedChemists] = useState([])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = s => { setEditing(s.id); setForm({ ...s, slabs: [...s.slabs] }); setShowModal(true) }

  const addSlab = () => setForm(f => ({ ...f, slabs: [...f.slabs, { min: 0, max: 0, gift: '' }] }))
  const removeSlab = idx => setForm(f => ({ ...f, slabs: f.slabs.filter((_, i) => i !== idx) }))
  const updateSlab = (idx, key, val) => setForm(f => {
    const slabs = [...f.slabs]
    slabs[idx] = { ...slabs[idx], [key]: key === 'gift' ? val : Number(val) }
    return { ...f, slabs }
  })

  const handleSave = () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error('Name and dates required'); return }
    if (editing) {
      updateItem('schemes', editing, { ...form, totalEnrolled: form.enrolled.length })
      toast.success('Scheme updated')
    } else {
      addItem('schemes', { ...form, totalEnrolled: form.enrolled.length })
      toast.success('Scheme created')
    }
    setShowModal(false)
  }

  const openEnroll = s => { setShowEnroll(s); setSelectedChemists([...s.enrolled]) }
  const toggleChemist = id => setSelectedChemists(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const saveEnrollment = () => {
    updateItem('schemes', showEnroll.id, { enrolled: selectedChemists, totalEnrolled: selectedChemists.length })
    // Update chemist activeSchemes count
    data.chemists.forEach(c => {
      const schemeCount = data.schemes.filter(s => s.id !== showEnroll.id ? s.enrolled?.includes(c.id) : selectedChemists.includes(c.id)).length
    })
    toast.success(`${selectedChemists.length} chemists enrolled`)
    setShowEnroll(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Star size={22} className="text-pink-400" /> Schemes</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create and manage chemist loyalty schemes</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> New Scheme</button>
      </div>

      <div className="space-y-4">
        {data.schemes.map(s => (
          <div key={s.id} className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-white">{s.name}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-slate-400">{s.description}</p>
                <p className="text-xs text-slate-500 mt-1">{s.startDate} → {s.endDate} · Target: {s.targetType === 'value' ? 'Value (₹)' : 'Volume (Units)'}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Users size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">{s.enrolled?.length || 0} Chemists</span>
              </div>
            </div>

            {/* Slabs */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reward Slabs</p>
              <div className="space-y-2">
                {s.slabs?.map((sl, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg border border-dark-border">
                    <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-xs font-bold text-brand-primary flex-shrink-0">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{sl.gift}</p>
                      <p className="text-xs text-slate-400">
                        {s.targetType === 'value' ? `₹${sl.min.toLocaleString('en-IN')} – ${sl.max > sl.min ? '₹' + sl.max.toLocaleString('en-IN') : '∞'}` : `${sl.min} – ${sl.max || '∞'} units`}
                      </p>
                    </div>
                    <Target size={15} className="text-pink-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-border">
              <button onClick={() => openEnroll(s)} className="btn-secondary py-1.5 text-xs"><Users size={13} /> Manage Enrollment</button>
              <button onClick={() => openEdit(s)} className="btn-secondary py-1.5 text-xs"><Edit2 size={13} /> Edit Scheme</button>
              <button onClick={() => { updateItem('schemes', s.id, { status: s.status === 'active' ? 'draft' : 'active' }) }} className="btn-secondary py-1.5 text-xs">
                {s.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        {data.schemes.length === 0 && <div className="glass-card p-10 text-center text-slate-500">No schemes created yet</div>}
      </div>

      {/* Scheme Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Scheme' : 'New Scheme'} size="lg">
        <div className="space-y-5">
          <div className="form-grid">
            <div className="md:col-span-2">
              <label className="label">Scheme Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Q1 Mega Scheme 2024" />
            </div>
            <div>
              <label className="label">Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Target Type</label>
              <select value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))} className="input-field">
                <option value="value">Value-based (₹ Amount)</option>
                <option value="volume">Volume-based (Box Count)</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows={2} placeholder="Brief scheme description..." />
            </div>
          </div>

          {/* Slabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Reward Slabs</label>
              <button onClick={addSlab} className="text-xs text-brand-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Slab</button>
            </div>
            <div className="space-y-3">
              {form.slabs.map((sl, i) => (
                <div key={i} className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-brand-primary">Slab {String.fromCharCode(65 + i)}</span>
                    {i > 0 && <button onClick={() => removeSlab(i)} className="text-red-400 hover:text-red-300"><X size={13} /></button>}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Min {form.targetType === 'value' ? '(₹)' : '(Units)'}</label>
                      <input type="number" value={sl.min} onChange={e => updateSlab(i, 'min', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="label">Max (0=unlimited)</label>
                      <input type="number" value={sl.max} onChange={e => updateSlab(i, 'max', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="label">Gift Article</label>
                      <input value={sl.gift} onChange={e => updateSlab(i, 'gift', e.target.value)} className="input-field" placeholder="1x Smartwatch" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-dark-border">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1 justify-center">Save Scheme</button>
          </div>
        </div>
      </Modal>

      {/* Enrollment Modal */}
      {showEnroll && (
        <Modal open={!!showEnroll} onClose={() => setShowEnroll(null)} title={`Enroll Chemists — ${showEnroll.name}`}>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">{selectedChemists.length} chemist(s) selected</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.chemists.map(c => (
                <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedChemists.includes(c.id) ? 'border-brand-primary/50 bg-brand-primary/10' : 'border-dark-border hover:bg-dark-hover'}`}>
                  <input type="checkbox" checked={selectedChemists.includes(c.id)} onChange={() => toggleChemist(c.id)} className="accent-brand-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{c.name} — {c.shop}</p>
                    <p className="text-xs text-slate-400">{c.territory} · {c.zone}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-4 border-t border-dark-border">
              <button onClick={() => setShowEnroll(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveEnrollment} className="btn-primary flex-1 justify-center">Save Enrollment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
