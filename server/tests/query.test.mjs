import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { migrate } from '../dist/migrations.js'

test('query filters, sorts, paginates, and handles shrinking results', async () => {
  const schema = `query_test_${randomUUID().replaceAll('-', '')}`
  const client = new Client()
  let pool
  const options = process.env.PGOPTIONS
  await client.connect()
  await client.query(`CREATE SCHEMA "${schema}"`)
  try {
    await client.query(`SET search_path TO "${schema}"`)
    await migrate(client)
    process.env.PGOPTIONS = `-c search_path=${schema}`
    ;({ pool } = await import('../dist/db.js'))
    const { queryApplications, parseListQuery } = await import('../dist/application-query.js')
    for (let i = 0; i < 23; i++) {
      await client.query(`INSERT INTO applications(company, position, notes, status, date_applied)
        VALUES ($1, 'Developer', $2, $3, $4)`, [i < 12 ? 'Alpha' : 'Beta', i === 0 ? '100%_match' : 'Notes', i < 12 ? 'Interview' : 'Applied', i === 0 ? '2026-01-01' : null])
    }
    const first = await queryApplications(parseListQuery({ sort: 'company' }))
    const second = await queryApplications(parseListQuery({ sort: 'company', page: '2' }))
    assert.equal(first.total, 23)
    assert.equal(first.totalPages, 3)
    assert.equal(first.items.length, 10)
    assert.equal(new Set([...first.items, ...second.items].map(row => row.id)).size, 20)
    assert.equal(first.counts.Interview, 12)
    const filtered = await queryApplications(parseListQuery({ search: 'ALPHA', status: 'Interview', page: '2' }))
    assert.equal(filtered.total, 12)
    assert.equal(filtered.items.length, 2)
    assert.equal((await queryApplications(parseListQuery({ search: '%_' }))).total, 1)
    assert.equal((await queryApplications(parseListQuery({ search: "' OR true --" }))).total, 0)
    assert.equal((await queryApplications(parseListQuery({ sort: 'company', direction: 'desc' }))).items[0].company, 'Beta')
    for (const direction of ['asc', 'desc']) {
      assert.equal((await queryApplications(parseListQuery({ sort: 'dateApplied', direction }))).items[0].dateApplied, '2026-01-01')
    }
    await client.query("DELETE FROM applications WHERE company = 'Beta'")
    const clamped = await queryApplications(parseListQuery({ page: '3' }))
    assert.equal(clamped.page, 2)
    assert.equal(clamped.items.length, 2)
    const empty = await queryApplications(parseListQuery({ search: 'missing', page: '3' }))
    assert.equal(empty.page, 1)
    assert.equal(empty.total, 0)
    for (const input of [{ page: '0' }, { pageSize: '999' }, { sort: 'id; DROP TABLE applications' }, { direction: 'sideways' }, { search: ['a', 'b'] }, { status: 'Unknown' }]) {
      assert.throws(() => parseListQuery(input))
    }
  } finally {
    if (pool) await pool.end()
    if (options === undefined) delete process.env.PGOPTIONS
    else process.env.PGOPTIONS = options
    await client.query('SET search_path TO public')
    await client.query(`DROP SCHEMA "${schema}" CASCADE`)
    await client.end()
  }
})
