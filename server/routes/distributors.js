const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// GET all distributor parties with summary
router.get('/', auth, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM distributor_parties ORDER BY outstanding DESC'
    )
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET ledger entries for a specific party
router.get('/:id/ledger', auth, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM distributor_ledger_entries WHERE party_id = $1 ORDER BY entry_date ASC, id ASC',
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST — bulk upsert parties + ledger entries (multi-sheet upload)
router.post('/bulk', auth, async (req, res) => {
  const { parties } = req.body
  // parties: [{ partyName, sales, collections, outstanding, collectionPct, ledger: [{date, particulars, debit, credit, balance}] }]
  if (!parties || !Array.isArray(parties)) {
    return res.status(400).json({ error: 'parties array required' })
  }

  const client = await req.db.connect()
  try {
    await client.query('BEGIN')

    let upserted = 0
    for (const p of parties) {
      const name = (p.partyName || p.party_name || '').trim()
      if (!name) continue

      // Upsert party summary
      const partyRes = await client.query(
        `INSERT INTO distributor_parties (party_name, sales, collections, outstanding, collection_pct)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (party_name) DO UPDATE SET
           sales = EXCLUDED.sales,
           collections = EXCLUDED.collections,
           outstanding = EXCLUDED.outstanding,
           collection_pct = EXCLUDED.collection_pct,
           updated_at = NOW()
         RETURNING id`,
        [
          name,
          parseFloat(p.sales) || 0,
          parseFloat(p.collections) || 0,
          parseFloat(p.outstanding) || 0,
          parseFloat(p.collectionPct || p.collection_pct) || 0,
        ]
      )
      const partyId = partyRes.rows[0].id

      // Insert ledger entries if provided (delete old ones first for this party)
      if (p.ledger && Array.isArray(p.ledger) && p.ledger.length > 0) {
        await client.query('DELETE FROM distributor_ledger_entries WHERE party_id = $1', [partyId])
        for (const entry of p.ledger) {
          await client.query(
            `INSERT INTO distributor_ledger_entries (party_id, entry_date, particulars, debit, credit, balance)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              partyId,
              entry.date || null,
              entry.particulars || '',
              parseFloat(entry.debit) || 0,
              parseFloat(entry.credit) || 0,
              parseFloat(entry.balance) || 0,
            ]
          )
        }
      }
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

// DELETE a party and its ledger
router.delete('/:id', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM distributor_parties WHERE id = $1', [req.params.id])
    res.json({ message: 'Party deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE all parties
router.delete('/', auth, async (req, res) => {
  try {
    await req.db.query('DELETE FROM distributor_parties')
    res.json({ message: 'All distributor data cleared' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
