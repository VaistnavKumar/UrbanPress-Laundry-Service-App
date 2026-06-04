import express from 'express'
import pg from 'pg'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

const port = process.env.PORT || 5001
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

// Schema verification
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        location JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('Postgres users table verified.')
  } catch (err) {
    console.error('Failed to verify users table:', err)
  }
}
initDB()

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
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

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
    delete user.password // Redact password from payload
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' })
    res.json({ token, user })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
})

app.listen(port, () => {
  console.log(`Auth service running on port ${port}`)
})
