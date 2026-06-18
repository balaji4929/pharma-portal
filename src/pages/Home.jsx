import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Gift, Truck, BarChart2, TrendingUp, Package, Users, ArrowRight, Activity, Zap, Building2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

// Distributor stats from localStorage
function getDistributorStats() {
  try {
    const data = localStorage.getItem('pharma_distributors')
    if (!data) return [{ label: 'No data yet', value: '—' }, { label: 'Upload to start', value: '↑' }, { label: 'Ledger analysis', value: '✓' }]
    const list = JSON.parse(data)
    const outstanding = list.reduce((s, d) => s + (d.outstanding || 0), 0)
    const fmt = n => n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : n > 0 ? `₹${Math.round(n).toLocaleString()}` : '—'
    return [
      { label: 'Distributors', value: list.length },
      { label: 'Outstanding', value: fmt(outstanding) },
      { label: 'Parties', value: list.length > 0 ? 'Active' : '—' },
    ]
  } catch { return [{ label: 'Upload Ledger', value: '↑' }, { label: 'Party-wise', value: '✓' }, { label: 'Collections', value: '📊' }] }
}

// Sales stats from localStorage
function getSalesStats() {
  try {
    const meta = localStorage.getItem('pharma_sales_meta')
    const data = localStorage.getItem('pharma_sales_data')
    if (!meta || !data) return [{ label: 'No data yet', value: '—' }, { label: 'Upload to start', value: '↑' }, { label: 'Analysis ready', value: '✓' }]
    const m = JSON.parse(meta)
    const d = JSON.parse(data)
    const totalRev = d.reduce((s, r) => {
      const v = parseFloat(String(r.revenue ?? '').replace(/[₹$,\s]/g, ''))
      return s + (isNaN(v) ? 0 : v)
    }, 0)
    const fmtRev = totalRev >= 1e5 ? `₹${(totalRev/1e5).toFixed(1)}L` : totalRev > 0 ? `₹${totalRev.toFixed(0)}` : '—'
    return [
      { label: 'Products', value: new Set(d.map(r => r.product_name)).size },
      { label: 'Total Revenue', value: fmtRev },
      { label: 'Rows Loaded', value: m.rowCount },
    ]
  } catch { return [{ label: 'Upload Excel/CSV', value: '↑' }, { label: 'Auto-analysis', value: '✓' }, { label: 'Charts & Graphs', value: '📊' }] }
}

