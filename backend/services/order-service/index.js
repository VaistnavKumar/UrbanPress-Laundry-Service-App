import express from 'express'
import pg from 'pg'
import { MongoClient } from 'mongodb'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5003

// PostgreSQL Connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

// MongoDB Connection
let mongoDb
const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/urbanpress_garments')
async function initMongo() {
  try {
    await mongoClient.connect()
    mongoDb = mongoClient.db()
    console.log('MongoDB connection initialized.')
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err)
  }
}
initMongo()

// PostgreSQL Schema verification
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        pickup_date DATE NOT NULL,
        pickup_slot VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    // Alter orders table to add weight column if it doesn't exist
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2) DEFAULT 0.00;
    `)
    // Create order_tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_tracking (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, status)
      );
    `)
    console.log('Postgres orders and tracking tables verified.')
  } catch (err) {
    console.error('Failed to verify Postgres database schema:', err)
  }
}
initDB()

/**
 * POST /api/orders
 * Creates a new laundry order, writing to Postgres + MongoDB.
 */
app.post('/api/orders', async (req, res) => {
  const { orderId, userId, amount, address, pickupDate, pickupSlot, items } = req.body

  if (!orderId || !userId || !amount || !items) {
    return res.status(400).json({ error: 'orderId, userId, amount, and items are required' })
  }

  try {
    // 1. Transactional write to PostgreSQL (Metadata)
    await pool.query(
      "INSERT INTO orders (order_id, user_id, amount, address, pickup_date, pickup_slot, status) VALUES ($1, $2, $3, $4, $5, $6, 'order_placed')",
      [orderId, userId, amount, address, pickupDate, pickupSlot]
    )

    // 2. Insert initial tracking log
    await pool.query(
      "INSERT INTO order_tracking (order_id, status) VALUES ($1, 'order_placed') ON CONFLICT DO NOTHING",
      [orderId]
    )

    // 3. Unstructured write to MongoDB (Garment Details)
    if (mongoDb) {
      await mongoDb.collection('order_buckets').insertOne({
        order_id: orderId,
        items: items,
        created_at: new Date()
      })
    }

    res.json({ success: true, orderId, message: 'Order created successfully' })
  } catch (err) {
    console.error('Failed to create order:', err)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

/**
 * GET /api/orders
 * Retrieves order history list.
 */
app.get('/api/orders', async (req, res) => {
  const userId = req.query.userId || 1 // Mock userId for demo

  try {
    const dbRes = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId])
    const orders = dbRes.rows

    // Fetch items from MongoDB and tracking history from PostgreSQL for each order in parallel
    const detailedOrders = await Promise.all(orders.map(async (order) => {
      let items = []
      if (mongoDb) {
        const doc = await mongoDb.collection('order_buckets').findOne({ order_id: order.order_id })
        if (doc) {
          items = doc.items
        }
      }

      // Fetch tracking logs
      const trackRes = await pool.query(
        'SELECT status, updated_at FROM order_tracking WHERE order_id = $1 ORDER BY updated_at ASC',
        [order.order_id]
      )
      const trackingHistory = trackRes.rows.map(row => ({
        status: row.status,
        timestamp: row.updated_at
      }))

      return {
        _id: order.id,
        orderId: order.order_id,
        amount: parseFloat(order.amount),
        status: order.status,
        weight: order.weight ? parseFloat(order.weight) : 0,
        pickupDate: order.pickup_date,
        pickupSlot: order.pickup_slot,
        address: order.address,
        createdAt: order.created_at,
        trackingHistory,
        items
      }
    }))

    res.json({ orders: detailedOrders })
  } catch (err) {
    console.error('Error fetching order history:', err)
    res.status(500).json({ error: 'Failed to retrieve order history' })
  }
})

/**
 * GET /api/orders/:orderId
 * Retrieves detailed info for a single order.
 */
app.get('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params

  try {
    const dbRes = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId])
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = dbRes.rows[0]

    let items = []
    if (mongoDb) {
      const doc = await mongoDb.collection('order_buckets').findOne({ order_id: orderId })
      if (doc) {
        items = doc.items
      }
    }

    // Fetch tracking logs
    const trackRes = await pool.query(
      'SELECT status, updated_at FROM order_tracking WHERE order_id = $1 ORDER BY updated_at ASC',
      [orderId]
    )
    const trackingHistory = trackRes.rows.map(row => ({
      status: row.status,
      timestamp: row.updated_at
    }))

    res.json({
      _id: order.id,
      orderId: order.order_id,
      amount: parseFloat(order.amount),
      status: order.status,
      weight: order.weight ? parseFloat(order.weight) : 0,
      pickupDate: order.pickup_date,
      pickupSlot: order.pickup_slot,
      address: order.address,
      createdAt: order.created_at,
      trackingHistory,
      items
    })
  } catch (err) {
    console.error('Error fetching order details:', err)
    res.status(500).json({ error: 'Failed to retrieve order details' })
  }
})

/**
 * PUT /api/orders/:orderId/status
 * Updates order tracking status and weight, logging changes.
 */
app.put('/api/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params
  const { status, weight } = req.body

  if (!status) {
    return res.status(400).json({ error: 'status is required' })
  }

  try {
    // 1. Verify order exists
    const dbRes = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId])
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // 2. Update status & optionally weight in Postgres
    if (weight !== undefined) {
      await pool.query(
        'UPDATE orders SET status = $1, weight = $2 WHERE order_id = $3',
        [status, weight, orderId]
      )
    } else {
      await pool.query(
        'UPDATE orders SET status = $1 WHERE order_id = $2',
        [status, orderId]
      )
    }

    // 3. Log status in tracking history
    await pool.query(
      'INSERT INTO order_tracking (order_id, status) VALUES ($1, $2) ON CONFLICT (order_id, status) DO NOTHING',
      [orderId, status]
    )

    res.json({ success: true, message: `Status updated to ${status} successfully` })
  } catch (err) {
    console.error('Error updating order status:', err)
    res.status(500).json({ error: 'Failed to update order status' })
  }
})

app.listen(port, () => {
  console.log(`Order service running on port ${port}`)
})
