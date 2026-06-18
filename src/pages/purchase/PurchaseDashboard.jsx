import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, FileText, ClipboardList, PackageCheck, CreditCard, TrendingUp, AlertTriangle, Building2 } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { StatusBadge } from '../../components/ui/Badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const chartData = [
  { month: 'Oct', orders: 3, value: 280000 },
  { month: 'Nov', orders: 5, value: 420000 },
  { month: 'Dec', orders: 4, value: 380000 },
  { month: 'Jan', orders: 6, value: 560000 },
  { month: 'Feb', orders: 4, value: 390000 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-xs">
        <p className="text-white font-medium">{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.name === 'Value' ? `₹${p.value.toLocaleString('en-IN')}` : p.value}</p>)}
      </div>
    )
  }
  return null
}

export default function PurchaseDashboard() {
  const { data } = useApp()
  const navigate = useNavigate()

  const stats = [
    { label: 'Quote Requests', value: data.quotationRequests.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/purchase/quote-requests' },
    { label: 'Active POs', value: data.purchaseOrders.filter(p => p.status !== 'received').length, icon: ClipboardList, color: 'text-indigo-400', bg: 'bg-indigo-500/10', path: '/purchase/orders' },
    { label: 'Batches Received', value: data.batchReceipts.length, icon: PackageCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/purchase/receipts' },
    { label: 'Manufacturers', value: data.manufacturers.length, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10', path: '/purchase/manufacturers' },
  ]

  const pendingPayments = data.purchaseOrders.filter(po => po.totalAmount - (po.advancePaid || 0) > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-blue-400" size={26} /> Purchase Department
          </h1>
          <p className="text-slate-400 text-sm mt-1">Procurement lifecycle — from quote to batch receipt</p>
        </div>
        <button onClick={() => navigate('/purchase/quote-requests')} className="btn-primary">
          <FileText size={15} /> New Quote Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} onClick={() => navigate(s.path)} className="stat-card cursor-pointer hover:border-brand-primary/40">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><TrendingUp size={18} className="text-blue-400" /> Monthly PO Value (₹)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Value" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><ClipboardList size={18} className="text-indigo-400" /> Orders Count Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="orders" name="Orders" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent POs */}
        <div className="glass-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
            <h3 className="section-title"><ClipboardList size={17} className="text-indigo-400" /> Recent Purchase Orders</h3>
            <button onClick={() => navigate('/purchase/orders')} className="text-xs text-brand-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-dark-border">
                <th className="table-header">PO No.</th>
                <th className="table-header">Product</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
              </tr></thead>
              <tbody>
                {data.purchaseOrders.map(po => (
                  <tr key={po.id} className="table-row cursor-pointer" onClick={() => navigate('/purchase/orders')}>
                    <td className="table-cell font-mono text-blue-400 text-xs">{po.poNo}</td>
                    <td className="table-cell">{po.product}</td>
                    <td className="table-cell font-medium">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="table-cell"><StatusBadge status={po.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment alerts */}
        <div className="glass-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
            <h3 className="section-title"><CreditCard size={17} className="text-amber-400" /> Payment Pending</h3>
            <button onClick={() => navigate('/purchase/payments')} className="text-xs text-brand-primary hover:underline">View All</button>
          </div>
          <div className="p-4 space-y-3">
            {pendingPayments.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">All payments up to date ✓</p>
            ) : pendingPayments.map(po => {
              const balance = po.totalAmount - (po.advancePaid || 0)
              return (
                <div key={po.id} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{po.product}</p>
                    <p className="text-xs text-slate-400">{po.poNo} · Balance due</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-amber-400">₹{balance.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-500">Balance</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
