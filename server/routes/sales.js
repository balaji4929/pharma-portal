const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// GET all sales records (latest upload)
router.get('/', auth, async (req, res) => {
  try {
    const uploadRes = await req.db.query(
      'SELECT * FROM sales_uploads ORDER BY uploaded_at DESC LIMIT 1'
    )
    if (uploadRes.rows.length === 0) return res.json({ meta: null, records: [] })

    const upload = uploadRes.rows[0]
    const recordsRes = await req.db.query(
      'SELECT * FROM sales_records WHERE upload_id = $1 ORDER BY id',
      [upload.id]
    )
    res.json({ meta: upload, records: recordsRes.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST — bulk save a new sales upload (replaces previous)
router.post('/', auth, async (req, res) => {
  const { fileName, columns, records } = req.body
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'records array required' })
  }

  const client = await req.db.connect()
  try {
    await client.query('BEGIN')

    // Insert upload metadata
    const uploadRes = await client.query(
      `INSERT INTO sales_uploads (file_name, row_count, columns, uploaded_by)
       VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
      [fileName || 'upload', records.length, JSON.stringify(columns || []), req.user.id]
    )
    const uploadId = uploadRes.rows[0].id

    // Bulk insert records
    for (const r of records) {
      await client.query(
        `INSERT INTO sales_records
           (upload_id, product_name, category, revenue, units_sold, stock_level, month, territory, raw_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [
          uploadId,
          r.product_name || null,
          r.category || null,
          parseFloat(String(r.revenue || '').replace(/[^0-9.-]/g, '')) || null,
          parseInt(r.units_sold) || null,
          parseInt(r.stock_level) || null,
          r.month || null,
          r.territory || null,
          JSON.stringify(r),
        ]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ uploadId, rowCount: records.length })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// DELETE all sales data
router.delete('/', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM sales_uploads')
    res.json({ message: 'Sales data cleared' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
