const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// GET all entries (most recent first)
router.get('/', auth, async (req, res) => {
  try {
    const { status, date } = req.query
    let where = []
    let params = []
    if (status) { params.push(status); where.push(`le.status = $${params.length}`) }
    if (date)   { params.push(date);   where.push(`le.invoice_date = $${params.length}`) }
    const sql = `SELECT le.*, u.full_name as entered_by_name
                 FROM logistics_entries le
                 LEFT JOIN users u ON u.id = le.entered_by
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY le.invoice_date DESC, le.id DESC`
    const result = await req.db.query(sql, params)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET today's summary stats
router.get('/summary', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const rows = await req.db.query(
      `SELECT
         COUNT(*)                                                                     AS total_invoices,
         COALESCE(SUM(invoice_value), 0)                                              AS total_value,
         SUM(CASE WHEN status IN ('dispatched','delivered') THEN 1 ELSE 0 END)       AS dispatched,
         SUM(CASE WHEN status = 'packed' THEN 1 ELSE 0 END)                          AS packed_pending,
         COALESCE(SUM(transport_cost), 0)                                             AS total_transport_cost,
         COALESCE(SUM(boxes_packed), 0)                                               AS total_boxes
       FROM logistics_entries
       WHERE invoice_date = $1`,
      [today]
    )
    res.json(rows.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST new entry (packing stage)
router.post('/', auth, async (req, res) => {
  const {
    invoiceNo, invoiceDate, invoiceValue,
    boxesPacked, approxWeightKg,
    packedBy, checkedBy, checkTime,
    transporter, trackingUrl, notes
  } = req.body
  if (!invoiceNo || !invoiceDate) return res.status(400).json({ error: 'invoiceNo and invoiceDate required' })
  try {
    const result = await req.db.query(
      `INSERT INTO logistics_entries
         (invoice_no, invoice_date, invoice_value, boxes_packed, approx_weight_kg,
          packed_by, checked_by, check_time, transporter, tracking_url, notes, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [invoiceNo, invoiceDate, invoiceValue||0, boxesPacked||0, approxWeightKg||0,
       packedBy||null, checkedBy||null, checkTime||null, transporter||null,
       trackingUrl||null, notes||null, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH — update docket details or delivery status
router.patch('/:id', auth, async (req, res) => {
  const {
    dispatchDate, docketNo, transportCost, status, deliveryDate,
    transporter, trackingUrl, notes,
    boxesPacked, approxWeightKg, packedBy, checkedBy, checkTime, invoiceValue
  } = req.body
  try {
    const result = await req.db.query(
      `UPDATE logistics_entries SET
         dispatch_date    = COALESCE($1,  dispatch_date),
         docket_no        = COALESCE($2,  docket_no),
         transport_cost   = COALESCE($3,  transport_cost),
         status           = COALESCE($4,  status),
         delivery_date    = COALESCE($5,  delivery_date),
         transporter      = COALESCE($6,  transporter),
         tracking_url     = COALESCE($7,  tracking_url),
         notes            = COALESCE($8,  notes),
         boxes_packed     = COALESCE($9,  boxes_packed),
         approx_weight_kg = COALESCE($10, approx_weight_kg),
         packed_by        = COALESCE($11, packed_by),
         checked_by       = COALESCE($12, checked_by),
         check_time       = COALESCE($13, check_time),
         invoice_value    = COALESCE($14, invoice_value),
         updated_at       = NOW()
       WHERE id = $15 RETURNING *`,
      [dispatchDate||null, docketNo||null, transportCost??null, status||null,
       deliveryDate||null, transporter||null, trackingUrl||null, notes||null,
       boxesPacked??null, approxWeightKg??null, packedBy||null, checkedBy||null,
       checkTime||null, invoiceValue??null, req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Entry not found' })
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM logistics_entries WHERE id=$1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
