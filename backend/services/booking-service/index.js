import express from 'express'
import Redis from 'ioredis'
import pg from 'pg'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5002

// Redis Connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// PostgreSQL Connection Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

// Database initialization
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE,
        pickup_date DATE NOT NULL,
        pickup_slot VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('Postgres bookings table verified.')
  } catch (err) {
    console.error('Failed to initialize postgres table:', err)
  }
}
initDB()

// Slot Config Constants
const MAX_SLOT_BOOKINGS = 6

/**
 * GET /api/booking/slots
 * Returns availability of slots for a given date.
 */
app.get('/api/booking/slots', async (req, res) => {
  const { date } = req.query
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' })
  }

  try {
    // 3 delivery/pickup slots
    const slots = [
      '9:00 AM – 9:30 AM',
      '9:50 AM – 10:30 AM',
      '10:50 AM – 11:30 PM'
    ]

    const availability = await Promise.all(slots.map(async (slot) => {
      const redisKey = `slot_occupancy:${date}:${slot}`
      let count = await redis.get(redisKey)
      
      if (count === null) {
        // Fallback to query database if redis has expired or is clean
        const dbRes = await pool.query(
          'SELECT COUNT(*) FROM bookings WHERE pickup_date = $1 AND pickup_slot = $2',
          [date, slot]
        )
        count = parseInt(dbRes.rows[0].count, 10)
        // Store in redis with 24-hour expiration
        await redis.set(redisKey, count, 'EX', 86400)
      } else {
        count = parseInt(count, 10)
      }

      const spotsLeft = Math.max(0, MAX_SLOT_BOOKINGS - count)
      return {
        slot,
        occupied: count,
        spotsLeft,
        isFull: spotsLeft <= 0
      }
    }))

    res.json({ date, slots: availability })
  } catch (err) {
    console.error('Error fetching slot availability:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/booking/reserve
 * Atomically reserves a booking slot.
 */
app.post('/api/booking/reserve', async (req, res) => {
  const { orderId, date, slot } = req.body
  if (!date || !slot || !orderId) {
    return res.status(400).json({ error: 'orderId, date, and slot are required' })
  }

  const redisKey = `slot_occupancy:${date}:${slot}`

  try {
    // Atomically increment slot occupancy
    const currentOccupancy = await redis.incr(redisKey)

    if (currentOccupancy > MAX_SLOT_BOOKINGS) {
      // Revert the increment since the slot is full
      await redis.decr(redisKey)
      return res.status(400).json({
        error: 'Slot is fully booked',
        message: '⚠️ This slot is fully booked. Please select another available time slot.'
      })
    }

    // Successfully reserved slot in Cache. Write to Postgres
    await pool.query(
      'INSERT INTO bookings (order_id, pickup_date, pickup_slot) VALUES ($1, $2, $3) ON CONFLICT (order_id) DO NOTHING',
      [orderId, date, slot]
    )

    // Set 24 hour expiration for the slot occupancy key to avoid leakages
    await redis.expire(redisKey, 86400)

    res.json({
      success: true,
      message: 'Slot reserved successfully',
      occupancy: currentOccupancy
    })
  } catch (err) {
    console.error('Error reserving slot:', err)
    // Attempt recovery decr in case of runtime errors
    try { await redis.decr(redisKey) } catch {}
    res.status(500).json({ error: 'Failed to reserve slot' })
  }
})

app.listen(port, () => {
  console.log(`Booking service running on port ${port}`)
})
