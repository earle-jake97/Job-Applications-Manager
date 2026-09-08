import { pool } from './db.js'

try {
  // LIMIT 0 checks the required columns without loading any applications.
  await pool.query('SELECT id, company, position, status, job_url, date_applied, notes, updated_at, location FROM applications LIMIT 0')
  console.log('Database is ready.')
} catch (error) {
  const code = (error as { code?: string }).code
  if (code === '42703' || code === '42P01') {
    console.error('Database schema is incomplete. Apply the remaining server/sql migrations in order; see README.md.')
  } else {
    console.error('Cannot connect to the database. Check server/.env and the PostgreSQL service.')
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
