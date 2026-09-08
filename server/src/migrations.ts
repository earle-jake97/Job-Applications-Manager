import { readFile, readdir } from 'node:fs/promises'
import type { Client } from 'pg'

const directory = new URL('../sql/', import.meta.url)

// These are the three migrations previously applied manually, before tracking existed.
async function legacyMigrations(client: Client): Promise<string[]> {
  const result = await client.query(`SELECT column_name FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'applications'`)
  const columns = new Set(result.rows.map(row => row.column_name))
  if (columns.size === 0) return []
  if (!['id', 'company', 'position', 'status'].every(name => columns.has(name))) {
    throw new Error('Existing applications table has an unrecognized schema; automatic setup stopped.')
  }
  const applied = ['001_create_applications.sql']
  const details = ['job_url', 'date_applied', 'notes', 'updated_at']
  if (details.some(name => columns.has(name))) {
    if (!details.every(name => columns.has(name))) {
      throw new Error('Existing details migration is incomplete; automatic setup stopped.')
    }
    const trigger = await client.query(`SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'applications'::regclass AND tgname = 'application_updated_at' AND NOT tgisinternal`)
    if (!trigger.rowCount) throw new Error('Existing update timestamp trigger is missing; automatic setup stopped.')
    applied.push('002_application_details.sql')
  }
  if (columns.has('location')) {
    if (applied.length !== 2) throw new Error('Existing location schema is incomplete; automatic setup stopped.')
    applied.push('003_application_location.sql')
  }
  return applied
}

export async function migrate(client: Client): Promise<void> {
  // One transaction keeps SQL changes and their history together; the lock serializes launchers.
  await client.query('BEGIN')
  try {
    await client.query('SELECT pg_advisory_xact_lock(713402918)')
    const history = await client.query("SELECT to_regclass('schema_migrations') AS name")
    const legacy = history.rows[0].name ? [] : await legacyMigrations(client)
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`)
    for (const name of legacy) {
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name])
    }
    const recorded = await client.query('SELECT name FROM schema_migrations')
    const applied = new Set(recorded.rows.map(row => row.name))
    const files = (await readdir(directory)).filter(name => /^\d+_.*\.sql$/.test(name)).sort()
    for (const name of files) {
      if (applied.has(name)) continue
      const sql = await readFile(new URL(name, directory), 'utf8')
      // Older standalone SQL files own a transaction. The runner now owns it instead.
      const body = sql.replace(/^\s*BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, '')
      await client.query(body)
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name])
      console.log(`Applied ${name}`)
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
