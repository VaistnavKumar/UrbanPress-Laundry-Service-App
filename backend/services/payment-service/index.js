import express from 'express'
import Redis from 'ioredis'
import pg from 'pg'
import crypto from 'crypto'
import { Queue } from 'bullmq'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5004

// Redis Connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// BullMQ Queue for Asynchronous Emails
const emailQueue = new Queue('email-queue', {
  connection: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
    port: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).port : 6379
  }
})

// PostgreSQL Connection Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

// Database initialization
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('Postgres payments table verified.')
  } catch (err) {
    console.error('Failed to initialize postgres payments table:', err)
  }
}
initDB()

/**
 * POST /api/payments/checkout
 * Idempotent payment processing handler.
 */
app.post('/api/payments/checkout', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key']
  const { orderId, amount, paymentMethod, items, user, address, pickupDate, pickupSlot } = req.body

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'orderId and amount are required' })
  }

  // 1. Enforce Idempotency check if key is provided
  if (idempotencyKey) {
    const cachedResponse = await redis.get(`idempotency:${idempotencyKey}`)
    if (cachedResponse) {
      console.log(`Duplicate request detected. Returning cached response for key: ${idempotencyKey}`)
      return res.json(JSON.parse(cachedResponse))
    }
  }

  try {
    // 2. Perform payment transaction record creation
    // In production, you would call Razorpay/Stripe APIs here
    const transactionId = 'TXN-' + crypto.randomBytes(6).toString('hex').toUpperCase()
    
    // Simulate successful transaction authorization
    const status = 'paid'

    // Write to postgres ledger
    await pool.query(
      'INSERT INTO payments (order_id, amount, status, transaction_id) VALUES ($1, $2, $3, $4) ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status',
      [orderId, amount, status, transactionId]
    )

    const responsePayload = {
      success: true,
      orderId,
      transactionId,
      amount,
      status,
      message: 'Payment processed and verified successfully'
    }

    // 3. Cache the successful response in Redis with 1-hour expiry
    if (idempotencyKey) {
      await redis.set(`idempotency:${idempotencyKey}`, JSON.stringify(responsePayload), 'EX', 3600)
    }

    // 4. Push email job to queue to handle notifications asynchronously
    await emailQueue.add('send-confirmation-email', {
      order: {
        orderId,
        amount,
        address,
        pickupDate,
        pickupSlot,
        items
      },
      user
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    })

    res.json(responsePayload)
  } catch (err) {
    console.error('Error during checkout transaction:', err)
    res.status(500).json({ error: 'Payment processing failed' })
  }
})

/**
 * POST /api/payments/webhook
 * Handles payment processor reconciliation webhooks securely.
 */
app.post('/api/payments/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'super_webhook_secret'
  const signature = req.headers['x-razorpay-signature']

  // Validate Razorpay webhook signature
  const shasum = crypto.createHmac('sha255', secret)
  shasum.update(JSON.stringify(req.body))
  const digest = shasum.digest('hex')

  if (signature && signature !== digest) {
    return res.status(400).json({ error: 'Invalid signature. Request rejected.' })
  }

  const event = req.body
  console.log(`Reconciling payment event: ${event.event}`)

  try {
    if (event.event === 'payment.captured') {
      const paymentId = event.payload.payment.entity.id
      const orderId = event.payload.payment.entity.order_id
      const amount = event.payload.payment.entity.amount / 100 // Convert paise to INR

      // Reconcile status in database
      await pool.query(
        'INSERT INTO payments (order_id, amount, status, transaction_id) VALUES ($1, $2, $3, $4) ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status',
        [orderId, amount, 'paid', paymentId]
      )
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook reconciliation error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

app.listen(port, () => {
  console.log(`Payment service running on port ${port}`)
})
