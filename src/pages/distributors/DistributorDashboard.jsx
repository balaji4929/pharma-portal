import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, Users, DollarSign, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Search, X, Check, FileSpreadsheet,
  RefreshCw, Building2, CreditCard, ArrowRight, Layers,
  Download, Edit3, Trash2, Plus, BarChart2, Eye, ClipboardList
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../../services/api'

const LS_KEY = 'pharma_distributors'
const COLORS = ['#00e5ff','#3fb950','#58a6ff','#d29922','#f85149','#bc8cff','#ff9f43','#26de81','#fd9644','#a29bfe']

// ─── helpers ──────────────────────────────────────────────────────────────────

const toNum = v => {
  if (v === null || v === undefined || v === '') return 0
  const s = String(v).replace(/[₹$,\s]/g, '').replace(/\(([^)]+)\)/, '-$1')
  const cleaned = s.replace(/(Dr\.?|Cr\.?)\s*$/i, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

const fmt = n => {
  const abs = Math.abs(n ?? 0)
  const s = (n ?? 0) < 0 ? '-' : ''
  if (abs >= 1e7) return `${s}₹${(abs/1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${s}₹${(abs/1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${s}₹${(abs/1e3).toFixed(1)}K`
  return `${s}₹${Math.round(abs).toLocaleString()}`
}

const fmtDate = v => {
  if (!v) return ''
  // try to convert Excel serial / JS date / string
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v)
      return `${String(d.d).padStart(2,'0')}-${String(d.m).padStart(2,'0')}-${d.y}`
    } catch { return String(v) }
  }
  return String(v).trim()
}

// ─── column auto-detection ────────────────────────────────────────────────────

const LEDGER_VARIANTS = {
  date:        ['date','dt','dated','transaction date','entry date'],
  particulars: ['particulars','narration','description','details','ledger name','remarks','account'],
  type:        ['vch type','voucher type','type','trans type','transaction type'],
  vchNo:       ['vch no','voucher no','invoice no','ref no','reference no','bill no','doc no'],
  debit:       ['debit','dr','dr amount','debit amount','dr amt','dr.','invoice amount','bill amount','sales','charges'],
  credit:      ['credit','cr','cr amount','credit amount','cr amt','cr.','receipt','payment','collection','received'],
  balance:     ['balance','running balance','closing balance','net balance','balance dr/cr','bal'],
  amount:      ['amount','net amount','value','net value','total','grand total'],
}

const SUMMARY_VARIANTS = {
  partyName:   ['party name','distributor','ledger name','account name','name','party'],
  totalSales:  ['total sales','sales amount','total billing','gross sales','debit total','dr total','total dr'],
  totalCr:     ['total receipt','collection','total collection','received','credit total','cr total','total cr','payment'],
  outstanding: ['outstanding','balance','dues','net outstanding','net dues','closing balance','net balance'],
}

function detectLedgerCols(headers) {
  const lc = headers.map(h => String(h ?? '').toLowerCase().trim())
  const find = variants => {
    for (const v of variants) {
      const i = lc.findIndex(h => h === v || h.startsWith(v) || h.includes(v))
      if (i >= 0) return headers[i]
    }
    return null
  }
  return Object.fromEntries(Object.entries(LEDGER_VARIANTS).map(([k, v]) => [k, find(v)]))
}

function detectSummaryCols(headers) {
  const lc = headers.map(h => String(h ?? '').toLowerCase().trim())
  const find = variants => {
    for (const v of variants) {
      const i = lc.findIndex(h => h === v || h.startsWith(v) || h.includes(v))
      if (i >= 0) return headers[i]
    }
    return null
  }
  return Object.fromEntries(Object.entries(SUMMARY_VARIANTS).map(([k, v]) => [k, find(v)]))
}

// ─── parse single sheet as ledger ─────────────────────────────────────────────

