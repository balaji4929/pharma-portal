import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Package, Gift, ShoppingCart, BarChart2,
  Upload, Plus, X, Check, FileSpreadsheet, AlertTriangle, Search,
  Trash2, Activity, DollarSign, Zap, Calculator, Edit2,
  ChevronDown, Award, Target, Building2, ArrowRight, Users, CreditCard
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { useApp } from '../../contexts/AppContext'
import toast from 'react-hot-toast'

// ── LocalStorage keys ─────────────────────────────────────────────────────────
const LS_EXPENSES     = 'pharma_expenses'
const LS_PROD_COSTS   = 'pharma_product_costs'
const LS_SALES_DATA   = 'pharma_sales_data'
const LS_DISTRIBUTORS = 'pharma_distributors'

// ── Constants ─────────────────────────────────────────────────────────────────
const COLORS = ['#00e5ff','#3fb950','#58a6ff','#d29922','#f85149','#bc8cff','#ff9f43','#26de81','#fd9644','#a29bfe']

const EXP_CATS = [
  'Manufacturing', 'Logistics', 'Marketing & Promotions',
  'Salaries & HR', 'Rent & Utilities', 'Administration', 'R&D', 'Other'
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const toNum = v => {
  if (v === undefined || v === null || v === '') return 0
  const n = parseFloat(String(v).replace(/[₹$,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

const fmt = n => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  return `${sign}₹${Math.round(abs).toLocaleString()}`
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, currency = true }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#00e5ff' }} className="mb-0.5">
          {p.name}: {currency ? fmt(p.value) : p.value?.toLocaleString?.()}
        </p>
      ))}
    </div>
  )
}

// ── Sort Icon ─────────────────────────────────────────────────────────────────
const SortChev = ({ field, sortField, sortDir }) => (
  <ChevronDown
    size={11}
    className={`inline ml-1 transition-transform ${
      field === sortField ? 'text-brand-primary' : 'text-slate-600'
    } ${field === sortField && sortDir === 'asc' ? 'rotate-180' : ''}`}
  />
)

