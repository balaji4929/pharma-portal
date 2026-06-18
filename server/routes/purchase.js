const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// --- Quotation Requests ---
router.get('/quotation-requests', auth, async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT qr.*, m.name as manufacturer_name, m.email as manufacturer_email
      FROM quotation_requests qr
      LEFT JOIN manufacturers m ON m.id = qr.manufacturer_id
      ORDER BY qr.created_at DESC
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/quotation-requests', auth, async (req, res) => {
  const { manufacturerId, productName, productType, strength, packSize, quantity, unit, dueDate, notes } = req.body
  try {
    const seq = await req.db.query("SELECT nextval('quotation_req_seq') as n")
    const reqNo = `QR-${new Date().getFullYear()}-${String(seq.rows[0].n).padStart(3,'0')}`
    const result = await req.db.query(`
      INSERT INTO quotation_requests (req_no, manufacturer_id, product_name, product_type, strength, pack_size, quantity, unit, due_date, notes, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING *
    `, [reqNo, manufacturerId, productName, productType, strength, packSize, quantity, unit, dueDate, notes, req.user.id])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/quotation-requests/:id', auth, async (req, res) => {
  const { status } = req.body
  try {
    const result = await req.db.query(
      'UPDATE quotation_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// --- Quotes Received ---
router.get('/quotes', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM quotes ORDER BY received_date DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/quotes', auth, async (req, res) => {
  const { quotationRequestId, unitPrice, leadTime, validUntil, paymentTerms } = req.body
  try {
    const qr = await req.db.query('SELECT * FROM quotation_requests WHERE id = $1', [quotationRequestId])
    const q = qr.rows[0]
    const totalPrice = unitPrice * (parseInt(q.quantity) || 1)
    const result = await req.db.query(`
      INSERT INTO quotes (quotation_request_id, unit_price, total_price, lead_time, valid_until, payment_terms, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *
    `, [quotationRequestId, unitPrice, totalPrice, leadTime, validUntil, paymentTerms])
    await req.db.query('UPDATE quotation_requests SET status = $1 WHERE id = $2', ['quote_received', quotationRequestId])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/quotes/:id/approve', auth, async (req, res) => {
  try {
    await req.db.query('UPDATE quotes SET status = $1 WHERE id = $2', ['approved', req.params.id])
    res.json({ message: 'Quote approved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// --- Purchase Orders ---
router.get('/orders', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM purchase_orders ORDER BY po_date DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/orders', auth, async (req, res) => {
  const { quoteId, poDate, expectedDeliveryDate, batchNo, paymentTerms, advancePaid } = req.body
  try {
    const quoteResult = await req.db.query(`
      SELECT q.*, qr.product_name, qr.quantity, m.name as manufacturer_name
      FROM quotes q
      JOIN quotation_requests qr ON qr.id = q.quotation_request_id
      JOIN manufacturers m ON m.id = qr.manufacturer_id
      WHERE q.id = $1
    `, [quoteId])
    const quote = quoteResult.rows[0]
    const seq = await req.db.query("SELECT nextval('po_seq') as n")
    const poNo = `PO-${new Date().getFullYear()}-${String(seq.rows[0].n).padStart(3,'0')}`

    const result = await req.db.query(`
      INSERT INTO purchase_orders (po_number, quote_id, manufacturer_id, product_description, quantity, unit_price, total_amount, advance_paid, status, po_date, expected_delivery_date, batch_no, payment_terms, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'po_raised',$9,$10,$11,$12,$13) RETURNING *
    `, [poNo, quoteId, quote.manufacturer_id, quote.product_name, quote.quantity, quote.unit_price, quote.total_price, advancePaid || 0, poDate, expectedDeliveryDate, batchNo, paymentTerms, req.user.id])

    await req.db.query('UPDATE quotes SET status = $1 WHERE id = $2', ['po_raised', quoteId])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/orders/:id', auth, async (req, res) => {
  const { status, advancePaid } = req.body
  try {
    const updates = []
    const values = []
    let idx = 1
    if (status) { updates.push(`status = $${idx++}`); values.push(status) }
    if (advancePaid !== undefined) { updates.push(`advance_paid = $${idx++}`); values.push(advancePaid) }
    updates.push(`updated_at = NOW()`)
    values.push(req.params.id)
    await req.db.query(`UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = $${idx}`, values)
    res.json({ message: 'PO updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// --- Batch Receipts ---
router.get('/receipts', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM batch_receipts ORDER BY received_date DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/receipts', auth, async (req, res) => {
  const { poId, batchNo, qtyReceived, qtyRejected, mfgDate, expDate, receivedDate, qcStatus, warehouse, notes } = req.body
  try {
    const po = await req.db.query('SELECT * FROM purchase_orders WHERE id = $1', [poId])
    const result = await req.db.query(`
      INSERT INTO batch_receipts (po_id, batch_no, qty_ordered, qty_received, qty_rejected, mfg_date, exp_date, received_date, qc_status, warehouse, notes, received_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [poId, batchNo, po.rows[0]?.quantity, qtyReceived, qtyRejected || 0, mfgDate, expDate, receivedDate, qcStatus, warehouse, notes, req.user.id])
    await req.db.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['received', poId])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
