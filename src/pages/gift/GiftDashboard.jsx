import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Gift, Users, Star, Package, AlertTriangle, TrendingUp,
  CheckCircle, Clock, Download, Target, Truck, BarChart2,
  ChevronRight, Zap
} from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { exportMultiSheet } from '../../utils/exportUtils'

const BASE = import.meta.env.VITE_API_URL || '/api'
function getToken() {
  try { return JSON.parse(localStorage.getItem('pharma_user') || '{}').token } catch { return null }
}
const COLORS = ['#00e5ff', '#10b981', '#f59e0b', '#ef4444', '#bc8cff', '#ff9f43']
const fmt = n => { const v = parseFloat(n)||0; return v>=1e5?`₹${(v/1e5).toFixed(1)}L`:`₹${v.toLocaleString('en-IN',{maximumFractionDigits:0})}` }

// Scheme analytics loader
function useSchemeAnalytics(schemes) {
  const [analytics, setAnalytics] = useState({})
  useEffect(() => {
    if (!schemes?.length) return
    const active = schemes.filter(s => s.status === 'active')
    Promise.all(active.map(async s => {
      try {
        const r = await fetch(`${BASE}/gift/schemes/${s.id}/analytics`, { headers: { Authorization: `Bearer ${getToken()}` } })
        if (!r.ok) return null
        return { id: s.id, ...(await r.json()) }
      } catch { return null }
    })).then(results => {
      const map = {}
      results.filter(Boolean).forEach(r => { map[r.id] = r })
      setAnalytics(map)
    })
  }, [schemes?.length])
  return analytics
}

// Per-scheme stats calculation
function calcSchemeStats(schemeData, slabs = []) {
  if (!schemeData?.chemists) return { enrolled: 0, qualified: 0, onTrack: 0, behind: 0, totalPurchased: 0, chemists: [] }
  const now = new Date()
  const start = new Date(schemeData.scheme?.start_date)
  const end   = new Date(schemeData.scheme?.end_date)
  const totalDays   = Math.max((end - start) / 86400000, 1)
  const elapsedDays = Math.min((now - start) / 86400000, totalDays)
  const remainDays  = Math.max(totalDays - elapsedDays, 1)
  const elapsedFrac = elapsedDays / totalDays

  let qualified = 0, onTrack = 0, behind = 0, totalPurchased = 0
  const sortedSlabs = [...slabs].sort((a, b) => a.min - b.min)
  const topTarget = sortedSlabs.length ? sortedSlabs[sortedSlabs.length - 1].min : 0

  const chemists = schemeData.chemists.map(c => {
    const purchased = parseFloat(c.total_purchased) || 0
    totalPurchased += purchased
    const isQualified = sortedSlabs.some(sl => purchased >= sl.min)
    const velocity = elapsedDays > 0 ? purchased / elapsedDays : 0
    const needed = topTarget > 0 ? Math.max(topTarget - purchased, 0) / remainDays : 0
    const track = velocity >= needed || isQualified

    if (isQualified) qualified++
    else if (track) onTrack++
    else behind++

    const currentSlab = [...sortedSlabs].reverse().find(sl => purchased >= sl.min)
    const nextSlab = sortedSlabs.find(sl => purchased < sl.min)
    return { ...c, purchased, isQualified, onTrack: track, currentSlab, nextSlab, velocity }
  })

  return { enrolled: chemists.length, qualified, onTrack, behind, totalPurchased, chemists, elapsedFrac }
}

// Gift demand prediction: how many of each gift article will be needed
function predictGiftDemand(analyticsMap, schemesData) {
  const demand = {}
  schemesData.forEach(scheme => {
    const a = analyticsMap[scheme.id]
    if (!a) return
    const stats = calcSchemeStats(a, scheme.slabs || [])
    ;(scheme.slabs || []).forEach(slab => {
      const qualifyingCount = stats.chemists.filter(c =>
        c.isQualified ? (c.currentSlab?.gift === slab.gift) : (c.onTrack && c.nextSlab?.gift === slab.gift)
      ).length
      if (!slab.gift) return
      if (!demand[slab.gift]) demand[slab.gift] = { gift: slab.gift, confirmed: 0, expected: 0 }
      demand[slab.gift].confirmed += stats.chemists.filter(c => c.currentSlab?.gift === slab.gift).length
      demand[slab.gift].expected  += stats.chemists.filter(c => c.onTrack && !c.isQualified && c.nextSlab?.gift === slab.gift).length
    })
  })
  return Object.values(demand)
}

