const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Document upload config — 5MB limit, images + PDFs only
const DOC_DIR = path.join(__dirname, '../../uploads/chemist-docs')
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true })

const docUpload = multer({
  dest: DOC_DIR,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/jpg','application/pdf']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG and PDF files are allowed (max 5MB)'))
  }
})

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

// ── Chemist Ledger (purchase history + scheme progress) ───────────────────────
router.get('/chemists/:id/ledger', auth, async (req, res) => {
  try {
    const cid = req.params.id

    // All purchases for this chemist
    const purchases = await req.db.query(
      `SELECT di.*, s.name as scheme_name
       FROM distributor_invoices di
       LEFT JOIN schemes s ON s.id = di.scheme_id
       WHERE di.chemist_id = $1
       ORDER BY di.date DESC`,
      [cid]
    )

    // All schemes this chemist is enrolled in
    const schemes = await req.db.query(
      `SELECT s.*, sc.enrolled_at
       FROM schemes s
       JOIN scheme_chemists sc ON sc.scheme_id = s.id
       WHERE sc.chemist_id = $1
       ORDER BY s.start_date DESC`,
      [cid]
    )

    // All fulfillments / gifts for this chemist
    const fulfillments = await req.db.query(
      `SELECT gf.*, ga.name as gift_name, ga.unit_cost, s.name as scheme_name
       FROM gift_fulfillments gf
       JOIN gift_articles ga ON ga.id = gf.gift_article_id
       LEFT JOIN schemes s ON s.id = gf.scheme_id
       WHERE gf.chemist_id = $1
       ORDER BY gf.created_at DESC`,
      [cid]
    )

    // All dispatch items for this chemist
    const dispatches = await req.db.query(
      `SELECT gdi.*, gdi2.invoice_no, gdi2.dispatch_date, gdi2.distributor_name,
              ga.name as gift_name, s.name as scheme_name
       FROM gift_dispatch_items gdi
       JOIN gift_dispatch_invoices gdi2 ON gdi2.id = gdi.dispatch_invoice_id
       JOIN gift_articles ga ON ga.id = gdi.gift_article_id
       LEFT JOIN schemes s ON s.id = gdi.scheme_id
       WHERE gdi.chemist_id = $1
       ORDER BY gdi2.dispatch_date DESC`,
      [cid]
    )

    res.json({
      purchases: purchases.rows,
      schemes: schemes.rows,
      fulfillments: fulfillments.rows,
      dispatches: dispatches.rows,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Scheme Analytics (enrolled + progress per scheme) ─────────────────────────
router.get('/schemes/:id/analytics', auth, async (req, res) => {
  try {
    const sid = req.params.id

    // Get scheme details
    const schemeRes = await req.db.query('SELECT * FROM schemes WHERE id = $1', [sid])
    if (!schemeRes.rows.length) return res.status(404).json({ error: 'Scheme not found' })
    const scheme = schemeRes.rows[0]

    // All enrolled chemists with their total purchases in scheme period
    const chemists = await req.db.query(
      `SELECT c.id, c.name, c.shop_name, c.territory, c.zone, c.assigned_rep,
              COALESCE(SUM(di.amount), 0) as total_purchased,
              COALESCE(SUM(di.quantity), 0) as total_qty,
              COUNT(di.id) as invoice_count,
              MAX(di.date) as last_purchase_date,
              MIN(di.date) as first_purchase_date
       FROM scheme_chemists sc
       JOIN chemists c ON c.id = sc.chemist_id
       LEFT JOIN distributor_invoices di ON di.chemist_id = c.id
         AND di.scheme_id = $1
         AND di.date BETWEEN $2 AND $3
       WHERE sc.scheme_id = $1
       GROUP BY c.id, c.name, c.shop_name, c.territory, c.zone, c.assigned_rep`,
      [sid, scheme.start_date, scheme.end_date]
    )

    res.json({ scheme, chemists: chemists.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Gift Dispatch Invoices ────────────────────────────────────────────────────
router.get('/dispatches', auth, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT gdi.*, u.full_name as created_by_name
       FROM gift_dispatch_invoices gdi
       LEFT JOIN users u ON u.id = gdi.created_by
       ORDER BY gdi.dispatch_date DESC, gdi.id DESC`
    )
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/dispatches/:id', auth, async (req, res) => {
  try {
    const inv = await req.db.query(
      'SELECT * FROM gift_dispatch_invoices WHERE id = $1', [req.params.id]
    )
    const items = await req.db.query(
      `SELECT gdi.*, c.name as chemist_name, c.shop_name, c.territory,
              ga.name as gift_name, ga.unit_cost, s.name as scheme_name
       FROM gift_dispatch_items gdi
       JOIN chemists c ON c.id = gdi.chemist_id
       JOIN gift_articles ga ON ga.id = gdi.gift_article_id
       LEFT JOIN schemes s ON s.id = gdi.scheme_id
       WHERE gdi.dispatch_invoice_id = $1
       ORDER BY c.name`,
      [req.params.id]
    )
    res.json({ invoice: inv.rows[0], items: items.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/dispatches', auth, async (req, res) => {
  const { invoiceNo, dispatchDate, distributorName, notes, items } = req.body
  // items: [{ chemistId, giftArticleId, schemeId, qtyDispatched }]
  if (!items || !items.length) return res.status(400).json({ error: 'items required' })

  const client = await req.db.connect()
  try {
    await client.query('BEGIN')

    const invRes = await client.query(
      `INSERT INTO gift_dispatch_invoices (invoice_no, dispatch_date, distributor_name, total_items, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [invoiceNo, dispatchDate || new Date(), distributorName, items.length, notes || null, req.user.id]
    )
    const invId = invRes.rows[0].id

    for (const item of items) {
      await client.query(
        `INSERT INTO gift_dispatch_items (dispatch_invoice_id, chemist_id, gift_article_id, scheme_id, qty_dispatched)
         VALUES ($1,$2,$3,$4,$5)`,
        [invId, item.chemistId, item.giftArticleId, item.schemeId || null, item.qtyDispatched || 1]
      )
      // Deduct from gift article available stock
      await client.query(
        `UPDATE gift_articles SET allocated = allocated + $1, available = GREATEST(available - $1, 0) WHERE id = $2`,
        [item.qtyDispatched || 1, item.giftArticleId]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(invRes.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// Update individual dispatch item status (delivered/returned/damaged)
router.patch('/dispatches/items/:id', auth, async (req, res) => {
  const { status, qtyDelivered, qtyReturned, qtyDamaged, deliveredDate, notes } = req.body
  try {
    const result = await req.db.query(
      `UPDATE gift_dispatch_items
       SET status=$1, qty_delivered=$2, qty_returned=$3, qty_damaged=$4,
           delivered_date=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [status, qtyDelivered ?? 0, qtyReturned ?? 0, qtyDamaged ?? 0, deliveredDate || null, notes || null, req.params.id]
    )
    // If items returned or damaged, add back to gift_articles available
    const item = result.rows[0]
    if ((qtyReturned || 0) + (qtyDamaged || 0) > 0) {
      await req.db.query(
        `UPDATE gift_articles
         SET returned = returned + $1, damaged = damaged + $2,
             available = available + $1, allocated = GREATEST(allocated - $3, 0)
         WHERE id = $4`,
        [qtyReturned ?? 0, qtyDamaged ?? 0, (qtyReturned ?? 0) + (qtyDamaged ?? 0), item.gift_article_id]
      )
    }
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Chemist Documents ─────────────────────────────────────────────────────────
router.get('/chemists/:id/documents', auth, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT cd.*, u.full_name as uploaded_by_name, s.name as scheme_name, di.invoice_no
       FROM chemist_documents cd
       LEFT JOIN users u ON u.id = cd.uploaded_by
       LEFT JOIN schemes s ON s.id = cd.scheme_id
       LEFT JOIN distributor_invoices di ON di.id = cd.invoice_id
       WHERE cd.chemist_id = $1
       ORDER BY cd.created_at DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/chemists/:id/documents', auth, docUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const { schemeId, invoiceId, docType, notes } = req.body
  try {
    // Rename file to a more readable name
    const ext = path.extname(req.file.originalname)
    const newName = `${req.params.id}_${Date.now()}${ext}`
    const newPath = path.join(DOC_DIR, newName)
    fs.renameSync(req.file.path, newPath)

    const result = await req.db.query(
      `INSERT INTO chemist_documents (chemist_id, scheme_id, invoice_id, file_name, file_path, file_size, file_type, doc_type, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.params.id,
        schemeId || null,
        invoiceId || null,
        req.file.originalname,
        newName,
        req.file.size,
        req.file.mimetype,
        docType || 'purchase_proof',
        notes || null,
        req.user.id,
      ]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: err.message })
  }
})

router.get('/documents/:id/view', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM chemist_documents WHERE id = $1', [req.params.id])
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    const doc = result.rows[0]
    const filePath = path.join(DOC_DIR, doc.file_path)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server' })
    res.setHeader('Content-Type', doc.file_type)
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`)
    res.sendFile(filePath)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/documents/:id', auth, async (req, res) => {
  try {
    const result = await req.db.query('DELETE FROM chemist_documents WHERE id=$1 RETURNING *', [req.params.id])
    if (result.rows.length) {
      const filePath = path.join(DOC_DIR, result.rows[0].file_path)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    res.json({ message: 'Document deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
