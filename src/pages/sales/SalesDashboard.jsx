import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Upload, BarChart2, TrendingUp, Package, AlertTriangle,
  FileSpreadsheet, RefreshCw, Settings2, X, Check, ArrowUpDown,
  ChevronDown, Search, Database
} from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../services/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ─── localStorage keys ───────────────────────────────────────────────────────
const LS_DATA   = 'pharma_sales_data'
const LS_META   = 'pharma_sales_meta'
const LS_SCHEMA = 'pharma_sales_schema'

// ─── Field definitions ────────────────────────────────────────────────────────
const FIELD_DEFS = [
  {
    key: 'product_name', label: 'Product Name', required: true,
    variants: ['product', 'name', 'item', 'product name', 'medicine', 'drug', 'brand', 'product_name', 'item name', 'description']
  },
  {
    key: 'category', label: 'Category / Division', required: false,
    variants: ['category', 'division', 'segment', 'type', 'group', 'dept', 'department', 'therapeutic area']
  },
  {
    key: 'qty_sold', label: 'Qty Sold', required: false,
    variants: ['qty sold', 'quantity sold', 'units sold', 'sold qty', 'qty', 'quantity', 'sales qty', 'sale qty', 'units', 'nos', 'pieces']
  },
  {
    key: 'revenue', label: 'Revenue / Sales Amount', required: false,
    variants: ['revenue', 'sales', 'amount', 'sales amount', 'value', 'total', 'net sales', 'gross sales', 'turnover', 'net value', 'sale value', 'billing']
  },
  {
    key: 'date', label: 'Date / Period', required: false,
    variants: ['date', 'month', 'period', 'year', 'sales date', 'invoice date', 'bill date', 'transaction date']
  },
  {
    key: 'stock', label: 'Current Stock', required: false,
    variants: ['stock', 'current stock', 'closing stock', 'balance', 'inventory', 'stock qty', 'available', 'closing balance', 'stock in hand']
  },
  {
    key: 'min_stock', label: 'Min. Stock / Reorder Level', required: false,
    variants: ['min stock', 'minimum stock', 'reorder', 'reorder level', 'safety stock', 'min qty', 'rop']
  },
  {
    key: 'price', label: 'Unit Price / MRP', required: false,
    variants: ['price', 'mrp', 'rate', 'unit price', 'selling price', 'sp', 'ptr', 'pts']
  },
]

// ─── Chart accent colors ──────────────────────────────────────────────────────
const COLORS = ['#00e5ff','#3fb950','#58a6ff','#d29922','#f85149','#bc8cff','#ff9f43','#26de81','#fd9644','#a29bfe']

// ─── Auto-detect column mapping ───────────────────────────────────────────────
function autoDetect(headers) {
  const lc = headers.map(h => h?.toString().toLowerCase().trim())
  const mapping = {}
  FIELD_DEFS.forEach(fd => {
    const idx = lc.findIndex(h => fd.variants.some(v => h === v || h.includes(v)))
    if (idx !== -1 && !Object.values(mapping).includes(headers[idx])) {
      mapping[fd.key] = headers[idx]
    }
  })
  return mapping
}

// ─── Parse file with SheetJS ─────────────────────────────────────────────────
function parseFile(file, cb) {
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true })
      const sheets = {}
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name]
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (json.length < 2) return
        const headers = json[0].map(h => h?.toString().trim()).filter(Boolean)
        if (!headers.length) return
        const rows = json.slice(1).filter(r => r.some(c => c !== ''))
        sheets[name] = { headers, rows, count: rows.length }
      })
      cb({ ok: true, sheets, names: Object.keys(sheets) })
    } catch (err) {
      cb({ ok: false, error: err.message })
    }
  }
  reader.readAsArrayBuffer(file)
}

