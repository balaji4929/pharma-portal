const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// GET all expenses (optional date range)
router.get('/', auth, async (req, res) => {
  const { from, to, category } = req.query
  try {
    let q = 'SELECT e.*, u.full_name as entered_by_name FROM expenses e LEFT JOIN users u ON u.id = e.entered_by WHERE 1=1'
    const params = []
    if (from) { params.push(from); q += ` AND e.date >= $${params.length}` }
    if (to)   { params.push(to);   q += ` AND e.date <= $${params.length}` }
    if (category) { params.push(category); q += ` AND e.category = $${params.length}` }
    q += ' ORDER BY e.date DESC, e.id DESC'
    const result = await req.db.query(q, params)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET summary (total by category for current month)
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT
        category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE date >= date_trunc('month', NOW())
      GROUP BY category
      ORDER BY total DESC
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST single expense
router.post('/', auth, async (req, res) => {
  const { date, category, description, amount, paymentMode, reference } = req.body
  try {
    const result = await req.db.query(
      `INSERT INTO expenses (date, category, description, amount, payment_mode, reference, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date || new Date(), category, description, amount, paymentMode || 'cash', reference || null, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST bulk import (CSV upload)
router.post('/bulk', auth, async (req, res) => {
  const { rows } = req.body
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' })

  const client = await req.db.connect()
  try {
    await client.query('BEGIN')
    let inserted = 0
    for (const r of rows) {
      if (!r.category || !r.amount) continue
      await client.query(
        `INSERT INTO expenses (date, category, description, amount, payment_mode, reference, entered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.date || new Date(), r.category, r.description || '', parseFloat(r.amount) || 0, r.paymentMode || 'cash', r.reference || null, req.user.id]
      )
      inserted++
    }
    await client.query('COMMIT')
    res.status(201).json({ inserted })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// PUT update expense
router.put('/:id', auth, async (req, res) => {
  const { date, category, description, amount, paymentMode, reference } = req.body
  try {
    const result = await req.db.query(
      `UPDATE expenses SET date=$1, category=$2, description=$3, amount=$4, payment_mode=$5, reference=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [date, category, description, amount, paymentMode || 'cash', reference || null, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE expense
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM expenses WHERE id = $1', [req.params.id])
    res.json({ message: 'Expense deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
