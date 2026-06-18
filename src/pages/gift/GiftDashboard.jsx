import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Users, Star, Package, AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#00e5ff', '#00b8d4', '#10b981', '#f59e0b', '#ef4444']

export default function GiftDashboard() {
  const navigate = useNavigate()
  const { data } = useApp()

  const totalSales = data.distributorInvoices.reduce((s, i) => s + i.amount, 0)
  const activeSchemes = data.schemes.filter(s => s.status === 'active').length
  const totalChemists = data.chemists.length
  const pendingGifts = data.giftFulfillments.filter(g => g.status !== 'delivered').length

  const stats = [
    { label: 'Total Sales Recorded', value: `₹${(totalSales/100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/gift/data-entry' },
    { label: 'Active Schemes', value: activeSchemes, icon: Star, color: 'text-pink-400', bg: 'bg-pink-500/10', path: '/gift/schemes' },
    { label: 'Chemists Enrolled', value: totalChemists, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/gift/chemists' },
    { label: 'Pending Gift Disbursals', value: pendingGifts, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/gift/fulfillment' },
  ]

  const inventoryData = data.giftArticles.map(g => ({
    name: g.name,
    available: g.available,
    allocated: g.allocated,
    toOrder: g.toBeOrdered,
  }))

  const chemistZoneData = [
    { name: 'Mumbai North', value: data.chemists.filter(c => c.zone === 'Mumbai North').length },
    { name: 'Ahmedabad', value: data.chemists.filter(c => c.zone === 'Ahmedabad').length },
  ]

  const lowStockItems = data.giftArticles.filter(g => g.status === 'low' || g.status === 'out_of_stock')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Gift className="text-pink-400" size={26} /> Gift Article Management</h1>
          <p className="text-slate-400 text-sm mt-1">Chemist loyalty programs, gift inventory & fulfillment</p>
        </div>
        <button onClick={() => navigate('/gift/schemes')} className="btn-primary"><Star size={15} /> Manage Schemes</button>
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

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="glass-card p-4 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Stock Alerts ({lowStockItems.length})</h3>
          </div>
          <div className="space-y-2">
            {lowStockItems.map(g => (
              <div key={g.id} className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div>
                  <p className="text-sm text-white font-medium">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.brand} {g.model}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${g.status === 'out_of_stock' ? 'text-red-400' : 'text-amber-400'}`}>{g.available} units</p>
                  <p className="text-xs text-slate-500">{g.status === 'out_of_stock' ? 'Out of Stock!' : 'Low Stock'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Package size={17} className="text-pink-400" /> Gift Inventory Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inventoryData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="available" name="Available" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="allocated" name="Allocated" fill="#00e5ff" radius={[4,4,0,0]} />
              <Bar dataKey="toOrder" name="To Order" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Users size={17} className="text-emerald-400" /> Chemists by Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chemistZoneData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {chemistZoneData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent fulfillments */}
      <div className="glass-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <h3 className="section-title"><CheckCircle size={17} className="text-pink-400" /> Recent Fulfillments</h3>
          <button onClick={() => navigate('/gift/fulfillment')} className="text-xs text-brand-primary hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-dark-border">
              <th className="table-header">Chemist</th>
              <th className="table-header">Gift</th>
              <th className="table-header">Scheme</th>
              <th className="table-header">Status</th>
              <th className="table-header">Courier / Tracking</th>
            </tr></thead>
            <tbody>
              {data.giftFulfillments.map(f => (
                <tr key={f.id} className="table-row">
                  <td className="table-cell font-medium text-white">{f.chemist}</td>
                  <td className="table-cell">{f.gift}</td>
                  <td className="table-cell text-xs text-slate-400">{f.scheme}</td>
                  <td className="table-cell">
                    <span className={`badge ${f.status === 'delivered' ? 'badge-success' : f.status === 'dispatched' ? 'badge-info' : 'badge-warning'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="table-cell text-xs">
                    {f.courier ? <span className="text-slate-300">{f.courier} · <span className="font-mono text-blue-400">{f.trackingId}</span></span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
