/**
 * Export utilities — Excel (XLSX) and PDF (browser print)
 * Uses the existing 'xlsx' package already installed.
 */
import * as XLSX from 'xlsx'

// ── Excel export ──────────────────────────────────────────────────────────────

/**
 * Export a single table to .xlsx
 * @param {Array<Object>} rows - data rows
 * @param {string} fileName - without extension
 * @param {string} sheetName
 */
export function exportToExcel(rows, fileName = 'export', sheetName = 'Sheet1') {
  if (!rows || !rows.length) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

/**
 * Export multiple sheets in one workbook
 * @param {Array<{name: string, rows: Array<Object>}>} sheets
 * @param {string} fileName
 */
export function exportMultiSheet(sheets, fileName = 'export') {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    if (!rows?.length) return
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

// ── PDF export (browser print with injected styles) ───────────────────────────

/**
 * Print the element with id=printAreaId as a PDF.
 * Opens a new window, applies print styles, triggers print dialog.
 * @param {string} title
 * @param {string} printAreaId - id of the DOM element to print
 */
export function exportToPDF(title, printAreaId) {
  const el = document.getElementById(printAreaId)
  if (!el) return

  const html = el.innerHTML
  const win = window.open('', '_blank', 'width=1100,height=800')
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
        h1,h2,h3 { margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .print-header { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; }
        .no-print { display: none !important; }
        @media print {
          body { padding: 0; }
          @page { margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h2>${title}</h2>
        <span style="color:#666">Generated: ${new Date().toLocaleString('en-IN')}</span>
      </div>
      ${html}
    </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => { win.focus(); win.print(); }, 500)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format currency for Excel cells */
export const fmtCur = (n) => {
  const num = parseFloat(n) || 0
  return num >= 1e5
    ? `₹${(num / 1e5).toFixed(2)}L`
    : `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** Flatten object for Excel (removes nested objects) */
export function flattenForExcel(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) out[`${k}_${k2}`] = v2
    } else if (!Array.isArray(v)) {
      out[k] = v
    }
  }
  return out
}