export default function GiftDashboard() {
  const navigate = useNavigate()
  const { data }  = useApp()
  const analytics = useSchemeAnalytics(data.schemes)

  const totalSales    = data.distributorInvoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const activeSchemes = data.schemes.filter(s => s.status === 'active').length
  const totalChemists = data.chemists.length
  const pendingGifts  = data.giftFulfillments.filter(g => g.status !== 'delivered').length

  const topStats = [
    { label: 'Total Sales Recorded', value: fmt(totalSales), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', path: '/gift/data-entry' },
    { label: 'Active Schemes',        value: activeSchemes,   icon: Star,        color: 'text-pink-400', bg: 'bg-pink-500/10',  path: '/gift/schemes' },
    { label: 'Chemists Enrolled',     value: totalChemists,   icon: Users,       color: 'text-emerald-400', bg: 'bg-emerald-500/10', path: '/gift/chemists' },
    { label: 'Pending Disbursals',    value: pendingGifts,    icon: Package,     color: 'text-amber-400', bg: 'bg-amber-500/10', path: '/gift/fulfillment' },
  ]

  const lowStockItems = data.giftArticles.filter(g => g.status === 'low' || g.status === 'out_of_stock')
  const inventoryData = data.giftArticles.map(g => ({ name: g.name, available: g.available, allocated: g.allocated, toOrder: g.toBeOrdered }))

  const demandPrediction = useMemo(() =>
    predictGiftDemand(analytics, data.schemes),
    [analytics, data.schemes]
  )

  const handleExport = () => {
    exportMultiSheet([
      { name: 'Chemists', rows: data.chemists.map(c => ({ Name: c.name, Shop: c.shop||c.shop_name, Territory: c.territory, Zone: c.zone, 'Total Purchase': c.totalPurchase, Status: c.status })) },
      { name: 'Gift Inventory', rows: data.giftArticles.map(g => ({ Name: g.name, Brand: g.brand, Available: g.available, Allocated: g.allocated, 'To Order': g.toBeOrdered, 'Unit Cost': g.unitCost })) },
      { name: 'Fulfillments', rows: data.giftFulfillments.map(f => ({ Chemist: f.chemist, Gift: f.gift, Scheme: f.scheme, Status: f.status, Courier: f.courier, Tracking: f.trackingId })) },
    ], 'gift_dashboard')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Gift className="text-pink-400" size={26} /> Gift Article Management</h1>
          <p className="text-slate-400 text-sm mt-1">Chemist loyalty programs, gift inventory, dispatch & fulfillment</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm"><Download size={14} /> Export Excel</button>
          <button onClick={() => navigate('/gift/schemes')} className="btn-primary flex items-center gap-2"><Star size={15} /> Manage Schemes</button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(s => (
          <div key={s.label} onClick={() => navigate(s.path)} className="stat-card cursor-pointer hover:border-brand-primary/40">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon size={20} className={s.color} /></div>
            <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="glass-card p-4 border-amber-500/30">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-400" /><h3 className="text-sm font-semibold text-amber-400">Stock Alerts ({lowStockItems.length})</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lowStockItems.map(g => (
              <div key={g.id} className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div><p className="text-sm text-white font-medium">{g.name}</p><p className="text-xs text-slate-400">{g.brand} {g.model}</p></div>
                <div className="text-right"><p className={`text-sm font-bold ${g.status==='out_of_stock'?'text-red-400':'text-amber-400'}`}>{g.available} units</p><p className="text-xs text-slate-500">{g.status==='out_of_stock'?'Out of Stock!':'Low Stock'}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SCHEME ANALYTICS ─────────────────────────────────────── */}
      <div>
        <h2 className="section-title mb-4"><Zap size={16} className="text-brand-primary" /> Scheme-wise Performance</h2>
        {!data.schemes.filter(s => s.status === 'active').length ? (
          <div className="glass-card text-center py-12 text-slate-400"><Star size={28} className="mx-auto mb-2 opacity-30" /><p>No active schemes</p></div>
        ) : (
          <div className="space-y-4">
            {data.schemes.filter(s => s.status === 'active').map(scheme => {
              const a = analytics[scheme.id]
              const stats = a ? calcSchemeStats(a, scheme.slabs || []) : null

              return (
                <div key={scheme.id} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-white">{scheme.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(scheme.start_date).toLocaleDateString('en-IN')} → {new Date(scheme.end_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <button onClick={() => navigate('/gift/chemists')} className="text-xs text-brand-primary hover:underline flex items-center gap-1">
                      View All Chemists <ChevronRight size={12} />
                    </button>
                  </div>

                  {!stats ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs"><div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /> Loading analytics...</div>
                  ) : (
                    <>
                      {/* Enrollment stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: 'Enrolled', value: stats.enrolled, color: 'text-white', icon: Users },
                          { label: 'Qualified 🎁', value: stats.qualified, color: 'text-emerald-400', icon: CheckCircle },
                          { label: 'On Track', value: stats.onTrack, color: 'text-blue-400', icon: TrendingUp },
                          { label: 'Behind', value: stats.behind, color: 'text-amber-400', icon: AlertTriangle },
                        ].map(s => (
                          <div key={s.label} className="bg-dark-hover rounded-xl p-3 text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-dark-hover">
                          {stats.enrolled > 0 && <>
                            <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.qualified/stats.enrolled)*100}%` }} title="Qualified" />
                            <div className="bg-blue-500 transition-all" style={{ width: `${(stats.onTrack/stats.enrolled)*100}%` }} title="On Track" />
                            <div className="bg-amber-500 transition-all" style={{ width: `${(stats.behind/stats.enrolled)*100}%` }} title="Behind" />
                          </>}
                        </div>
                        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Qualified</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />On Track</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Behind</span>
                        </div>
                      </div>

                      {/* Slab-wise breakdown */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-400 font-medium">Slab Progress</p>
                        {(scheme.slabs || []).map((slab, i) => {
                          const count = stats.chemists.filter(c => c.purchased >= slab.min).length
                          const pct = stats.enrolled > 0 ? Math.round((count/stats.enrolled)*100) : 0
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="text-[10px] text-slate-400 w-24 flex-shrink-0 truncate">
                                {scheme.target_type === 'value' ? fmt(slab.min) : `${slab.min} units`}+
                              </div>
                              <div className="flex-1 h-2 bg-dark-hover rounded-full overflow-hidden">
                                <div className="h-full bg-brand-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-white w-14 flex-shrink-0">{count}/{stats.enrolled} ({pct}%)</span>
                              <span className="text-[10px] text-slate-400 w-24 flex-shrink-0 truncate">🎁 {slab.gift}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Top performers */}
                      {stats.chemists.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-slate-400 font-medium mb-2">Top Performers</p>
                          <div className="overflow-x-auto rounded-lg border border-dark-border">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-dark-border">
                                {['Chemist', 'Territory', 'Purchased', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium">{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {[...stats.chemists].sort((a, b) => b.purchased - a.purchased).slice(0, 5).map(c => (
                                  <tr key={c.id} className="border-b border-dark-border/50 hover:bg-dark-hover/40">
                                    <td className="px-3 py-2 text-white font-medium">{c.name}</td>
                                    <td className="px-3 py-2 text-slate-400">{c.territory}</td>
                                    <td className="px-3 py-2 text-emerald-400 font-medium">{fmt(c.purchased)}</td>
                                    <td className="px-3 py-2">
                                      {c.isQualified
                                        ? <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">Qualified</span>
                                        : c.onTrack
                                          ? <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px]">On Track</span>
                                          : <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">Behind</span>
                                      }
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── GIFT DEMAND PREDICTION ────────────────────────────────── */}
      {demandPrediction.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="section-title mb-4"><Target size={16} className="text-violet-400" /> Gift Demand Prediction</h2>
          <p className="text-xs text-slate-400 mb-4">Based on current pace — estimated gift requirements across all active schemes</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-dark-border">
                {['Gift Article', 'Confirmed (already qualified)', 'Expected (on-track chemists)', 'Total Needed'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs text-slate-400 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {demandPrediction.map((d, i) => (
                  <tr key={i} className="border-b border-dark-border/50 hover:bg-dark-hover/40">
                    <td className="px-4 py-2.5 text-white font-medium">{d.gift}</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-semibold">{d.confirmed}</td>
                    <td className="px-4 py-2.5 text-blue-400">{d.expected}</td>
                    <td className="px-4 py-2.5">
                      <span className="bg-brand-primary/20 text-brand-primary font-bold px-3 py-1 rounded-lg text-sm">{d.confirmed + d.expected}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cross-check with inventory */}
          <div className="mt-4 p-3 bg-dark-hover rounded-xl border border-dark-border/50">
            <p className="text-xs text-slate-400 font-medium mb-2">Inventory vs. Demand</p>
            <div className="space-y-1.5">
              {demandPrediction.map((d, i) => {
                const article = data.giftArticles.find(a => a.name === d.gift)
                const available = article?.available || 0
                const needed = d.confirmed + d.expected
                const ok = available >= needed
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-300 w-36 truncate">{d.gift}</span>
                    <span className="text-slate-400">Available: <strong className="text-white">{available}</strong></span>
                    <span className="text-slate-400">Needed: <strong className="text-white">{needed}</strong></span>
                    {ok
                      ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> Sufficient</span>
                      : <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={11} /> Short by {needed - available}</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CHARTS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Package size={17} className="text-pink-400" /> Gift Inventory Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inventoryData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="available" name="Available" fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="allocated" name="Allocated" fill="#00e5ff" radius={[3,3,0,0]} />
              <Bar dataKey="toOrder" name="To Order" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Users size={17} className="text-emerald-400" /> Chemists by Zone</h3>
          {data.chemists.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No chemists yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={Object.entries(data.chemists.reduce((acc, c) => { const z = c.zone || 'Unknown'; acc[z] = (acc[z]||0)+1; return acc }, {})).map(([name, value]) => ({ name, value }))}
                  cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                >
                  {data.chemists.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #21262d', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent dispatch invoices shortcut */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title"><Truck size={16} className="text-blue-400" /> Gift Dispatch</h3>
          <button onClick={() => navigate('/gift/dispatch')} className="text-xs text-brand-primary hover:underline flex items-center gap-1">
            Manage Dispatches <ChevronRight size={12} />
          </button>
        </div>
        <p className="text-xs text-slate-400">Create dispatch invoices when gifts are sent via distributor to chemists. Track delivery, returns, and damages per chemist.</p>
        <button onClick={() => navigate('/gift/dispatch')} className="mt-3 btn-primary text-sm flex items-center gap-2">
          <Truck size={14} /> Open Dispatch Module
        </button>
      </div>

      {/* Recent fulfillments */}
      <div className="glass-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <h3 className="section-title"><CheckCircle size={17} className="text-pink-400" /> Recent Fulfillments</h3>
          <button onClick={() => navigate('/gift/fulfillment')} className="text-xs text-brand-primary hover:underline">View All</button>
        </div>
        {!data.giftFulfillments.length ? (
          <div className="text-center py-10 text-slate-400 text-sm">No fulfillments yet</div>
        ) : (
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
                {data.giftFulfillments.slice(0, 8).map(f => (
                  <tr key={f.id} className="table-row">
                    <td className="table-cell font-medium text-white">{f.chemist}</td>
                    <td className="table-cell">{f.gift}</td>
                    <td className="table-cell text-xs text-slate-400">{f.scheme}</td>
                    <td className="table-cell">
                      <span className={`badge ${f.status==='delivered'?'badge-success':f.status==='dispatched'?'badge-info':'badge-warning'}`}>{f.status}</span>
                    </td>
                    <td className="table-cell text-xs">
                      {f.courier ? <span className="text-slate-300">{f.courier} · <span className="font-mono text-blue-400">{f.trackingId}</span></span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
