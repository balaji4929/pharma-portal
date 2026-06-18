const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  try {
    const result = await req.db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email])
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

    // Log session
    await req.db.query(
      'INSERT INTO session_logs (user_id, ip_address, user_agent, action) VALUES ($1, $2, $3, $4)',
      [user.id, req.ip, req.headers['user-agent'], 'login']
    )

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, department: user.department, name: user.full_name, avatar: user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const { password_hash, ...safeUser } = user
    res.json({ token, user: { ...safeUser, avatar: user.avatar || user.full_name.split(' ').map(w => w[0]).join('') } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth'), async (req, res) => {
  const { currentPassword, newPassword } = req.body
  try {
    const result = await req.db.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    const user = result.rows[0]
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(newPassword, 12)
    await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])
    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
