import { Pool } from 'pg'

// Connection settings come from the PG* environment variables.
export const pool = new Pool({
  connectionTimeoutMillis: 5000,
})

pool.on('error', (error) => {
  console.error('Unexpected error on an idle database connection:', error.message)
})
