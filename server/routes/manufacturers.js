const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM manufacturers ORDER BY name')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  const { name, email, phone, gst, address, contact, category } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO manufacturers (name, email, phone, gst_number, address, contact_person, product_category)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [name, email, phone, gst, address, contact, category])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', auth, async (req, res) => {
  const { name, email, phone, gst, address, contact, category, status } = req.body
  try {
    const result = await req.db.query(`
      UPDATE manufacturers SET name=$1, email=$2, phone=$3, gst_number=$4, address=$5, contact_person=$6, product_category=$7, status=$8 WHERE id=$9 RETURNING *
    `, [name, email, phone, gst, address, contact, category, status, req.params.id])
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.db.query('UPDATE manufacturers SET status = $1 WHERE id = $2', ['inactive', req.params.id])
    res.json({ message: 'Manufacturer deactivated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
