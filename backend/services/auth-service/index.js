import express from 'express'
import pg from 'pg'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5001
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
})

// Schema verification — create table if not exists, add google_id column if missing
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
    // Safely add google_id column if the table already existed without it
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100);
    `)
    // Make password nullable if it isn't already (for Google users)
    await pool.query(`
      ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
    `).catch(() => {}) // Ignore if already nullable
    console.log('✅ Postgres users table verified.')
  } catch (err) {
    console.error('❌ Failed to verify users table:', err.message)
  }
}
initDB()

// ── Register ─────────────────────────────────────────────────────────────────
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
    console.error('Registration error:', err.message)
    res.status(500).json({ error: 'Registration failed' })
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
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

// ── Google Sign-In ────────────────────────────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body
  if (!token) {
    return res.status(400).json({ error: 'Google token is required' })
  }

  try {
    // Verify Google token via Google's public tokeninfo endpoint (no extra library needed)
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)
    const payload = await googleRes.json()

    if (payload.error || !payload.email) {
      console.error('Google token invalid:', payload.error)
      return res.status(401).json({ error: 'Invalid Google token' })
    }

    const { sub: googleId, email, name, picture } = payload

    // Check if user already exists
    let result = await pool.query(
      'SELECT id, name, email, phone, location FROM users WHERE email = $1',
      [email]
    )

    let user
    if (result.rows.length === 0) {
      // New user — create account automatically
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING id, name, email, phone, location',
        [name || email.split('@')[0], email, googleId]
      )
      user = insertResult.rows[0]
    } else {
      // Existing user — update google_id if not set
      await pool.query(
        'UPDATE users SET google_id = $1 WHERE email = $2 AND google_id IS NULL',
        [googleId, email]
      )
      user = result.rows[0]
    }

    const jwtToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
    res.json({ token: jwtToken, user })
  } catch (err) {
    console.error('Google auth error:', err.message)
    res.status(500).json({ error: 'Google authentication failed' })
  }
})

app.listen(port, () => {
  console.log(`✅ Auth service running on port ${port}`)
})
