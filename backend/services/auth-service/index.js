import express from 'express'
import pg from 'pg'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5001
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret'

// Log key startup info
console.log(`[auth-service] Starting on port ${port}`)
console.log(`[auth-service] DATABASE_URL set: ${!!process.env.DATABASE_URL}`)
console.log(`[auth-service] JWT_SECRET set: ${!!process.env.JWT_SECRET}`)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
})

// Schema verification
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100),
        phone VARCHAR(20),
        google_id VARCHAR(100),
        location JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);`)
    await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`).catch(() => {})
    console.log('[auth-service] ✅ Postgres users table verified.')
  } catch (err) {
    console.error('[auth-service] ❌ DB init error:', err.message)
  }
}
initDB()

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/auth/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message })
  }
})

// ── Register ──────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, password, phone]
    )
    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
    res.json({ token, user })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email address already registered' })
    }
    console.error('[auth-service] Registration error:', err.message)
    // Return specific error for easier debugging
    res.status(500).json({ error: `Registration failed: ${err.message}` })
  }
})

// ── Email/Password Login ──────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password, phone, location FROM users WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0 || result.rows[0].password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = { ...result.rows[0] }
    delete user.password
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
    res.json({ token, user })
  } catch (err) {
    console.error('[auth-service] Login error:', err.message)
    res.status(500).json({ error: `Authentication failed: ${err.message}` })
  }
})

// ── Google Sign-In ────────────────────────────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Google token is required' })
  }

  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)
    const payload = await googleRes.json()

    if (payload.error || !payload.email) {
      console.error('[auth-service] Google token invalid:', payload.error)
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    const { sub: googleId, email, name } = payload

    let result = await pool.query(
      'SELECT id, name, email, phone, location FROM users WHERE email = $1',
      [email]
    )

    let user
    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING id, name, email, phone, location',
        [name || email.split('@')[0], email, googleId]
      )
      user = insertResult.rows[0]
    } else {
      await pool.query(
        'UPDATE users SET google_id = $1 WHERE email = $2 AND google_id IS NULL',
        [googleId, email]
      )
      user = result.rows[0]
    }

    const jwtToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
    res.json({ token: jwtToken, user })
  } catch (err) {
    console.error('[auth-service] Google auth error:', err.message)
    res.status(500).json({ error: `Google authentication failed: ${err.message}` })
  }
})

app.listen(port, () => {
  console.log(`[auth-service] ✅ Running on port ${port}`)
})
