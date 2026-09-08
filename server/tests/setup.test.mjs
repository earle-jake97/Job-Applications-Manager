import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { Client } from 'pg'
import { migrate } from '../dist/migrations.js'

const files = ['001_create_applications.sql', '002_application_details.sql', '003_application_location.sql']

test('fresh and manually migrated schemas upgrade once and preserve records', async () => {
  const client = new Client()
  await client.connect()
  try {
    for (let count = 0; count <= 3; count++) {
      const schema = `setup_test_${randomUUID().replaceAll('-', '')}`
      await client.query(`CREATE SCHEMA "${schema}"`)
      try {
        await client.query(`SET search_path TO "${schema}"`)
        for (const file of files.slice(0, count)) {
          await client.query(await readFile(new URL(`../sql/${file}`, import.meta.url), 'utf8'))
        }
        if (count) await client.query("INSERT INTO applications(company, position) VALUES ('Keep me', 'Engineer')")
        await migrate(client)
        const before = await client.query('SELECT * FROM applications')
        await migrate(client)
        assert.deepEqual((await client.query('SELECT * FROM applications')).rows, before.rows)
        assert.equal((await client.query('SELECT * FROM schema_migrations')).rowCount, 3)
        assert.equal(before.rowCount, count ? 1 : 0)
        if (count) assert.equal(before.rows[0].company, 'Keep me')
        await assert.rejects(client.query("INSERT INTO applications(company, position, location) VALUES ('Test', 'Role', 'Invalid')"), { code: '23514' })
      } finally {
        await client.query('SET search_path TO public')
        await client.query(`DROP SCHEMA "${schema}" CASCADE`)
      }
    }
  } finally { await client.end() }
})

test('setup creates a missing database and can run twice', async () => {
  const name = `setup_test_${randomUUID().replaceAll('-', '')}`
  const admin = new Client({ database: 'postgres' })
  await admin.connect()
  try {
    for (let run = 0; run < 2; run++) {
      const result = spawnSync(process.execPath, ['dist/setup-db.js'], {
        cwd: new URL('..', import.meta.url),
        env: { ...process.env, PGDATABASE: name }, encoding: 'utf8', timeout: 30000,
      })
      assert.equal(result.status, 0, result.stdout + result.stderr)
    }
    const client = new Client({ database: name })
    try {
      await client.connect()
      assert.equal((await client.query('SELECT * FROM schema_migrations')).rowCount, 3)
      assert.equal((await client.query('SELECT * FROM applications')).rowCount, 0)
    } finally { await client.end() }
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS "${name}"`)
    await admin.end()
  }
})
