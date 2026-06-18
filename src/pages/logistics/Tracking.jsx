import React, { useState } from 'react'
import { MapPin, Search, Truck, CheckCircle, Clock, Package, ArrowRight } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { StatusBadge } from '../../components/ui/Badge'

export default function Tracking() {
  const { data } = useApp()
  const [search, setSearch] = useState('')

  const filtered = data.dispatches.filter(d =>
    d.dispatchNo?.toLowerCase().includes(search.toLowerCase()) ||
    d.trackingNo?.toLowerCase().includes(search.toLowerCase()) ||
    d.toName?.toLowerCase().includes(search.toLowerCase())
  )

  const statusIcon = (status) => {
    if (status === 'delivered') return <CheckCircle size={16} className="text-emerald-400" />
    if (status === 'in_transit') return <Truck size={16} className="text-blue-400" />
    return <Clock size={16} className="text-slate-400" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><MapPin size={22} className="text-amber-400" /> Live Tracking</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time shipment status for all dispatches</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: data.dispatches.filter(d => d.status === 'pending').length, color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
          { label: 'In Transit', count: data.dispatches.filter(d => d.status === 'in_transit').length, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Truck },
          { label: 'Delivered', count: data.dispatches.filter(d => d.status === 'delivered').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon size={17} className={s.color} /></div>
            <div><p className="text-xl font-bold text-white">{s.count}</p><p className="text-xs text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search by tracking ID or dispatch no..." />
      </div>

      {/* Tracking cards */}
      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className={`glass-card p-5 ${d.status === 'in_transit' ? 'border-blue-500/30' : d.status === 'delivered' ? 'border-emerald-500/30' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                {statusIcon(d.status)}
                <div>
                  <p className="font-mono text-amber-400 text-sm font-semibold">{d.dispatchNo}</p>
                  <p className="text-white font-medium">{d.product}</p>
                </div>
              </div>
              <StatusBadge status={d.status} />
            </div>

            {/* Route */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-dark-bg rounded-xl border border-dark-border">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">From</p>
                <p className="text-sm text-white font-medium">{d.from}</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex-1 h-0.5 bg-dark-border" />
                <Truck size={16} className={`mx-2 flex-shrink-0 ${d.status === 'in_transit' ? 'text-blue-400' : d.status === 'delivered' ? 'text-emerald-400' : 'text-slate-600'}`} />
                <div className="flex-1 h-0.5 bg-dark-border" />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase">To ({d.toType})</p>
                <p className="text-sm text-white font-medium">{d.toName}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Qty</p>
                <p className="text-white font-medium">{d.qty?.toLocaleString('en-IN')} {d.units}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Batch</p>
                <p className="font-mono text-purple-400">{d.batchNo}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Transporter</p>
                <p className="text-white">{d.transporter || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Tracking No.</p>
                <p className="font-mono text-blue-400">{d.trackingNo || '—'}</p>
              </div>
              {d.driverName && <>
                <div>
                  <p className="text-slate-500 uppercase text-[10px] mb-0.5">Driver</p>
                  <p className="text-white">{d.driverName}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase text-[10px] mb-0.5">Vehicle</p>
                  <p className="font-mono text-white">{d.vehicleNo}</p>
                </div>
              </>}
              {d.dispatchDate && <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Dispatched</p>
                <p className="text-white">{d.dispatchDate}</p>
              </div>}
              {d.deliveryDate && <div>
                <p className="text-slate-500 uppercase text-[10px] mb-0.5">Delivered</p>
                <p className="text-emerald-400 font-medium">{d.deliveryDate}</p>
              </div>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="glass-card p-10 text-center text-slate-500 text-sm">No dispatches found</div>}
      </div>
    </div>
  )
}
