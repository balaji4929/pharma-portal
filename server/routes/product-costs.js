const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// GET all product costs
router.get('/', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM product_costs ORDER BY product_name')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST upsert a single product cost
router.post('/', auth, async (req, res) => {
  const { productName, purchaseRate, mrp, gstPct, notes } = req.body
  if (!productName) return res.status(400).json({ error: 'productName required' })
  try {
    const result = await req.db.query(
      `INSERT INTO product_costs (product_name, purchase_rate, mrp, gst_pct, notes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (product_name) DO UPDATE SET
         purchase_rate = EXCLUDED.purchase_rate,
         mrp = EXCLUDED.mrp,
         gst_pct = EXCLUDED.gst_pct,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [productName, purchaseRate || 0, mrp || 0, gstPct || 12, notes || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST bulk upsert
router.post('/bulk', auth, async (req, res) => {
  const { rows } = req.body
  if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' })

  const client = await req.db.connect()
  try {
    await client.query('BEGIN')
    let upserted = 0
    for (const r of rows) {
      if (!r.productName && !r.product_name) continue
      const name = r.productName || r.product_name
      await client.query(
        `INSERT INTO product_costs (product_name, purchase_rate, mrp, gst_pct, notes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (product_name) DO UPDATE SET
           purchase_rate = EXCLUDED.purchase_rate,
           mrp = EXCLUDED.mrp,
           gst_pct = EXCLUDED.gst_pct,
           updated_at = NOW()`,
        [name, parseFloat(r.purchaseRate || r.purchase_rate) || 0, parseFloat(r.mrp) || 0, parseFloat(r.gstPct || r.gst_pct) || 12, r.notes || null]
      )
      upserted++
    }
    await client.query('COMMIT')
    res.status(201).json({ upserted })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// DELETE by id
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM product_costs WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
