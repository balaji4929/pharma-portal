const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// Chemists
router.get('/chemists', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM chemists ORDER BY name')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/chemists', auth, async (req, res) => {
  const { name, shop, dlNo, phone, territory, zone, rep } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO chemists (name, shop_name, drug_license_no, phone, territory, zone, assigned_rep) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [name, shop, dlNo, phone, territory, zone, rep])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Schemes
router.get('/schemes', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM schemes ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/schemes', auth, async (req, res) => {
  const { name, startDate, endDate, description, targetType, slabs, status } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO schemes (name, start_date, end_date, description, target_type, slabs, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING *
    `, [name, startDate, endDate, description, targetType, JSON.stringify(slabs), status || 'draft', req.user.id])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/schemes/:id/enroll', auth, async (req, res) => {
  const { chemistIds } = req.body
  try {
    await req.db.query('DELETE FROM scheme_chemists WHERE scheme_id = $1', [req.params.id])
    for (const cId of chemistIds) {
      await req.db.query('INSERT INTO scheme_chemists (scheme_id, chemist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, cId])
    }
    res.json({ message: `${chemistIds.length} chemists enrolled` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Distributor Invoices
router.get('/invoices', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT di.*, c.name as chemist_name FROM distributor_invoices di JOIN chemists c ON c.id = di.chemist_id ORDER BY date DESC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/invoices', auth, async (req, res) => {
  const { chemistId, invoiceNo, distributor, date, amount, qty, schemeId } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO distributor_invoices (chemist_id, invoice_no, distributor_name, date, amount, quantity, scheme_id, entered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [chemistId, invoiceNo, distributor, date, amount, qty, schemeId || null, req.user.id])
    await req.db.query('UPDATE chemists SET total_purchase = total_purchase + $1 WHERE id = $2', [amount, chemistId])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Gift Articles (Inventory)
router.get('/articles', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM gift_articles ORDER BY name')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/articles', auth, async (req, res) => {
  const { name, brand, model, totalStock, toBeOrdered, unitCost } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO gift_articles (name, brand, model, total_stock, to_be_ordered, unit_cost, available)
      VALUES ($1,$2,$3,$4,$5,$6,$4) RETURNING *
    `, [name, brand, model, totalStock, toBeOrdered, unitCost])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Gift Fulfillments
router.get('/fulfillments', auth, async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT gf.*, c.name as chemist_name, s.name as scheme_name, ga.name as gift_name
      FROM gift_fulfillments gf
      JOIN chemists c ON c.id = gf.chemist_id
      LEFT JOIN schemes s ON s.id = gf.scheme_id
      JOIN gift_articles ga ON ga.id = gf.gift_article_id
      ORDER BY gf.qualified_date DESC
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/fulfillments', auth, async (req, res) => {
  const { chemistId, schemeId, giftArticleId, qualifiedDate, address } = req.body
  try {
    const result = await req.db.query(`
      INSERT INTO gift_fulfillments (chemist_id, scheme_id, gift_article_id, qualified_date, delivery_address, status)
      VALUES ($1,$2,$3,$4,$5,'qualified') RETURNING *
    `, [chemistId, schemeId, giftArticleId, qualifiedDate, address])
    await req.db.query('UPDATE gift_articles SET allocated = allocated + 1, available = available - 1 WHERE id = $1', [giftArticleId])
    res.status(201).json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/fulfillments/:id', auth, async (req, res) => {
  const { status, courier, trackingId, dispatchDate } = req.body
  try {
    await req.db.query(`
      UPDATE gift_fulfillments SET status=$1, courier=$2, tracking_id=$3, dispatch_date=$4,
      delivered_date = CASE WHEN $1='delivered' THEN NOW() ELSE delivered_date END WHERE id=$5
    `, [status, courier, trackingId, dispatchDate, req.params.id])
    res.json({ message: 'Fulfillment updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
