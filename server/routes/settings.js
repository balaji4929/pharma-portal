const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { adminOnly } = require('../middleware/auth')

router.get('/branding', auth, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM app_settings WHERE key = ANY($1)', [['company_name','portal_title','primary_color','accent_color','logo_url','favicon_url']])
    const settings = {}
    result.rows.forEach(r => { settings[r.key] = r.value })
    res.json(settings)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/branding', auth, adminOnly, async (req, res) => {
  const { company, portal, primaryColor, accentColor, logoUrl, faviconUrl } = req.body
  try {
    const settings = { company_name: company, portal_title: portal, primary_color: primaryColor, accent_color: accentColor, logo_url: logoUrl, favicon_url: faviconUrl }
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        await req.db.query('INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()', [key, value])
      }
    }
    res.json({ message: 'Branding settings updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/session-logs', auth, adminOnly, async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT sl.*, u.full_name FROM session_logs sl JOIN users u ON u.id = sl.user_id ORDER BY sl.created_at DESC LIMIT 100
    `)
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