function parseSheetAsLedger(headers, rows, c) {
  const entries = []
  let salesTotal = 0, collectionTotal = 0, lastBalance = null

  rows.forEach(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    const get = col => (col ? obj[col] : '')

    let debit = c.debit ? toNum(get(c.debit)) : 0
    let credit = c.credit ? toNum(get(c.credit)) : 0

    // if no separate Dr/Cr but has amount col
    if (!c.debit && !c.credit && c.amount) {
      const amt = toNum(get(c.amount))
      const typ = String(get(c.type) || '').toLowerCase()
      if (typ.includes('sales') || typ.includes('invoice') || typ.includes('bill') || typ.includes('journal'))
        debit = Math.abs(amt)
      else if (typ.includes('receipt') || typ.includes('payment') || typ.includes('collect'))
        credit = Math.abs(amt)
      else {
        debit = amt > 0 ? amt : 0
        credit = amt < 0 ? -amt : 0
      }
    }

    if (debit === 0 && credit === 0) return

    salesTotal += debit
    collectionTotal += credit

    const balance = c.balance ? toNum(get(c.balance)) : (salesTotal - collectionTotal)
    lastBalance = balance

    entries.push({
      date:        fmtDate(get(c.date)),
      particulars: String(get(c.particulars) || get(c.type) || '').trim(),
      type:        String(get(c.type) || '').trim(),
      vchNo:       String(get(c.vchNo) || '').trim(),
      debit,
      credit,
      balance,
    })
  })

  const outstanding = lastBalance !== null ? Math.abs(lastBalance) : Math.max(0, salesTotal - collectionTotal)
  return { entries, totalSales: salesTotal, totalCollections: collectionTotal, outstanding }
}

// ─── parse summary sheet ──────────────────────────────────────────────────────

function parseSummarySheet(headers, rows, c) {
  if (!c.partyName) return []
  const parties = []
  rows.forEach(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    const name = String(obj[c.partyName] || '').trim()
    if (!name || name.toLowerCase() === 'total' || name.toLowerCase() === 'grand total') return
    parties.push({
      name,
      totalSales:       c.totalSales ? toNum(obj[c.totalSales]) : 0,
      totalCollections: c.totalCr ? toNum(obj[c.totalCr]) : 0,
      outstanding:      c.outstanding ? toNum(obj[c.outstanding]) : 0,
      ledger: [],
    })
  })
  return parties
}

// ─── sheet rows helper (skips empty rows) ─────────────────────────────────────

function sheetToHeadersRows(ws) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  // find first row with meaningful content as headers
  let headerRowIdx = 0
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const nonEmpty = raw[i].filter(c => String(c ?? '').trim() !== '').length
    if (nonEmpty >= 2) { headerRowIdx = i; break }
  }
  const headers = raw[headerRowIdx].map(h => String(h ?? '').trim()).filter((h, i, arr) => {
    // remove empty headers at tail
    const lastNonEmpty = arr.reduce((a, v, idx) => v ? idx : a, -1)
    return i <= lastNonEmpty
  })
  const rows = raw.slice(headerRowIdx + 1).filter(r => r.some(c => String(c ?? '').trim() !== ''))
  return { headers, rows }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadDistributors() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}

