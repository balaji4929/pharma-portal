import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Send, MapPin, CheckCircle, Clock, Package, Building2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { StatusBadge } from '../../components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { month: 'Oct', dispatches: 8, delivered: 7 },
  { month: 'Nov', dispatches: 12, delivered: 11 },
  { month: 'Dec', dispatches: 10, delivered: 9 },
  { month: 'Jan', dispatches: 15, delivered: 14 },
  { month: 'Feb', dispatches: 9, delivered: 6 },
]

export default function LogisticsDashboard() {
  const navigate = useNavigate()
  const { data } = useApp()

  const pending = data.dispatches.filter(d => d.status === 'pending').length
  const inTransit = data.dispatches.filter(d => d.status === 'in_transit').length
  const delivered = data.dispatches.filter(d => d.status === 'delivered').length
  const totalWHCapacity = data.warehouses.reduce((s, w) => s + w.capacity, 0)
  const totalWHUsed = data.warehouses.reduce((s, w) => s + w.used, 0)

  const stats = [
    { label: 'Pending Dispatch', value: pending, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', path: '/logistics/dispatches' },
    { label: 'In Transit', value: inTransit, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/logistics/tracking' },
    { label: 'Delivered', value: delivered, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/logistics/dispatches' },
    { label: 'Transporters', value: data.transporters.length, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10', path: '/logistics/transporters' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Truck className="text-amber-400" size={26} /> Logistics Management</h1>
          <p className="text-slate-400 text-sm mt-1">Stock movement from warehouse → distributors → chemists</p>
        </div>
        <button onClick={() => navigate('/logistics/dispatches')} className="btn-primary"><Send size={15} /> New Dispatch</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} onClick={() => navigate(s.path)} className="stat-card cursor-pointer hover:border-brand-primary/40">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon size={20} className={s.color} /></div>
            <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Warehouse usage */}
      <div className="glass-card p-5">
        <h3 className="section-title mb-4"><Package size={17} className="text-amber-400" /> Warehouse Capacity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.warehouses.map(w => {
            const usedPct = Math.round((w.used / w.capacity) * 100)
            return (
              <div key={w.id} className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{w.code} — {w.name}</p>
                    <p className="text-xs text-slate-400">{w.address}</p>
                  </div>
                  <span className={`badge ${w.type === 'primary' ? 'badge-info' : 'badge-gray'}`}>{w.type}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Used: <span className="text-white font-medium">{w.used.toLocaleString('en-IN')}</span></span>
                  <span className="text-slate-400">Capacity: <span className="text-white font-medium">{w.capacity.toLocaleString('en-IN')}</span></span>
                </div>
                <div className="progress-bar">
                  <div className={`h-full rounded-full transition-all duration-700 ${usedPct > 80 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-brand-primary'}`} style={{ width: `${usedPct}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">{usedPct}% utilized</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart + recent table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Truck size={17} className="text-amber-400" /> Monthly Dispatch vs Delivery</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="dispatches" name="Dispatched" fill="#00e5ff" radius={[4,4,0,0]} />
              <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
            <h3 className="section-title"><MapPin size={17} className="text-amber-400" /> Live Tracking</h3>
            <button onClick={() => navigate('/logistics/tracking')} className="text-xs text-brand-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-dark-border">
                <th className="table-header">Dispatch No.</th>
                <th className="table-header">To</th>
                <th className="table-header">Courier</th>
                <th className="table-header">Status</th>
              </tr></thead>
              <tbody>
                {data.dispatches.map(d => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell font-mono text-xs text-amber-400">{d.dispatchNo}</td>
                    <td className="table-cell max-w-32 truncate text-sm">{d.toName}</td>
                    <td className="table-cell text-xs text-slate-400">{d.transporter || '—'}</td>
                    <td className="table-cell"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