// ─── Apply mapping to raw rows ────────────────────────────────────────────────
function applyMapping(sheets, sheet, mapping) {
  const { headers, rows } = sheets[sheet]
  return rows.map(row => {
    const raw = {}
    headers.forEach((h, i) => { raw[h] = row[i] ?? '' })
    const out = { _raw: raw }
    FIELD_DEFS.forEach(fd => {
      const col = mapping[fd.key]
      if (col !== undefined && raw[col] !== undefined) out[fd.key] = raw[col]
    })
    return out
  }).filter(r => r.product_name !== undefined && r.product_name !== '')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = v => {
  if (v === undefined || v === null || v === '') return 0
  const n = parseFloat(String(v).replace(/[₹$,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

const fmt = n => {
  if (n >= 1e7) return `₹${(n/1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n/1e5).toFixed(2)}L`
  if (n >= 1e3) return `₹${(n/1e3).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {currency ? fmt(p.value) : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ─── SortIcon helper ──────────────────────────────────────────────────────────
const SortIcon = ({ field, sortField, sortDir }) => {
  if (field !== sortField) return <ArrowUpDown size={11} className="text-slate-600" />
  return sortDir === 'asc'
    ? <ChevronDown size={11} className="text-brand-primary rotate-180" />
    : <ChevronDown size={11} className="text-brand-primary" />
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SalesDashboard() {
  const [phase, setPhase]           = useState('loading')  // loading | empty | mapping | dashboard
  const [dragging, setDragging]     = useState(false)
  const [parsed, setParsed]         = useState(null)       // { sheets, names, fileName }
  const [selSheet, setSelSheet]     = useState('')
  const [mapping, setMapping]       = useState({})
  const [savedData, setSavedData]   = useState(null)
  const [savedMeta, setSavedMeta]   = useState(null)
  const [sortField, setSortField]   = useState('revenue')
  const [sortDir, setSortDir]       = useState('desc')
  const [filter, setFilter]         = useState('')
  const fileRef = useRef()

  // ── Load saved data on mount (API first, localStorage fallback) ────────────
  useEffect(() => {
    const loadData = async () => {
      // Try API first
      try {
        const { meta, records } = await api.getSales()
        if (meta && records && records.length > 0) {
          // Map DB rows back to frontend shape
          const data = records.map(r => ({
            ...r.raw_data,
            product_name: r.product_name,
            category: r.category,
            revenue: r.revenue,
            qty_sold: r.units_sold,
            stock: r.stock_level,
            date: r.month,
          }))
          const uiMeta = {
            fileName: meta.file_name,
            rowCount: meta.row_count,
            uploadedAt: meta.uploaded_at,
            columns: meta.columns,
          }
          setSavedData(data)
          setSavedMeta(uiMeta)
          // Also cache locally
          localStorage.setItem(LS_DATA, JSON.stringify(data))
          localStorage.setItem(LS_META, JSON.stringify(uiMeta))
          setPhase('dashboard')
          return
        }
      } catch (_) { /* API unavailable, try localStorage */ }

      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(LS_DATA)
        const meta = localStorage.getItem(LS_META)
        if (raw) {
          setSavedData(JSON.parse(raw))
          if (meta) setSavedMeta(JSON.parse(meta))
          setPhase('dashboard')
        } else {
          setPhase('empty')
        }
      } catch {
        setPhase('empty')
      }
    }
    loadData()
  }, [])

  // ── Handle file selection ───────────────────────────────────────────────────
  const handleFile = useCallback(file => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV file.')
      return
    }
    parseFile(file, result => {
      if (!result.ok) { alert('Error reading file: ' + result.error); return }
      if (!result.names.length) { alert('No data found in this file.'); return }
      const first = result.names[0]
      setParsed({ ...result, fileName: file.name })
      setSelSheet(first)
      setMapping(autoDetect(result.sheets[first].headers))
      setPhase('mapping')
    })
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const onSheetChange = name => {
    setSelSheet(name)
    setMapping(autoDetect(parsed.sheets[name].headers))
  }

  // ── Confirm mapping → process & persist ─────────────────────────────────────
  const handleConfirm = async () => {
    if (!mapping.product_name) { alert('Map at least the Product Name column.'); return }
    const data = applyMapping(parsed.sheets, selSheet, mapping)
    const columns = Object.values(mapping)
    const meta = {
      fileName: parsed.fileName, sheetName: selSheet,
      rowCount: data.length, uploadedAt: new Date().toISOString(), mapping
    }
    // Always save to localStorage first
    localStorage.setItem(LS_DATA,   JSON.stringify(data))
    localStorage.setItem(LS_META,   JSON.stringify(meta))
    localStorage.setItem(LS_SCHEMA, JSON.stringify({ mapping, sheetName: selSheet }))
    setSavedData(data); setSavedMeta(meta); setPhase('dashboard')

    // Also save to PostgreSQL in background
    try {
      await api.saveSales(parsed.fileName, columns, data)
    } catch (err) {
      console.warn('Sales not saved to DB (will use local cache):', err.message)
    }
  }

  // ── Clear all saved data ────────────────────────────────────────────────────
  const handleClear = async () => {
    if (!window.confirm('Clear all uploaded sales data?')) return
    ;[LS_DATA, LS_META, LS_SCHEMA].forEach(k => localStorage.removeItem(k))
    setSavedData(null); setSavedMeta(null); setParsed(null); setPhase('empty')
    try { await api.clearSales() } catch (_) {}
  }

  // ── Analytics computation ───────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!savedData?.length) return null

    const totalRevenue = savedData.reduce((s, r) => s + toNum(r.revenue), 0)
    const totalQty     = savedData.reduce((s, r) => s + toNum(r.qty_sold), 0)

    // Group by product
    const pMap = {}
    savedData.forEach(r => {
      const name = r.product_name?.toString().trim() || 'Unknown'
      if (!pMap[name]) pMap[name] = { name, revenue: 0, qty: 0, stock: null, category: '', price: null }
      pMap[name].revenue += toNum(r.revenue)
      pMap[name].qty     += toNum(r.qty_sold)
      if (r.stock   !== undefined && r.stock   !== '') pMap[name].stock = toNum(r.stock)
      if (r.price   !== undefined && r.price   !== '') pMap[name].price = toNum(r.price)
      if (r.category && !pMap[name].category)          pMap[name].category = r.category?.toString().trim() || ''
    })
    const products = Object.values(pMap)

    // Top 10 by revenue / qty
    const topRev = [...products].sort((a,b) => b.revenue - a.revenue).slice(0,10)
    const topQty = [...products].sort((a,b) => b.qty - a.qty).slice(0,10)

    // Category breakdown
    const cMap = {}
    products.forEach(p => {
      const cat = p.category || 'Uncategorized'
      if (!cMap[cat]) cMap[cat] = { name: cat, revenue: 0, qty: 0, count: 0 }
      cMap[cat].revenue += p.revenue
      cMap[cat].qty     += p.qty
      cMap[cat].count++
    })
    const categories = Object.values(cMap).sort((a,b) => b.revenue - a.revenue)

    // Monthly trend
    const mMap = {}
    savedData.forEach(r => {
      if (!r.date) return
      let d, label = ''
      try {
        d = new Date(r.date)
        label = isNaN(d) ? String(r.date).substring(0,7) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      } catch { label = String(r.date).substring(0,7) }
      if (!label) return
      if (!mMap[label]) mMap[label] = { month: label, revenue: 0, qty: 0 }
      mMap[label].revenue += toNum(r.revenue)
      mMap[label].qty     += toNum(r.qty_sold)
    })
    const trend = Object.values(mMap).sort((a,b) => a.month.localeCompare(b.month))

    // Stock
    const stocked    = products.filter(p => p.stock !== null)
    const lowStock   = stocked.filter(p => p.stock < 10)

    return {
      totalRevenue, totalQty,
      totalProducts: products.length,
      products, topRev, topQty,
      categories, trend,
      stocked, lowStock,
      hasRevenue: totalRevenue > 0,
      hasQty:     totalQty     > 0,
      hasTrend:   trend.length > 1,
      hasStock:   stocked.length > 0,
      hasCat:     categories.length > 1,
    }
  }, [savedData])

  // ── Filtered + sorted table rows ────────────────────────────────────────────
  const tableRows = useMemo(() => {
    if (!analytics) return []
    let rows = [...analytics.products]
    if (filter) {
      const f = filter.toLowerCase()
      rows = rows.filter(p => p.name.toLowerCase().includes(f) || p.category.toLowerCase().includes(f))
    }
    rows.sort((a, b) => {
      const va = a[sortField] ?? 0, vb = b[sortField] ?? 0
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return rows
  }, [analytics, filter, sortField, sortDir])

  const toggleSort = f => {
    if (f === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('desc') }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: LOADING
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: EMPTY — upload zone
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === 'empty') return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={22} className="text-brand-primary" /> Sales Analysis
        </h1>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300
          ${dragging
            ? 'border-brand-primary bg-brand-primary/10 scale-[1.01]'
            : 'border-dark-border hover:border-brand-primary/50 hover:bg-dark-hover/30'
          }`}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-6">
          <FileSpreadsheet size={36} className="text-brand-primary" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Upload your Sales / Stock data</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
          Drop your Excel or CSV file here. We'll read all sheets, auto-detect column structure, and build a full analysis with charts instantly.
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-[#0d1117] rounded-xl font-semibold text-sm">
          <Upload size={16} /> Choose File
        </div>
        <p className="text-xs text-slate-500 mt-4">Supports .xlsx, .xls, .csv — Tally, SAP, billing software exports</p>
      </div>

      {/* Feature hints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FileSpreadsheet, title: 'Smart Column Detection', desc: 'Automatically identifies Product, Qty, Revenue, Stock, Category columns from any export format.' },
          { icon: BarChart2,       title: 'Instant Charts & Graphs', desc: 'Top products, monthly trends, category breakdown, stock alerts — all generated automatically.' },
          { icon: Database,        title: 'Persistent Storage', desc: 'Data is stored locally in your browser. Upload once, view anytime. Re-upload to refresh.' },
        ].map((f, i) => (
          <div key={i} className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-3">
              <f.icon size={20} className="text-brand-primary" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: MAPPING — column assignment wizard
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === 'mapping') {
    const sheet = parsed.sheets[selSheet]
    const autoKeys = new Set(Object.keys(autoDetect(sheet.headers)))

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings2 size={22} className="text-brand-primary" /> Map Your Columns
            </h1>
            <p className="text-sm text-slate-400 mt-1">We've auto-detected what we can — confirm or adjust the mapping below</p>
          </div>
        </div>

        {/* File info bar */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={18} className="text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">{parsed.fileName}</p>
            <p className="text-xs text-slate-400">{parsed.names.length} sheet(s) · {sheet.count} data rows</p>
          </div>
          <button onClick={() => { setParsed(null); setPhase('empty') }} className="text-slate-500 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Sheet selector */}
        {parsed.names.length > 1 && (
          <div className="glass-card p-5">
            <label className="label mb-3">Select Sheet to Analyze</label>
            <div className="flex flex-wrap gap-2">
              {parsed.names.map(name => (
                <button
                  key={name}
                  onClick={() => onSheetChange(name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selSheet === name
                      ? 'bg-brand-primary text-[#0d1117]'
                      : 'bg-dark-hover text-slate-300 hover:text-white border border-dark-border'
                  }`}
                >
                  {name}
                  <span className="ml-2 text-xs opacity-60">({parsed.sheets[name].count} rows)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detected columns preview */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Columns detected in "{selSheet}"</p>
          <div className="flex flex-wrap gap-2">
            {sheet.headers.map(h => (
              <span key={h} className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                Object.values(mapping).includes(h)
                  ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                  : 'bg-dark-hover border-dark-border text-slate-400'
              }`}>
                {h}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">Cyan = mapped · Grey = unmapped</p>
        </div>

        {/* Field mapping grid */}
        <div className="glass-card p-5">
          <p className="text-sm font-semibold text-white mb-4">Assign columns to fields:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELD_DEFS.map(fd => (
              <div key={fd.key}>
                <label className="label">
                  {fd.label}
                  {fd.required && <span className="text-brand-danger ml-1 text-xs">*required</span>}
                  {mapping[fd.key] && autoKeys.has(fd.key) && (
                    <span className="ml-2 text-[10px] text-brand-success">✓ auto-detected</span>
                  )}
                </label>
                <select
                  value={mapping[fd.key] || ''}
                  onChange={e => setMapping(m => {
                    const next = { ...m }
                    if (e.target.value) next[fd.key] = e.target.value
                    else delete next[fd.key]
                    return next
                  })}
                  className="input-field"
                >
                  <option value="">— Not in this file —</option>
                  {sheet.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleConfirm} disabled={!mapping.product_name} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={16} /> Generate Analysis
          </button>
          <button onClick={() => { setParsed(null); setPhase('empty') }} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: DASHBOARD
  // ────────────────────────────────────────────────────────────────────────────
  const a = analytics

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-brand-primary" /> Sales Analysis
          </h1>
          {savedMeta && (
            <p className="text-xs text-slate-500 mt-1">
              {savedMeta.fileName} · Sheet: {savedMeta.sheetName} · {savedMeta.rowCount} rows ·
              Uploaded {new Date(savedMeta.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
            <RefreshCw size={13} /> Re-upload New Data
          </button>
          <button onClick={handleClear} className="btn-secondary text-xs text-red-400 hover:text-red-300 border-red-500/20">
            <X size={13} /> Clear
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-brand-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{a?.hasRevenue ? fmt(a.totalRevenue) : '—'}</p>
            <p className="text-xs text-slate-400">Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BarChart2 size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{a?.hasQty ? a.totalQty.toLocaleString() : '—'}</p>
            <p className="text-xs text-slate-400">Total Units Sold</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Package size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{a?.totalProducts ?? 0}</p>
            <p className="text-xs text-slate-400">Total Products</p>
          </div>
        </div>
        <div className={`stat-card ${a?.lowStock?.length ? 'border-amber-500/30' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{a?.lowStock?.length ?? 0}</p>
            <p className="text-xs text-slate-400">Low Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* ── Charts 2-col grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top 10 by Revenue */}
        {a?.hasRevenue && (
          <div className="glass-card p-5">
            <h3 className="section-title mb-5"><TrendingUp size={15} /> Top 10 Products — Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={a.topRev.map(p => ({
                  name: p.name.length > 20 ? p.name.slice(0,20)+'…' : p.name,
                  revenue: p.revenue
                }))}
                layout="vertical"
                margin={{ left: 8, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={fmt} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 10 }} width={140} />
                <Tooltip content={<ChartTip currency />} />
                <Bar dataKey="revenue" fill="#00e5ff" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 10 by Units Sold */}
        {a?.hasQty && (
          <div className="glass-card p-5">
            <h3 className="section-title mb-5"><Package size={15} /> Top 10 Products — Units Sold</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={a.topQty.map(p => ({
                  name: p.name.length > 20 ? p.name.slice(0,20)+'…' : p.name,
                  units: p.qty
                }))}
                layout="vertical"
                margin={{ left: 8, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 10 }} width={140} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="units" fill="#3fb950" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Trend */}
        {a?.hasTrend && (
          <div className="glass-card p-5">
            <h3 className="section-title mb-5"><TrendingUp size={15} /> Sales Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={a.trend} margin={{ left: 8, right: 20, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="month" tick={{ fill: '#6e7681', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6e7681', fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip content={<ChartTip currency={a.hasRevenue} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6e7681' }} />
                {a.hasRevenue && (
                  <Line type="monotone" dataKey="revenue" stroke="#00e5ff" strokeWidth={2}
                    dot={{ fill: '#00e5ff', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Revenue" />
                )}
                {a.hasQty && (
                  <Line type="monotone" dataKey="qty" stroke="#3fb950" strokeWidth={2}
                    dot={{ fill: '#3fb950', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Units" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category pie */}
        {a?.hasCat && (
          <div className="glass-card p-5">
            <h3 className="section-title mb-5"><BarChart2 size={15} /> {a.hasRevenue ? 'Revenue' : 'Products'} by Category</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={240}>
                <PieChart>
                  <Pie
                    data={a.categories.slice(0,8)}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey={a.hasRevenue ? 'revenue' : 'count'}
                  >
                    {a.categories.slice(0,8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, fontSize: 12 }}
                    formatter={v => [a.hasRevenue ? fmt(v) : v, a.hasRevenue ? 'Revenue' : 'Products']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 overflow-hidden min-w-0">
                {a.categories.slice(0,8).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-300 truncate flex-1">{cat.name}</span>
                    <span className="text-slate-500 flex-shrink-0">{cat.count}p</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stock levels chart ── */}
      {a?.hasStock && (
        <div className="glass-card p-5">
          <h3 className="section-title mb-4"><Package size={15} /> Stock Levels (Top 15)</h3>
          {a.lowStock.length > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={13} />
              {a.lowStock.length} product{a.lowStock.length > 1 ? 's' : ''} with low stock (below 10 units) —
              {' '}{a.lowStock.slice(0,3).map(p => p.name).join(', ')}{a.lowStock.length > 3 && ` +${a.lowStock.length - 3} more`}
            </div>
          )}
          <ResponsiveContainer width="100%" height={Math.min(a.stocked.length * 28 + 48, 320)}>
            <BarChart
              data={[...a.stocked].sort((x,y) => y.stock - x.stock).slice(0,15).map(p => ({
                name: p.name.length > 22 ? p.name.slice(0,22)+'…' : p.name,
                stock: p.stock,
                _low: p.stock < 10
              }))}
              layout="vertical"
              margin={{ left: 8, right: 20, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6e7681', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 10 }} width={155} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="stock" radius={[0, 5, 5, 0]}>
                {[...a.stocked].sort((x,y) => y.stock - x.stock).slice(0,15).map((p, i) => (
                  <Cell key={i} fill={p.stock < 10 ? '#f85149' : '#00e5ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {a.stocked.length > 0 && <p className="text-xs text-slate-600 mt-2">Red = low stock (&lt;10 units) · Cyan = healthy</p>}
        </div>
      )}

      {/* ── Products Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="section-title"><Package size={15} /> All Products ({tableRows.length})</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search by product or category…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="input-field pl-8 w-60 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="table-header">Product Name</th>
                {a?.hasCat     && <th className="table-header">Category</th>}
                {a?.hasRevenue && (
                  <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleSort('revenue')}>
                    <div className="flex items-center gap-1">Revenue <SortIcon field="revenue" sortField={sortField} sortDir={sortDir} /></div>
                  </th>
                )}
                {a?.hasQty && (
                  <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleSort('qty')}>
                    <div className="flex items-center gap-1">Units Sold <SortIcon field="qty" sortField={sortField} sortDir={sortDir} /></div>
                  </th>
                )}
                {a?.hasStock && (
                  <th className="table-header cursor-pointer hover:text-white select-none" onClick={() => toggleSort('stock')}>
                    <div className="flex items-center gap-1">Stock <SortIcon field="stock" sortField={sortField} sortDir={sortDir} /></div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(0, 60).map((p, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium text-white text-sm">{p.name}</td>
                  {a?.hasCat     && <td className="table-cell text-xs text-slate-400">{p.category || '—'}</td>}
                  {a?.hasRevenue && (
                    <td className="table-cell font-mono text-sm text-brand-primary">
                      {p.revenue > 0 ? fmt(p.revenue) : '—'}
                    </td>
                  )}
                  {a?.hasQty && (
                    <td className="table-cell text-sm text-slate-300">
                      {p.qty > 0 ? p.qty.toLocaleString() : '—'}
                    </td>
                  )}
                  {a?.hasStock && (
                    <td className="table-cell">
                      <span className={`font-mono text-sm ${p.stock !== null && p.stock < 10 ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                        {p.stock !== null ? p.stock.toLocaleString() : '—'}
                        {p.stock !== null && p.stock < 10 && <span className="ml-1 text-amber-400 text-[10px]">⚠</span>}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {tableRows.length > 60 && (
            <div className="px-5 py-3 text-xs text-slate-500 border-t border-dark-border">
              Showing 60 of {tableRows.length} products — use search to filter
            </div>
          )}
          {tableRows.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">No products match your search</div>
          )}
        </div>
      </div>
    </div>
  )
}
