import { Client } from 'pg'
import { migrate } from './migrations.js'

const database = process.env.PGDATABASE
const config = { connectionTimeoutMillis: 5000 }

async function setup() {
  if (!database) throw new Error('Set PGDATABASE in server/.env before launching.')
  let client = new Client(config)
  try {
    try {
      await client.connect()
    } catch (error) {
      await client.end()
      if ((error as { code?: string }).code !== '3D000') throw error
      const admin = new Client({ ...config, database: 'postgres' })
      try {
        await admin.connect()
        // Database names are identifiers, so quote them rather than interpolating raw input.
        const identifier = '"' + database.replaceAll('"', '""') + '"'
        try {
          await admin.query(`CREATE DATABASE ${identifier}`)
          console.log('Created application database.')
        } catch (creationError) {
          if ((creationError as { code?: string }).code !== '42P04') throw creationError
        }
      } finally { await admin.end() }
      client = new Client(config)
      await client.connect()
    }
    await migrate(client)
    console.log('Database setup is up to date.')
  } finally { await client.end() }
}

try {
  await setup()
} catch (error) {
  const code = (error as { code?: string }).code
  if (code === '42501') {
    console.error('Database setup needs permission to create the database/tables. Check the PostgreSQL user in server/.env.')
  } else if (code) {
    console.error(`Database setup failed (${code}). Check server/.env and PostgreSQL; existing data has been preserved.`)
  } else {
    console.error(error instanceof Error ? error.message : 'Database setup failed.')
  }
  process.exitCode = 1
}