const modules = [
  {
    id: 'purchase',
    label: 'Purchase Department',
    description: 'Manufacturer communication, quotations, purchase orders, batch receipts & payment tracking',
    icon: ShoppingCart,
    path: '/purchase',
    gradient: 'from-blue-600 to-indigo-600',
    glow: 'group-hover:shadow-blue-500/25',
    stats: (data) => [
      { label: 'Active POs', value: data.purchaseOrders.filter(p => p.status !== 'received').length },
      { label: 'Pending Quotes', value: data.quotationRequests.filter(q => q.status === 'sent').length },
      { label: 'Manufacturers', value: data.manufacturers.length },
    ],
    features: ['Quote Request via Email', 'PO Management', 'Batch Receipt Tracking', 'Payment Records'],
  },
  {
    id: 'gift',
    label: 'Gift Article Management',
    description: 'Chemist loyalty schemes, distributor data entry, gift inventory & fulfillment lifecycle',
    icon: Gift,
    path: '/gift',
    gradient: 'from-pink-600 to-rose-600',
    glow: 'group-hover:shadow-pink-500/25',
    stats: (data) => [
      { label: 'Active Schemes', value: data.schemes.filter(s => s.status === 'active').length },
      { label: 'Enrolled Chemists', value: data.chemists.length },
      { label: 'Pending Gifts', value: data.giftFulfillments.filter(g => g.status !== 'delivered').length },
    ],
    features: ['Scheme Management', 'Chemist 360 View', 'Gift Inventory', 'Fulfillment Tracking'],
  },
  {
    id: 'logistics',
    label: 'Logistics Management',
    description: 'Stock dispatch from warehouse to distributors & chemists via transporters with live tracking',
    icon: Truck,
    path: '/logistics',
    gradient: 'from-amber-600 to-orange-600',
    glow: 'group-hover:shadow-amber-500/25',
    stats: (data) => [
      { label: 'In Transit', value: data.dispatches.filter(d => d.status === 'in_transit').length },
      { label: 'Pending Dispatch', value: data.dispatches.filter(d => d.status === 'pending').length },
      { label: 'Transporters', value: data.transporters.length },
    ],
    features: ['Dispatch Management', 'Transporter Registry', 'Live Tracking', 'Delivery Confirmation'],
  },
  {
    id: null, // accessible by all
    label: 'Sales Analysis',
    description: 'Upload your billing software export (Excel/CSV) for instant charts, top-product rankings, stock alerts & monthly trends',
    icon: BarChart2,
    path: '/sales',
    gradient: 'from-teal-500 to-cyan-500',
    glow: 'group-hover:shadow-cyan-500/25',
    stats: () => getSalesStats(),
    features: ['Excel / CSV Upload', 'Auto Column Detection', 'Revenue & Units Charts', 'Stock Level Alerts'],
  },
  {
    id: null,
    label: 'Distributor Ledger',
    description: 'Upload party-wise ledger exports from billing software — auto-populate collections, outstanding & sales per distributor',
    icon: Building2,
    path: '/distributors',
    gradient: 'from-violet-600 to-purple-600',
    glow: 'group-hover:shadow-purple-500/25',
    stats: () => getDistributorStats(),
    features: ['Multi-sheet Ledger Upload', 'Party-wise Sales & Collections', 'Outstanding Tracking', 'Collection Rate Analysis'],
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, canAccess } = useAuth()
  const { data } = useApp()

  const totalStats = [
    { label: 'Total Purchase Orders', value: data.purchaseOrders.length, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Schemes', value: data.schemes.filter(s => s.status === 'active').length, icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Chemists Enrolled', value: data.chemists.length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Dispatches Active', value: data.dispatches.filter(d => d.status === 'in_transit').length, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative glass-card p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-brand-accent/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-slate-400 mt-1">
                {user?.role === 'admin'
                  ? 'Full access — managing all departments'
                  : `Viewing ${user?.department || 'all'} department operations`}
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/20 border border-brand-primary/30 rounded-lg">
              <TrendingUp size={16} className="text-brand-primary" />
              <span className="text-brand-primary text-sm font-medium">Operations Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Super Dashboard CTA */}
      <div
        onClick={() => navigate('/super-dashboard')}
        className="relative glass-card p-5 overflow-hidden cursor-pointer group hover:border-brand-primary/40 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-primary to-brand-accent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Zap size={22} className="text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">Super Dashboard — Command Center</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified P&amp;L · Sales vs Purchase · Product Margins · Gift Distribution · Expense Tracker
            </p>
          </div>
          <div className="flex items-center gap-1 text-brand-primary text-sm font-medium group-hover:gap-2 transition-all flex-shrink-0">
            Open <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totalStats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Department Cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Departments</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map(mod => {
            const accessible = mod.id === null ? true : canAccess(mod.id)
            const stats = mod.stats(data)
            return (
              <div
                key={mod.id}
                onClick={() => accessible && navigate(mod.path)}
                className={`glass-card p-6 transition-all duration-300 group relative overflow-hidden
                  ${accessible
                    ? 'cursor-pointer hover:border-slate-600 hover:shadow-2xl ' + mod.glow
                    : 'opacity-50 cursor-not-allowed'
                  }`}
              >
                {/* Top gradient stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mod.gradient}`} />

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <mod.icon size={22} className="text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white mb-2">{mod.label}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{mod.description}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-xl font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-1 mb-5">
                  {mod.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mod.gradient}`} />
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {accessible && (
                  <div className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${mod.gradient} bg-clip-text text-transparent group-hover:gap-3 transition-all`}>
                    Open Module <ArrowRight size={14} className={`bg-gradient-to-r ${mod.gradient} text-white rounded-full`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
