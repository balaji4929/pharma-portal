require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
const PORT = process.env.PORT || 5000

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pharmaops',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Make pool available to routes
app.use((req, res, next) => { req.db = pool; next() })

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/manufacturers', require('./routes/manufacturers'))
app.use('/api/purchase', require('./routes/purchase'))
app.use('/api/gift', require('./routes/gift'))
app.use('/api/logistics', require('./routes/logistics'))
app.use('/api/email', require('./routes/email'))
app.use('/api/settings', require('./routes/settings'))

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

app.listen(PORT, () => {
  console.log(`🚀 PharmaOps API running on port ${PORT}`)
  console.log(`📊 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`)
})

module.exports = { pool }
