import { pool } from './db.js'

try {
  const result = await pool.query('SELECT current_database() AS database')
  console.log('Connected to database:', result.rows[0].database)
} catch (error) {
  console.error('Database connection failed:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
} finally {
  await pool.end()
}