function saveDistributors(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

function mergeDistributors(existing, incoming) {
  const map = {}
  existing.forEach(p => { map[p.name.toLowerCase()] = p })
  incoming.forEach(p => {
    map[p.name.toLowerCase()] = {
      ...p,
      id: map[p.name.toLowerCase()]?.id || `dist_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      lastUpdated: new Date().toISOString(),
    }
  })
  return Object.values(map)
}

// ─── CustomTooltip for charts ──────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-1.5 font-medium truncate max-w-[180px]">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.stroke }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── upload confirmation modal ─────────────────────────────────────────────────

function UploadConfirmModal({ preview, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h3 className="font-bold text-white">Confirm Import</h3>
            <p className="text-xs text-slate-400 mt-0.5">{preview.length} distributor(s) detected</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-dark-hover rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {preview.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-dark-hover rounded-xl px-4 py-3 border border-dark-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center">
                  <Building2 size={14} className="text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.ledger.length} entries</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-slate-500">Sales</p>
                  <p className="text-sm text-white font-semibold">{fmt(p.totalSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Collected</p>
                  <p className="text-sm text-emerald-400 font-semibold">{fmt(p.totalCollections)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Outstanding</p>
                  <p className={`text-sm font-semibold ${p.outstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmt(p.outstanding)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-dark-border flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-slate-400 hover:text-white hover:bg-dark-hover text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={() => onConfirm(preview)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-dark-bg font-bold text-sm hover:bg-brand-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={15} /> Import {preview.length} Distributor{preview.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── individual party ledger modal ────────────────────────────────────────────

function LedgerModal({ party, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = party.ledger.filter(e =>
    !search || [e.date, e.particulars, e.type, e.vchNo, String(e.debit), String(e.credit)].some(f =>
      f.toLowerCase().includes(search.toLowerCase())
    )
  )
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h3 className="font-bold text-white text-lg">{party.name}</h3>
            <div className="flex gap-5 mt-1 text-xs">
              <span className="text-slate-400">Sales: <span className="text-white font-semibold">{fmt(party.totalSales)}</span></span>
              <span className="text-slate-400">Collected: <span className="text-emerald-400 font-semibold">{fmt(party.totalCollections)}</span></span>
              <span className="text-slate-400">Outstanding: <span className="text-amber-400 font-semibold">{fmt(party.outstanding)}</span></span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-dark-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ledger entries…"
              className="w-full pl-8 pr-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>
        {party.ledger.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No ledger entries — uploaded as summary only</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="sticky top-0 bg-dark-card border-b border-dark-border">
                  {['Date','Particulars','Type','Vch No','Debit (Dr)','Credit (Cr)','Balance'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i} className="border-b border-dark-border/40 hover:bg-dark-hover/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-2.5 text-white max-w-[220px] truncate">{e.particulars || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-400">{e.type || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-400">{e.vchNo || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{e.debit > 0 ? <span className="text-blue-400">{fmt(e.debit)}</span> : <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{e.credit > 0 ? <span className="text-emerald-400">{fmt(e.credit)}</span> : <span className="text-slate-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400">{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-dark-border text-xs text-slate-500 text-center">
          {filtered.length} of {party.ledger.length} entries
        </div>
      </div>
    </div>
  )
}

// ─── individual party upload dialog ──────────────────────────────────────────

function IndividualUploadDialog({ existingNames, onUpload, onClose }) {
  const [partyName, setPartyName] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = e => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleProcess = () => {
    if (!partyName.trim()) return setError('Party name is required')
    if (!file) return setError('Please select a file')
    setError('')
    onUpload(file, partyName.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <h3 className="font-bold text-white">Upload Individual Ledger</h3>
          <button onClick={onClose} className="p-2 hover:bg-dark-hover rounded-lg text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Distributor / Party Name</label>
            <input
              value={partyName} onChange={e => setPartyName(e.target.value)}
              placeholder="e.g. National Distributors"
              list="dist-names"
              className="w-full px-3 py-2.5 bg-dark-hover border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-brand-primary/50"
            />
            <datalist id="dist-names">
              {existingNames.map(n => <option key={n} value={n} />)}
            </datalist>
            {existingNames.includes(partyName.trim()) && (
              <p className="text-xs text-amber-400 mt-1">⚠ Existing party — data will be replaced</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Ledger File (Excel / CSV)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-dark-border rounded-xl p-4 text-center cursor-pointer hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-brand-primary">
                  <FileSpreadsheet size={16} />
                  <span className="text-sm font-medium truncate max-w-[240px]">{file.name}</span>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">
                  <Upload size={18} className="mx-auto mb-1 text-slate-600" />
                  Click to select Excel / CSV
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="p-5 border-t border-dark-border flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-slate-400 hover:text-white hover:bg-dark-hover text-sm transition-colors">Cancel</button>
          <button onClick={handleProcess} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-dark-bg font-bold text-sm hover:bg-brand-primary/90 transition-colors">
            Process
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function DistributorDashboard() {
  const [distributors, setDistributors] = useState([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('outstanding')
  const [sortDir, setSortDir] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)
  const [viewLedger, setViewLedger] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [showIndividual, setShowIndividual] = useState(false)
  const [processing, setProcessing] = useState(false)

  const totalRef = useRef()
  const indRef = useRef()

  useEffect(() => {
    const loadData = async () => {
      // Try API first
      try {
        const rows = await api.getDistributors()
        if (rows && rows.length > 0) {
          const list = rows.map(r => ({
            id: String(r.id),
            name: r.party_name,
            totalSales: parseFloat(r.sales) || 0,
            totalCollections: parseFloat(r.collections) || 0,
            outstanding: parseFloat(r.outstanding) || 0,
            collectionPct: parseFloat(r.collection_pct) || 0,
            lastUpdated: r.updated_at,
            ledger: [],
          }))
          setDistributors(list)
          saveDistributors(list) // cache locally
          return
        }
      } catch (_) { /* API unavailable, use localStorage */ }
      setDistributors(loadDistributors())
    }
    loadData()
  }, [])

  const save = useCallback(async (list) => {
    setDistributors(list)
    saveDistributors(list)
    // Sync to PostgreSQL in background
    try {
      const parties = list.map(p => ({
        partyName: p.name,
        sales: p.totalSales || 0,
        collections: p.totalCollections || 0,
        outstanding: p.outstanding || 0,
        collectionPct: p.collectionPct || (p.totalSales > 0 ? (p.totalCollections / p.totalSales) * 100 : 0),
        ledger: p.ledger || [],
      }))
      await api.saveDistributors(parties)
    } catch (err) {
      console.warn('Distributors not saved to DB (using local cache):', err.message)
    }
  }, [])

  // ── parse file → preview ──────────────────────────────────────────────────

  const parseForPreview = useCallback((file, singlePartyName = null) => {
    setProcessing(true)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const incoming = []

        if (singlePartyName) {
          // individual upload — use first sheet
          const ws = wb.Sheets[wb.SheetNames[0]]
          const { headers, rows } = sheetToHeadersRows(ws)
          const cols = detectLedgerCols(headers)
          const { entries, totalSales, totalCollections, outstanding } = parseSheetAsLedger(headers, rows, cols)
          incoming.push({ name: singlePartyName, totalSales, totalCollections, outstanding, ledger: entries })
        } else if (wb.SheetNames.length === 1) {
          // single sheet — check if summary or ledger
          const ws = wb.Sheets[wb.SheetNames[0]]
          const { headers, rows } = sheetToHeadersRows(ws)
          const sumCols = detectSummaryCols(headers)

          if (sumCols.partyName && (sumCols.totalSales || sumCols.outstanding)) {
            // summary format
            const parties = parseSummarySheet(headers, rows, sumCols)
            incoming.push(...parties)
          } else {
            // single ledger — use sheet name as party
            const cols = detectLedgerCols(headers)
            const partyName = wb.SheetNames[0].replace(/^\d+\.?\s*/, '').trim() || 'Party 1'
            const { entries, totalSales, totalCollections, outstanding } = parseSheetAsLedger(headers, rows, cols)
            if (entries.length === 0 && totalSales === 0) {
              toast.error('Could not detect any debit/credit data. Check column headers.')
              setProcessing(false); return
            }
            incoming.push({ name: partyName, totalSales, totalCollections, outstanding, ledger: entries })
          }
        } else {
          // multi-sheet — each sheet = one party
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName]
            const { headers, rows } = sheetToHeadersRows(ws)
            if (rows.length === 0) continue
            const cols = detectLedgerCols(headers)
            const { entries, totalSales, totalCollections, outstanding } = parseSheetAsLedger(headers, rows, cols)
            if (entries.length === 0 && totalSales === 0) continue // skip empty/index sheets
            const partyName = sheetName.replace(/^\d+\.?\s*/, '').trim()
            incoming.push({ name: partyName, totalSales, totalCollections, outstanding, ledger: entries })
          }
          if (incoming.length === 0) {
            toast.error('No valid ledger data found in any sheet.')
            setProcessing(false); return
          }
        }

        setUploadPreview(incoming)
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse file: ' + err.message)
      } finally {
        setProcessing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleTotalFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    parseForPreview(f)
  }

  const handleIndividualUpload = (file, partyName) => {
    setShowIndividual(false)
    parseForPreview(file, partyName)
  }

  const confirmImport = useCallback(incoming => {
    const merged = mergeDistributors(distributors, incoming)
    save(merged)
    setUploadPreview(null)
    toast.success(`✅ ${incoming.length} distributor${incoming.length !== 1 ? 's' : ''} imported/updated`)
  }, [distributors, save])

  const deleteParty = async id => {
    if (!window.confirm('Delete this distributor and all their ledger data?')) return
    const updated = distributors.filter(d => d.id !== id)
    save(updated)
    toast.success('Distributor removed')
    // Delete from DB if it's a numeric ID (server-assigned)
    if (!String(id).startsWith('dist_')) {
      try { await api.deleteDistributor(id) } catch (_) {}
    }
  }

  // ── sort + filter ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = distributors.filter(d =>
      !search || d.name.toLowerCase().includes(search.toLowerCase())
    )
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [distributors, search, sortKey, sortDir])

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }) => sortKey !== k ? null :
    sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />

  // ── aggregates ─────────────────────────────────────────────────────────────

  const totals = useMemo(() => ({
    parties:     distributors.length,
    sales:       distributors.reduce((s, d) => s + d.totalSales, 0),
    collections: distributors.reduce((s, d) => s + d.totalCollections, 0),
    outstanding: distributors.reduce((s, d) => s + d.outstanding, 0),
  }), [distributors])

  const collectionPct = totals.sales > 0 ? ((totals.collections / totals.sales) * 100).toFixed(1) : '0'

  // chart data
  const topOutstanding = useMemo(() =>
    [...distributors].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10)
      .map(d => ({ name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name, outstanding: d.outstanding, sales: d.totalSales, collected: d.totalCollections }))
  , [distributors])

  const salesVsCollections = useMemo(() =>
    [...distributors].sort((a, b) => b.totalSales - a.totalSales).slice(0, 10)
      .map(d => ({ name: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name, Sales: d.totalSales, Collections: d.totalCollections }))
  , [distributors])

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-brand-primary" /> Distributor Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Upload ledger exports from your billing software — party-wise sales, collections &amp; outstanding</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => totalRef.current?.click()}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-dark-bg font-bold text-sm hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
          >
            {processing ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
            Upload All Ledgers
          </button>
          <button
            onClick={() => setShowIndividual(true)}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dark-border text-slate-300 hover:text-white hover:bg-dark-hover text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Plus size={14} /> Individual Party
          </button>
          <input ref={totalRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTotalFile} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Distributors', value: totals.parties, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
          { label: 'Total Sales Billed', value: fmt(totals.sales), icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Collected', value: fmt(totals.collections), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Outstanding', value: fmt(totals.outstanding), icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Collection progress */}
      {totals.parties > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-300">Overall Collection Rate</span>
            <span className={`text-sm font-bold ${Number(collectionPct) >= 80 ? 'text-emerald-400' : Number(collectionPct) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {collectionPct}%
            </span>
          </div>
          <div className="h-3 bg-dark-hover rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${Number(collectionPct) >= 80 ? 'bg-emerald-400' : Number(collectionPct) >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(100, collectionPct)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>Collected: {fmt(totals.collections)}</span>
            <span>Outstanding: {fmt(totals.outstanding)}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {distributors.length === 0 && !processing && (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-5">
            <Building2 size={32} className="text-brand-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Distributor Data Yet</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Upload your billing software ledger export — <strong className="text-slate-300">multi-sheet Excel</strong> (one sheet per party) or <strong className="text-slate-300">summary CSV</strong> for instant party-wise analytics.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button onClick={() => totalRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-dark-bg font-bold text-sm hover:bg-brand-primary/90 transition-colors">
              <Layers size={15} /> Upload All Ledgers (Multi-sheet)
            </button>
            <button onClick={() => setShowIndividual(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dark-border text-slate-300 hover:text-white hover:bg-dark-hover text-sm font-medium transition-colors">
              <Plus size={15} /> Upload One Party
            </button>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            {[
              { icon: Layers, title: 'Multi-sheet Excel', desc: 'Each sheet = one distributor (Tally/Busy export)' },
              { icon: ClipboardList, title: 'Summary CSV', desc: 'Single sheet with Party Name, Sales, Collection, Outstanding columns' },
              { icon: Plus, title: 'Individual Upload', desc: 'Upload one party\'s ledger at a time' },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-dark-hover border border-dark-border/50">
                <f.icon size={16} className="text-brand-primary mb-2" />
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {distributors.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Sales vs Collections */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Sales vs Collections (Top 10)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesVsCollections} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8b949e' }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} tickFormatter={v => fmt(v)} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Sales" fill="#58a6ff" radius={[4,4,0,0]} />
                  <Bar dataKey="Collections" fill="#3fb950" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outstanding top 10 */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Top Outstanding Parties</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOutstanding} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#8b949e' }} tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#8b949e' }} width={120} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="outstanding" name="Outstanding" radius={[0,4,4,0]}>
                    {topOutstanding.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Party Table */}
      {distributors.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-dark-border gap-3 flex-wrap">
            <h3 className="font-semibold text-white text-sm">Party-wise Summary ({filtered.length})</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search parties…"
                className="pl-8 pr-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-brand-primary/50 w-52"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead>
                <tr className="border-b border-dark-border">
                  {[
                    { label: 'Distributor / Party', key: 'name' },
                    { label: 'Total Sales', key: 'totalSales' },
                    { label: 'Collected', key: 'totalCollections' },
                    { label: 'Outstanding', key: 'outstanding' },
                    { label: 'Collection %', key: null },
                    { label: 'Last Updated', key: 'lastUpdated' },
                    { label: '', key: null },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={() => col.key && toggleSort(col.key)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-white' : ''}`}
                    >
                      <span className="flex items-center gap-1">{col.label}<SortIcon k={col.key} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const pct = d.totalSales > 0 ? ((d.totalCollections / d.totalSales) * 100).toFixed(0) : 0
                  const pctN = Number(pct)
                  const ago = d.lastUpdated ? Math.floor((Date.now() - new Date(d.lastUpdated)) / 86400000) : null
                  return (
                    <tr key={d.id} className="border-b border-dark-border/40 hover:bg-dark-hover/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center flex-shrink-0">
                            <Building2 size={14} className="text-brand-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{d.name}</p>
                            <p className="text-xs text-slate-500">{d.ledger.length} ledger entries</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-white">{fmt(d.totalSales)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-400">{fmt(d.totalCollections)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-amber-400">{fmt(d.outstanding)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-dark-hover rounded-full overflow-hidden w-24">
                            <div className={`h-full rounded-full ${pctN >= 80 ? 'bg-emerald-400' : pctN >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(100, pctN)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${pctN >= 80 ? 'text-emerald-400' : pctN >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {ago === null ? '—' : ago === 0 ? 'Today' : `${ago}d ago`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {d.ledger.length > 0 && (
                            <button
                              onClick={() => setViewLedger(d)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                              title="View Ledger"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteParty(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-dark-hover/60 border-t-2 border-dark-border">
                  <td className="px-4 py-3 text-sm font-bold text-slate-300">Grand Total</td>
                  <td className="px-4 py-3 font-mono font-bold text-white">{fmt(totals.sales)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">{fmt(totals.collections)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-amber-400">{fmt(totals.outstanding)}</td>
                  <td colSpan={3} className="px-4 py-3 text-xs text-slate-500">{distributors.length} distributors</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {uploadPreview && (
        <UploadConfirmModal
          preview={uploadPreview}
          onConfirm={confirmImport}
          onCancel={() => setUploadPreview(null)}
        />
      )}

      {viewLedger && (
        <LedgerModal party={viewLedger} onClose={() => setViewLedger(null)} />
      )}

      {showIndividual && (
        <IndividualUploadDialog
          existingNames={distributors.map(d => d.name)}
          onUpload={handleIndividualUpload}
          onClose={() => setShowIndividual(false)}
        />
      )}
    </div>
  )
}
