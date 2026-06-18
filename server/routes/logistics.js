const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// Dispatches
router.get('/dispatches', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM dispatches ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/dispatches', auth, async (req, res) => {
  const { batchReceiptId, fromWarehouse, toType, toName, toAddress, qty, units, transporterId, trackingNo, dispatchDate, driverName, driverPhone, vehicleNo } = req.body
  try {
    const seq = await req.db.query("SELECT nextval('dispatch_seq') as n")
    const dispNo = `DSP-${new Date().getFullYear()}-${String(seq.rows[0].n).padStart(3,'0')}`
    const result = await req.db.query(`
      INSERT INTO dispatches (dispatch_no, batch_receipt_id, from_warehouse, to_type, to_name, to_address, qty, units, transporter_id, tracking_no, status, dispatch_date, driver_name, driver_phone, vehicle_no, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13,$14,$15) RETURNING *
    `, [dispNo, batchReceiptId, fromWarehouse, toType, toName, toAddress, qty, units, transporterId, trackingNo, dispatchDate, driverName, driverPhone, vehicleNo, req.user.id])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/dispatches/:id', auth, async (req, res) => {
  const { status, deliveryDate } = req.body
  try {
    await req.db.query(
      'UPDATE dispatches SET status=$1, delivery_date=$2, updated_at=NOW() WHERE id=$3',
      [status, deliveryDate, req.params.id]
    )
    res.json({ message: 'Dispatch updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Transporters
router.get('/transporters', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM transporters ORDER BY name')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/transporters', auth, async (req, res) => {
  const { name, contact, email, type, coverage, rating } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO transporters (name, contact, email, type, coverage, rating) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [name, contact, email, type, coverage, rating])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/transporters/:id', auth, async (req, res) => {
  const { name, contact, email, type, coverage, rating, status } = req.body
  try {
    const result = await req.db.query(
      'UPDATE transporters SET name=$1,contact=$2,email=$3,type=$4,coverage=$5,rating=$6,status=$7 WHERE id=$8 RETURNING *',
      [name, contact, email, type, coverage, rating, status, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Warehouses
router.get('/warehouses', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM warehouses ORDER BY code')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/warehouses', auth, async (req, res) => {
  const { code, name, address, capacity, type } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO warehouses (code, name, address, capacity, used, type) VALUES ($1,$2,$3,$4,0,$5) RETURNING *
    `, [code, name, address, capacity, type])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
