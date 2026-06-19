require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 3002

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pharmaops',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

// CORS — allow both local dev and production domain
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://pulss.co.in',
  'http://pulss.co.in',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, Postman, same-origin nginx)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Make pool available to routes
app.use((req, res, next) => { req.db = pool; next() })

// Routes
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/manufacturers', require('./routes/manufacturers'))
app.use('/api/purchase',      require('./routes/purchase'))
app.use('/api/gift',          require('./routes/gift'))
app.use('/api/logistics',     require('./routes/logistics'))
app.use('/api/email',         require('./routes/email'))
app.use('/api/settings',      require('./routes/settings'))
app.use('/api/sales',         require('./routes/sales'))
app.use('/api/distributors',  require('./routes/distributors'))
app.use('/api/expenses',      require('./routes/expenses'))
app.use('/api/product-costs', require('./routes/product-costs'))

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date() })
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: e.message })
  }
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

app.listen(PORT, () => {
  console.log(`🚀 Glodac Pharma OMS API running on port ${PORT}`)
  console.log(`📊 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`)
})

module.exports = { pool }
