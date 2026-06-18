const express = require('express')
const router = express.Router()
const { google } = require('googleapis')
const nodemailer = require('nodemailer')
const auth = require('../middleware/auth')

// Create Gmail OAuth2 transporter
const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const { token } = await oauth2Client.getAccessToken()

  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.FROM_EMAIL,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken: token,
    }
  })
}

// POST /api/email/send-quote-request
router.post('/send-quote-request', auth, async (req, res) => {
  const { to, subject, body, quoteRequestId } = req.body
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject and body required' })

  try {
    const transporter = await createTransporter()
    const mailOptions = {
      from: `"PharmaOps Purchase Dept" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text: body,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${body}</pre>`,
    }
    await transporter.sendMail(mailOptions)

    // Update quote request status in DB
    if (quoteRequestId) {
      await req.db.query(
        'UPDATE quotation_requests SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', quoteRequestId]
      )
    }

    // Log email
    await req.db.query(
      'INSERT INTO email_logs (user_id, to_email, subject, quote_request_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, to, subject, quoteRequestId || null]
    )

    res.json({ message: 'Email sent successfully', to })
  } catch (err) {
    console.error('Email error:', err)
    res.status(500).json({ error: 'Failed to send email', details: err.message })
  }
})

// POST /api/email/send-po
router.post('/send-po', auth, async (req, res) => {
  const { to, poId } = req.body
  try {
    const po = await req.db.query('SELECT * FROM purchase_orders WHERE id = $1', [poId])
    if (po.rows.length === 0) return res.status(404).json({ error: 'PO not found' })
    const p = po.rows[0]

    const transporter = await createTransporter()
    await transporter.sendMail({
      from: `"PharmaOps Purchase Dept" <${process.env.FROM_EMAIL}>`,
      to,
      subject: `Purchase Order ${p.po_number}`,
      html: `
        <h2>Purchase Order — ${p.po_number}</h2>
        <p><strong>Product:</strong> ${p.product_description}</p>
        <p><strong>Quantity:</strong> ${p.quantity}</p>
        <p><strong>Total Amount:</strong> ₹${p.total_amount}</p>
        <p><strong>Expected Delivery:</strong> ${p.expected_delivery_date}</p>
        <br><p>Please confirm receipt and proceed with manufacturing.</p>
      `
    })
    res.json({ message: 'PO sent successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