// ─────────────────────────────────────────────────────────────────────────────
export default function SuperDashboard() {
  const navigate = useNavigate()
  const { data } = useApp()

  // ── State ────────────────────────────────────────────────────────────────
  const [expenses, setExpenses]         = useState([])
  const [productCosts, setProductCosts] = useState({})
  const [salesData, setSalesData]       = useState([])
  const [distributors, setDistributors] = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [editId, setEditId]             = useState(null)
  const [form, setForm]                 = useState({ date: '', category: '', description: '', department: '', amount: '' })
  const [expFilter, setExpFilter]       = useState('')
  const [expSort, setExpSort]           = useState({ field: 'date', dir: 'desc' })
  const [activeSection, setActiveSection] = useState('all') // all | revenue | costs | products | gifts | expenses

  const expFileRef  = useRef()
  const costFileRef = useRef()

  // ── Load from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const e = localStorage.getItem(LS_EXPENSES)
      const c = localStorage.getItem(LS_PROD_COSTS)
      const s = localStorage.getItem(LS_SALES_DATA)
      const d = localStorage.getItem(LS_DISTRIBUTORS)
      if (e) setExpenses(JSON.parse(e))
      if (c) setProductCosts(JSON.parse(c))
      if (s) setSalesData(JSON.parse(s))
      if (d) setDistributors(JSON.parse(d))
    } catch {}
  }, [])

  // ── Persist expenses ──────────────────────────────────────────────────────
  const saveExpenses = useCallback(list => {
    setExpenses(list)
    localStorage.setItem(LS_EXPENSES, JSON.stringify(list))
  }, [])

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const resetForm = () => setForm({ date: '', category: '', description: '', department: '', amount: '' })

  const openAdd = () => { resetForm(); setEditId(null); setShowForm(true) }

  const openEdit = exp => {
    setForm({ date: exp.date || '', category: exp.category || '', description: exp.description || '', department: exp.department || '', amount: String(exp.amount) })
    setEditId(exp.id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.date || !form.category || !form.amount) { toast.error('Date, category and amount are required'); return }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (editId !== null) {
      saveExpenses(expenses.map(e => e.id === editId ? { ...e, ...form, amount: amt } : e))
      toast.success('Expense updated')
    } else {
      saveExpenses([...expenses, { ...form, amount: amt, id: Date.now() }])
      toast.success('Expense added')
    }
    setShowForm(false); resetForm(); setEditId(null)
  }

  const handleDelete = id => {
    if (!window.confirm('Delete this expense entry?')) return
    saveExpenses(expenses.filter(e => e.id !== id))
    toast.success('Deleted')
  }

  // ── Upload: expense CSV ───────────────────────────────────────────────────
  const handleExpUpload = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const find = (row, variants) => {
          for (const k of Object.keys(row)) {
            if (variants.some(v => k.toLowerCase().includes(v))) return row[k]
          }
          return ''
        }
        const imported = rows.map(r => ({
          id: Date.now() + Math.random(),
          date:        String(find(r, ['date']) || '').substring(0, 10),
          category:    String(find(r, ['category','type','cat']) || 'Other'),
          description: String(find(r, ['description','desc','particular','narration','remark']) || ''),
          department:  String(find(r, ['department','dept','division']) || ''),
          amount:      toNum(find(r, ['amount','value','cost','price','total'])),
        })).filter(r => r.amount > 0)
        if (!imported.length) { toast.error('No valid rows found'); return }
        saveExpenses([...expenses, ...imported])
        toast.success(`${imported.length} expenses imported`)
      } catch (err) { toast.error('Error: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Upload: product cost sheet ────────────────────────────────────────────
  const handleCostUpload = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const costs = {}
        rows.forEach(row => {
          const keys = Object.keys(row)
          const nameKey = keys.find(k => /product|name|item|medicine/i.test(k)) || keys[0]
          const costKey = keys.find(k => /cost|price|purchase|rate|mrp/i.test(k)) || keys[1]
          const name = String(row[nameKey] || '').trim()
          const cost = toNum(row[costKey])
          if (name && cost > 0) costs[name.toLowerCase()] = cost
        })
        if (!Object.keys(costs).length) { toast.error('No valid cost data found'); return }
        setProductCosts(costs)
        localStorage.setItem(LS_PROD_COSTS, JSON.stringify(costs))
        toast.success(`${Object.keys(costs).length} product costs loaded — margins unlocked!`)
      } catch (err) { toast.error('Error: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Analytics (all computed together) ────────────────────────────────────
  const a = useMemo(() => {
    // ─ Revenue from sales upload ─
    const totalRevenue   = salesData.reduce((s, r) => s + toNum(r.revenue), 0)
    const totalUnitsSold = salesData.reduce((s, r) => s + toNum(r.qty_sold), 0)

    // ─ Purchase cost from AppContext POs ─
    const totalPurchaseCost = data.purchaseOrders.reduce((s, po) => s + toNum(po.totalAmount), 0)

    // ─ Gift cost: fulfillments × article unit cost ─
    const articleCostMap = {}
    data.giftArticles.forEach(a => { articleCostMap[a.id] = a.unitCost })
    const totalGiftCost = data.giftFulfillments.reduce((s, gf) => s + toNum(articleCostMap[gf.giftId] || 0), 0)

    // ─ Other expenses ─
    const totalOtherExpenses = expenses.reduce((s, e) => s + toNum(e.amount), 0)

    // ─ P&L ─
    const totalCosts      = totalPurchaseCost + totalGiftCost + totalOtherExpenses
    const grossProfit     = totalRevenue - totalPurchaseCost
    const ebitda          = grossProfit - totalOtherExpenses
    const netProfit       = totalRevenue - totalCosts
    const grossMarginPct  = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const netMarginPct    = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const ebitdaMarginPct = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0

    // ─ Cost breakdown ─
    const costBreakdown = [
      { name: 'Purchase / COGS', value: totalPurchaseCost },
      { name: 'Gift Distribution', value: totalGiftCost },
      { name: 'Other Expenses',   value: totalOtherExpenses },
    ].filter(c => c.value > 0)

    // ─ Bar chart: revenue vs cost vs profit ─
    const plBarData = [
      { label: 'Revenue',        value: totalRevenue,        fill: '#3fb950' },
      { label: 'Purchase Cost',  value: totalPurchaseCost,   fill: '#58a6ff' },
      { label: 'Gift Cost',      value: totalGiftCost,       fill: '#d29922' },
      { label: 'Other Expenses', value: totalOtherExpenses,  fill: '#bc8cff' },
      { label: 'Gross Profit',   value: Math.max(0, grossProfit), fill: '#00e5ff' },
      { label: 'Net Profit',     value: netProfit,           fill: netProfit >= 0 ? '#00e5ff' : '#f85149' },
    ]

    // ─ Product map ─
    const pMap = {}
    salesData.forEach(r => {
      const name = r.product_name?.toString().trim() || 'Unknown'
      if (!pMap[name]) pMap[name] = { name, revenue: 0, qty: 0, category: r.category || '' }
      pMap[name].revenue += toNum(r.revenue)
      pMap[name].qty     += toNum(r.qty_sold)
      if (r.category && !pMap[name].category) pMap[name].category = r.category.toString().trim()
    })

    const products = Object.values(pMap).map(p => {
      const unitCost    = productCosts[p.name.toLowerCase()] || null
      const totalCost   = unitCost ? unitCost * p.qty : null
      const profit      = totalCost !== null ? p.revenue - totalCost : null
      const marginPct   = profit !== null && p.revenue > 0 ? (profit / p.revenue) * 100 : null
      const avgSellPrice = p.qty > 0 ? p.revenue / p.qty : 0
      return { ...p, unitCost, totalCost, profit, marginPct, avgSellPrice }
    }).sort((a, b) => b.revenue - a.revenue)

    const hasCostData  = Object.keys(productCosts).length > 0
    const topProducts  = products.slice(0, 10)

    // Chart: top 8 products revenue vs cost
    const prodChartData = topProducts.slice(0, 8).map(p => ({
      name:    p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      Revenue: p.revenue,
      Cost:    p.totalCost || 0,
      Profit:  p.profit !== null ? Math.max(0, p.profit) : 0,
    }))

    // ─ Gift analysis ─
    const giftByScheme = {}
    data.giftFulfillments.forEach(gf => {
      if (!giftByScheme[gf.scheme]) giftByScheme[gf.scheme] = { name: gf.scheme, count: 0, value: 0 }
      giftByScheme[gf.scheme].count++
      giftByScheme[gf.scheme].value += toNum(articleCostMap[gf.giftId] || 0)
    })

    const giftByArticle = {}
    data.giftFulfillments.forEach(gf => {
      const article = data.giftArticles.find(a => a.id === gf.giftId)
      if (!article) return
      if (!giftByArticle[article.name]) giftByArticle[article.name] = { name: article.name, count: 0, value: 0, unitCost: article.unitCost }
      giftByArticle[article.name].count++
      giftByArticle[article.name].value += article.unitCost
    })

    const giftSchemeData  = Object.values(giftByScheme)
    const giftArticleData = Object.values(giftByArticle)

    // ─ Expense breakdown ─
    const expByCat = {}
    expenses.forEach(e => {
      const cat = e.category || 'Other'
      expByCat[cat] = (expByCat[cat] || 0) + toNum(e.amount)
    })
    const expCatData = Object.entries(expByCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Monthly expense trend
    const expByMonth = {}
    expenses.forEach(e => {
      const month = (e.date || '').substring(0, 7)
      if (!month) return
      expByMonth[month] = (expByMonth[month] || 0) + toNum(e.amount)
    })
    const expMonthlyData = Object.entries(expByMonth)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Monthly revenue + expense combined trend
    const revenueByMonth = {}
    salesData.forEach(r => {
      if (!r.date) return
      let month = ''
      try {
        const d = new Date(r.date)
        month = isNaN(d) ? String(r.date).substring(0, 7) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } catch { month = String(r.date).substring(0, 7) }
      if (!month) return
      revenueByMonth[month] = (revenueByMonth[month] || 0) + toNum(r.revenue)
    })
    const allMonths = new Set([...Object.keys(revenueByMonth), ...Object.keys(expByMonth)])
    const combinedMonthly = [...allMonths].sort().map(m => ({
      month:    m,
      Revenue:  revenueByMonth[m] || 0,
      Expenses: expByMonth[m] || 0,
    }))

    return {
      totalRevenue, totalUnitsSold,
      totalPurchaseCost, totalGiftCost, totalOtherExpenses,
      totalCosts, grossProfit, ebitda, netProfit,
      grossMarginPct, netMarginPct, ebitdaMarginPct,
      costBreakdown, plBarData,
      products, topProducts, prodChartData, hasCostData,
      giftSchemeData, giftArticleData,
      expCatData, expMonthlyData, combinedMonthly,
      hasRevenue:   totalRevenue > 0,
      hasGifts:     data.giftFulfillments.length > 0,
      hasExpenses:  expenses.length > 0,
      hasTrend:     combinedMonthly.length > 1,
    }
  }, [salesData, expenses, productCosts, data])

  // ── Filtered + sorted expense table ──────────────────────────────────────
  const expRows = useMemo(() => {
    let list = [...expenses]
    if (expFilter) {
      const f = expFilter.toLowerCase()
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(f) ||
        (e.category || '').toLowerCase().includes(f) ||
        (e.department || '').toLowerCase().includes(f)
      )
    }
    list.sort((x, y) => {
      const vx = x[expSort.field] ?? '', vy = y[expSort.field] ?? ''
      if (expSort.field === 'amount') return expSort.dir === 'asc' ? vx - vy : vy - vx
      return expSort.dir === 'asc'
        ? String(vx).localeCompare(String(vy))
        : String(vy).localeCompare(String(vx))
    })
    return list
  }, [expenses, expFilter, expSort])

  const toggleExpSort = f =>
    setExpSort(s => s.field === f ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field: f, dir: 'desc' })

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hidden file inputs ── */}
      <input ref={expFileRef}  type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleExpUpload(e.target.files[0])} />
      <input ref={costFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleCostUpload(e.target.files[0])} />

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-brand-primary" /> Super Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified P&amp;L · Sales vs Purchase · Product Margins · Gift Distribution · Expense Tracker
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => costFileRef.current?.click()} className="btn-secondary text-xs">
            <Upload size={13} /> Cost Sheet
          </button>
          <button onClick={() => expFileRef.current?.click()} className="btn-secondary text-xs">
            <Upload size={13} /> Upload Expenses
          </button>
          <button onClick={openAdd} className="btn-primary text-xs">
            <Plus size={13} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── No sales data warning ────────────────────────────────────────────── */}
      {!a.hasRevenue && (
        <div className="glass-card p-4 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-sm flex-1">
            <span className="text-amber-300 font-medium">No sales data loaded. </span>
            <span className="text-slate-400">Revenue figures will be zero until you upload a file in Sales Analysis.</span>
          </p>
          <button onClick={() => navigate('/sales')} className="text-xs text-brand-primary hover:underline whitespace-nowrap">
            Upload Sales →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — P&L OVERVIEW CARDS
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Profit &amp; Loss — Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            {
              label: 'Total Revenue', value: fmt(a.totalRevenue), sub: `${a.totalUnitsSold.toLocaleString()} units sold`,
              icon: TrendingUp, c: 'text-emerald-400', bg: 'bg-emerald-500/10',
            },
            {
              label: 'Purchase / COGS', value: fmt(a.totalPurchaseCost), sub: `${data.purchaseOrders.length} purchase orders`,
              icon: ShoppingCart, c: 'text-blue-400', bg: 'bg-blue-500/10',
            },
            {
              label: 'Gift Distribution', value: fmt(a.totalGiftCost), sub: `${data.giftFulfillments.length} gifts dispatched`,
              icon: Gift, c: 'text-pink-400', bg: 'bg-pink-500/10',
            },
            {
              label: 'Other Expenses', value: fmt(a.totalOtherExpenses), sub: `${expenses.length} expense entries`,
              icon: DollarSign, c: 'text-purple-400', bg: 'bg-purple-500/10',
            },
            {
              label: 'Gross Profit', value: fmt(a.grossProfit), sub: `${a.grossMarginPct.toFixed(1)}% gross margin`,
              icon: Activity,
              c:    a.grossProfit >= 0 ? 'text-brand-primary' : 'text-red-400',
              bg:   a.grossProfit >= 0 ? 'bg-brand-primary/10' : 'bg-red-500/10',
              highlight: true,
            },
            {
              label: 'Net Profit', value: fmt(a.netProfit), sub: `${a.netMarginPct.toFixed(1)}% net margin`,
              icon: a.netProfit >= 0 ? TrendingUp : TrendingDown,
              c:    a.netProfit >= 0 ? 'text-brand-primary' : 'text-red-400',
              bg:   a.netProfit >= 0 ? 'bg-brand-primary/10' : 'bg-red-500/10',
              highlight: true,
            },
          ].map((card, i) => (
            <div key={i} className={`glass-card p-4 ${card.highlight ? 'border-brand-primary/25' : ''}`}>
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <card.icon size={16} className={card.c} />
              </div>
              <p className={`text-lg font-bold leading-tight ${card.highlight ? card.c : 'text-white'}`}>
                {card.value}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{card.label}</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Margin pills row */}
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { label: 'Gross Margin',  value: a.grossMarginPct,  color: a.grossMarginPct  >= 20 ? '#3fb950' : '#d29922' },
            { label: 'EBITDA Margin', value: a.ebitdaMarginPct, color: a.ebitdaMarginPct >= 15 ? '#3fb950' : '#d29922' },
            { label: 'Net Margin',    value: a.netMarginPct,    color: a.netMarginPct    >= 10 ? '#3fb950' : a.netMarginPct >= 0 ? '#d29922' : '#f85149' },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-xl">
              <span className="text-xs text-slate-400">{m.label}</span>
              <span className="font-bold text-sm" style={{ color: m.color }}>
                {m.value.toFixed(1)}%
              </span>
              <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(m.value), 100)}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — REVENUE vs COSTS CHARTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* P&L Grouped Bar */}
        <div className="glass-card p-5">
          <h3 className="section-title mb-5"><BarChart2 size={15} /> Revenue vs Cost vs Profit</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={a.plBarData}
              margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6e7681', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6e7681', fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, fontSize: 12 }}
                formatter={v => [fmt(v), 'Amount']}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {a.plBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown Pie */}
        <div className="glass-card p-5">
          <h3 className="section-title mb-5"><Activity size={15} /> Total Cost Breakdown</h3>
          {a.costBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="52%" height={220}>
                <PieChart>
                  <Pie data={a.costBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value">
                    {a.costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, fontSize: 12 }} formatter={v => [fmt(v), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 min-w-0">
                {a.costBreakdown.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i] }} />
                        <span className="text-slate-300 truncate">{c.name}</span>
                      </div>
                      <span className="text-white font-medium ml-2 flex-shrink-0">{fmt(c.value)}</span>
                    </div>
                    <div className="h-1 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${a.totalCosts ? (c.value / a.totalCosts) * 100 : 0}%`, background: COLORS[i] }} />
                    </div>
                    <p className="text-[10px] text-slate-600 text-right mt-0.5">
                      {a.totalCosts ? ((c.value / a.totalCosts) * 100).toFixed(1) : 0}% of total cost
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
              Add expenses to see cost breakdown
            </div>
          )}
        </div>
      </div>

      {/* Monthly Revenue vs Expenses trend */}
      {a.hasTrend && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-5"><TrendingUp size={15} /> Monthly Revenue vs Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.combinedMonthly} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6e7681', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip content={<ChartTip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6e7681' }} />
              <Bar dataKey="Revenue"  fill="#3fb950" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#bc8cff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PRODUCT MARGIN ANALYSIS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="section-title"><Package size={15} /> Product Revenue &amp; Margin Analysis</h3>
          <div className="flex items-center gap-2">
            {a.hasCostData && (
              <span className="px-2 py-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                ✓ MARGIN DATA ACTIVE
              </span>
            )}
            <button onClick={() => costFileRef.current?.click()} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 transition-colors">
              <Upload size={12} /> {a.hasCostData ? 'Update' : 'Upload'} Cost Sheet
            </button>
          </div>
        </div>

        {a.products.length > 0 ? (
          <>
            {/* Product chart */}
            <div className="p-5 border-b border-dark-border">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={a.prodChartData} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 10 }} width={135} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6e7681' }} />
                  <Bar dataKey="Revenue" fill="#00e5ff" radius={[0, 4, 4, 0]} />
                  {a.hasCostData && <Bar dataKey="Cost" fill="#f85149" radius={[0, 4, 4, 0]} />}
                  {a.hasCostData && <Bar dataKey="Profit" fill="#3fb950" radius={[0, 4, 4, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Product table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header w-8">#</th>
                    <th className="table-header">Product</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Revenue</th>
                    <th className="table-header">Units Sold</th>
                    <th className="table-header">Avg. Sell Price</th>
                    {a.hasCostData && (
                      <>
                        <th className="table-header">Unit Cost</th>
                        <th className="table-header">Total Cost</th>
                        <th className="table-header">Gross Profit</th>
                        <th className="table-header">Margin %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {a.topProducts.map((p, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell text-slate-500 text-xs">{i + 1}</td>
                      <td className="table-cell font-medium text-white text-sm">{p.name}</td>
                      <td className="table-cell text-xs text-slate-400">{p.category || '—'}</td>
                      <td className="table-cell font-mono text-brand-primary text-sm font-semibold">{p.revenue > 0 ? fmt(p.revenue) : '—'}</td>
                      <td className="table-cell text-sm text-slate-300">{p.qty > 0 ? p.qty.toLocaleString() : '—'}</td>
                      <td className="table-cell font-mono text-xs text-slate-400">{p.avgSellPrice > 0 ? fmt(p.avgSellPrice) : '—'}</td>
                      {a.hasCostData && (
                        <>
                          <td className="table-cell font-mono text-xs text-slate-400">
                            {p.unitCost ? fmt(p.unitCost) : <span className="text-slate-600">not mapped</span>}
                          </td>
                          <td className="table-cell font-mono text-xs text-slate-400">
                            {p.totalCost ? fmt(p.totalCost) : '—'}
                          </td>
                          <td className={`table-cell font-mono text-sm font-semibold ${p.profit === null ? 'text-slate-600' : p.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.profit !== null ? fmt(p.profit) : '—'}
                          </td>
                          <td className="table-cell">
                            {p.marginPct !== null ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.marginPct >= 30 ? 'bg-emerald-500/20 text-emerald-400' : p.marginPct >= 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                {p.marginPct.toFixed(1)}%
                              </span>
                            ) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost sheet guide */}
            {!a.hasCostData && (
              <div className="px-5 py-4 bg-brand-primary/5 border-t border-brand-primary/20">
                <p className="text-xs text-slate-400">
                  <span className="text-brand-primary font-semibold">Unlock Margin % — </span>
                  Upload a Cost Sheet with two columns:
                  <code className="mx-1 px-1.5 py-0.5 bg-dark-bg text-brand-primary/80 rounded font-mono">Product Name</code>
                  and
                  <code className="mx-1 px-1.5 py-0.5 bg-dark-bg text-brand-primary/80 rounded font-mono">Purchase Cost per Unit</code>.
                  Margin = (Revenue − Cost) ÷ Revenue × 100
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-10 text-center text-slate-500 text-sm">
            <Package size={32} className="mx-auto mb-3 text-slate-700" />
            Upload sales data via{' '}
            <button onClick={() => navigate('/sales')} className="text-brand-primary hover:underline">Sales Analysis</button>
            {' '}to see product breakdown
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — GIFT DISTRIBUTION ANALYSIS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border">
          <h3 className="section-title"><Gift size={15} /> Gift Distribution Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dark-border">

          {/* KPI Summary */}
          <div className="p-5 space-y-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Summary</p>
            {[
              { label: 'Total Gifts Dispatched', value: data.giftFulfillments.length, highlight: false },
              { label: 'Total Gift Value',        value: fmt(a.totalGiftCost),          highlight: true },
              { label: 'Delivered',               value: data.giftFulfillments.filter(g => g.status === 'delivered').length },
              { label: 'In Transit / Pending',    value: data.giftFulfillments.filter(g => g.status !== 'delivered').length },
              { label: 'Active Schemes',          value: data.schemes.filter(s => s.status === 'active').length },
              { label: 'Enrolled Chemists',       value: data.chemists.length },
              { label: 'Gift Types in Stock',     value: data.giftArticles.filter(a => a.available > 0).length },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{s.label}</span>
                <span className={`text-sm font-bold ${s.highlight ? 'text-brand-primary' : 'text-white'}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* By Article */}
          <div className="p-5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">By Gift Article</p>
            {a.giftArticleData.length > 0 ? (
              <div className="space-y-3">
                {a.giftArticleData.map((art, i) => (
                  <div key={i} className="p-3 bg-dark-hover rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{art.name}</span>
                      <span className="text-xs font-bold text-brand-primary">{fmt(art.value)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{art.count} units distributed · ₹{art.unitCost.toLocaleString()} each</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No fulfillments recorded yet</p>
            )}

            {/* Gift stock status */}
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-5">Stock Status</p>
            <div className="space-y-2">
              {data.giftArticles.map(art => (
                <div key={art.id}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-300 truncate flex-1 mr-2">{art.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${art.status === 'adequate' ? 'bg-emerald-500/20 text-emerald-400' : art.status === 'low' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {art.available} left
                    </span>
                  </div>
                  <div className="h-1 bg-dark-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${art.totalStock ? Math.min((art.available / art.totalStock) * 100, 100) : 0}%`, background: art.status === 'adequate' ? '#3fb950' : art.status === 'low' ? '#d29922' : '#f85149' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Scheme */}
          <div className="p-5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">By Scheme</p>
            {a.giftSchemeData.length > 0 ? (
              <div className="space-y-3">
                {a.giftSchemeData.map((s, i) => (
                  <div key={i} className="p-3 bg-dark-hover rounded-lg">
                    <p className="text-xs font-medium text-white leading-snug mb-1.5">{s.name}</p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{s.count} gift{s.count > 1 ? 's' : ''} dispatched</span>
                      <span className="text-brand-primary font-bold">{fmt(s.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No scheme fulfillments recorded</p>
            )}

            {/* Distributor purchase summary */}
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-5">Distributor Invoices</p>
            <div className="space-y-2">
              {data.distributorInvoices.slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-300 font-medium">{inv.chemist}</p>
                    <p className="text-slate-600">{inv.invoiceNo} · {inv.date}</p>
                  </div>
                  <span className="text-emerald-400 font-mono font-semibold">{fmt(inv.amount)}</span>
                </div>
              ))}
              {data.distributorInvoices.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-dark-border">
                  <span className="text-slate-400 font-medium">Total</span>
                  <span className="text-brand-primary font-bold font-mono">{fmt(data.distributorInvoices.reduce((s, i) => s + i.amount, 0))}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — EXPENSE TRACKER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Expense Tracker</p>
          <div className="flex gap-2">
            <button onClick={() => expFileRef.current?.click()} className="btn-secondary text-xs"><Upload size={13} /> Upload CSV</button>
            <button onClick={openAdd} className="btn-primary text-xs"><Plus size={13} /> Add Expense</button>
          </div>
        </div>

        {/* Expense charts */}
        {a.hasExpenses && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="section-title mb-4"><Activity size={15} /> Expenses by Category</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="48%" height={200}>
                  <PieChart>
                    <Pie data={a.expCatData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                      {a.expCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, fontSize: 12 }} formatter={v => [fmt(v), 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {a.expCatData.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-300 truncate flex-1">{c.name}</span>
                      <span className="text-white font-semibold">{fmt(c.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-dark-border flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Total</span>
                    <span className="text-brand-primary font-bold">{fmt(a.totalOtherExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {a.expMonthlyData.length > 1 && (
              <div className="glass-card p-5">
                <h3 className="section-title mb-4"><TrendingUp size={15} /> Monthly Expense Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={a.expMonthlyData} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="month" tick={{ fill: '#6e7681', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={fmt} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="amount" name="Expenses" stroke="#bc8cff" strokeWidth={2} dot={{ fill: '#bc8cff', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div className="glass-card p-5 border-brand-primary/30 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calculator size={15} className="text-brand-primary" />
                {editId !== null ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-500 hover:text-white p-1">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                  <option value="">— Select —</option>
                  {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Description</label>
                <input placeholder="e.g. Monthly freight charges" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Department</label>
                <input placeholder="e.g. Operations, Admin" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="btn-primary">
                <Check size={14} /> {editId !== null ? 'Update Expense' : 'Save Expense'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Expense table */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between gap-3 flex-wrap">
            <h3 className="section-title">All Expenses ({expRows.length})</h3>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input placeholder="Search…" value={expFilter} onChange={e => setExpFilter(e.target.value)} className="input-field pl-8 w-52 text-sm" />
            </div>
          </div>

          {expRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleExpSort('date')}>
                      Date <SortChev field="date" sortField={expSort.field} sortDir={expSort.dir} />
                    </th>
                    <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleExpSort('category')}>
                      Category <SortChev field="category" sortField={expSort.field} sortDir={expSort.dir} />
                    </th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Department</th>
                    <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleExpSort('amount')}>
                      Amount <SortChev field="amount" sortField={expSort.field} sortDir={expSort.dir} />
                    </th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expRows.slice(0, 50).map(exp => (
                    <tr key={exp.id} className="table-row">
                      <td className="table-cell text-xs font-mono text-slate-300">{exp.date || '—'}</td>
                      <td className="table-cell">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-dark-hover border border-dark-border text-slate-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-slate-400 max-w-xs truncate">{exp.description || '—'}</td>
                      <td className="table-cell text-xs text-slate-500">{exp.department || '—'}</td>
                      <td className="table-cell font-mono text-sm text-white font-semibold">{fmt(exp.amount)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(exp)} className="p-1 text-slate-500 hover:text-brand-primary transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(exp.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expRows.length > 50 && (
                <div className="px-5 py-3 text-xs text-slate-500 border-t border-dark-border">
                  Showing 50 of {expRows.length} — use search to filter
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign size={24} className="text-brand-primary" />
              </div>
              <p className="text-white font-medium mb-1">No expenses tracked yet</p>
              <p className="text-slate-500 text-sm mb-5">Add manually or upload a CSV to include operating costs in your P&amp;L</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={openAdd} className="btn-primary text-sm"><Plus size={14} /> Add Expense</button>
                <button onClick={() => expFileRef.current?.click()} className="btn-secondary text-sm"><Upload size={14} /> Upload CSV</button>
              </div>
              <div className="mt-5 p-3 bg-dark-hover rounded-lg text-left max-w-sm mx-auto border border-dark-border">
                <p className="text-xs font-semibold text-slate-400 mb-1.5">Expected CSV columns:</p>
                <p className="text-[11px] font-mono text-slate-500">Date, Category, Description, Department, Amount</p>
                <p className="text-[11px] font-mono text-slate-600 mt-1">2024-01-15, Logistics, Freight - Mumbai, Ops, 12500</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — DISTRIBUTOR OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Distributor Overview</p>
          <button
            onClick={() => navigate('/distributors')}
            className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
          >
            Full Details <ArrowRight size={12} />
          </button>
        </div>

        {distributors.length === 0 ? (
          <div
            onClick={() => navigate('/distributors')}
            className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:border-brand-primary/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Building2 size={20} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No distributor data yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload your billing software ledger export to see party-wise totals here</p>
            </div>
            <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-primary ml-auto transition-colors" />
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Total Distributors',
                  value: distributors.length,
                  icon: Users,
                  c: 'text-brand-primary', bg: 'bg-brand-primary/10',
                  raw: true,
                },
                {
                  label: 'Total Sales Billed',
                  value: fmt(distributors.reduce((s, d) => s + (d.totalSales || 0), 0)),
                  icon: BarChart2,
                  c: 'text-blue-400', bg: 'bg-blue-500/10',
                },
                {
                  label: 'Total Collected',
                  value: fmt(distributors.reduce((s, d) => s + (d.totalCollections || 0), 0)),
                  icon: TrendingUp,
                  c: 'text-emerald-400', bg: 'bg-emerald-500/10',
                },
                {
                  label: 'Total Outstanding',
                  value: fmt(distributors.reduce((s, d) => s + (d.outstanding || 0), 0)),
                  icon: AlertTriangle,
                  c: 'text-amber-400', bg: 'bg-amber-500/10',
                },
              ].map((card, i) => (
                <div key={i} className="glass-card p-4">
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                    <card.icon size={16} className={card.c} />
                  </div>
                  <p className={`text-lg font-bold ${card.c}`}>{card.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Top 5 outstanding */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" /> Top Outstanding Parties
                </h3>
                <button onClick={() => navigate('/distributors')} className="text-xs text-brand-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </button>
              </div>
              <div className="space-y-3">
                {[...distributors]
                  .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0))
                  .slice(0, 5)
                  .map((d, i) => {
                    const pct = d.totalSales > 0 ? Math.min(100, ((d.totalCollections || 0) / d.totalSales) * 100) : 0
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-4 font-mono">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-white truncate max-w-[180px]">{d.name}</span>
                            <span className="text-xs font-semibold text-amber-400 font-mono ml-2 flex-shrink-0">{fmt(d.outstanding)}</span>
                          </div>
                          <div className="h-1.5 bg-dark-hover rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 w-10 text-right flex-shrink-0">{pct.toFixed(0)}% pd</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
