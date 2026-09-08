import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Client } from 'pg'
import { isCalendarDate, isWebUrl, parseApplicationInput } from '../dist/validation.js'

test('migration preserves existing rows; details and update timestamps persist', async () => {
  const schema = `application_test_${randomUUID().replaceAll('-', '')}`
  const admin = new Client()
  let pool
  let schemaCreated = false
  const originalOptions = process.env.PGOPTIONS
  const company = `Integration test ${randomUUID()} O'Brien`

  try {
    await admin.connect()
    await admin.query(`CREATE SCHEMA "${schema}"`)
    schemaCreated = true
    await admin.query(`SET search_path TO "${schema}"`)
    await admin.query(await readFile(new URL('../sql/001_create_applications.sql', import.meta.url), 'utf8'))
    await admin.query("INSERT INTO applications (company, position) VALUES ('Existing record', 'Engineer')")
    await admin.query(await readFile(new URL('../sql/002_application_details.sql', import.meta.url), 'utf8'))

    // The repository pool connects only to this test's newly created schema.
    process.env.PGOPTIONS = `-c search_path=${schema}`
    ;({ pool } = await import('../dist/db.js'))
    const { createApplication, deleteApplication, listApplications, updateApplicationStatus, updateApplicationDetails } =
      await import('../dist/applications.js')

    const [existing] = await listApplications()
    assert.equal(existing.company, 'Existing record')
    assert.equal(existing.dateApplied, null)
    assert.equal(existing.updatedAt, null)
    assert.equal(existing.jobUrl, null)
    assert.equal(existing.notes, '')

    const details = {
      dateApplied: '2024-02-29',
      jobUrl: 'https://example.com/jobs/123',
      notes: "Recruiter's notes\nFollow up next week",
    }
    const created = await createApplication(company, 'Test Engineer', details)
    const applicationId = created.id
    assert.equal(created.company, company)
    assert.equal(created.status, 'Applied')
    assert.ok(Number.isInteger(created.id))
    assert.equal(created.dateApplied, details.dateApplied)
    assert.equal(created.jobUrl, details.jobUrl)
    assert.equal(created.notes, details.notes)
    assert.ok(created.updatedAt instanceof Date)

    const listed = await listApplications()
    assert.deepEqual(listed.find(job => job.id === applicationId), created)

    const updated = await updateApplicationStatus(applicationId, 'Offer')
    assert.deepEqual(updated, { ...created, status: 'Offer', updatedAt: updated.updatedAt })
    assert.ok(updated.updatedAt.getTime() >= created.updatedAt.getTime())

    const unchanged = await updateApplicationStatus(applicationId, 'Offer')
    assert.deepEqual(unchanged.updatedAt, updated.updatedAt)

    // SQL changes outside the API must also refresh the timestamp.
    await admin.query('UPDATE applications SET notes = $1 WHERE id = $2', ['Changed via SQL', applicationId])
    const changedViaSql = (await listApplications()).find(job => job.id === applicationId)
    assert.ok(changedViaSql.updatedAt.getTime() >= updated.updatedAt.getTime())
    assert.equal(changedViaSql.dateApplied, details.dateApplied)

    const updatedExisting = await updateApplicationStatus(existing.id, 'Interview')
    assert.ok(updatedExisting.updatedAt instanceof Date)
    assert.equal(updatedExisting.dateApplied, null)

    const editedDetails = {
      company: "Edited O'Brien Corp",
      position: 'Senior Engineer',
      jobUrl: 'https://example.com/new-job',
      dateApplied: '2026-09-01',
      notes: 'Updated notes\nSecond line',
    }
    await admin.query('SELECT pg_sleep(0.01)')
    const edited = await updateApplicationDetails(applicationId, editedDetails)
    assert.equal(edited.id, applicationId)
    assert.equal(edited.status, 'Offer')
    for (const [field, value] of Object.entries(editedDetails)) assert.equal(edited[field], value)
    assert.ok(edited.updatedAt.getTime() > changedViaSql.updatedAt.getTime())
    const afterEdit = await listApplications()
    assert.deepEqual(afterEdit.find(job => job.id === applicationId), edited)
    assert.deepEqual(afterEdit.find(job => job.id === existing.id), updatedExisting)

    const sameDetails = await updateApplicationDetails(applicationId, editedDetails)
    assert.deepEqual(sameDetails.updatedAt, edited.updatedAt)
    const cleared = await updateApplicationDetails(applicationId, {
      ...editedDetails, jobUrl: null, dateApplied: null, notes: '',
    })
    assert.equal(cleared.jobUrl, null)
    assert.equal(cleared.dateApplied, null)
    assert.equal(cleared.notes, '')
    assert.equal(cleared.status, 'Offer')

    await assert.rejects(
      updateApplicationStatus(applicationId, 'Banana'),
      { code: '23514' },
    )
    const afterInvalidUpdate = await listApplications()
    assert.equal(afterInvalidUpdate.find(job => job.id === applicationId).status, 'Offer')

    assert.equal(await deleteApplication(applicationId), true)
    assert.equal(await deleteApplication(applicationId), false)
    assert.equal(await updateApplicationStatus(applicationId, 'Interview'), undefined)
    assert.equal(await updateApplicationDetails(applicationId, editedDetails), undefined)
    assert.equal((await listApplications()).some(job => job.id === applicationId), false)
  } finally {
    try {
      if (pool) await pool.end()
    } finally {
      if (originalOptions === undefined) delete process.env.PGOPTIONS
      else process.env.PGOPTIONS = originalOptions
      try {
        // schema is generated above and contains only this test's fixtures.
        if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`)
      } finally {
        await admin.end()
      }
    }
  }
})

test('calendar date and web URL validation', () => {
  assert.equal(isCalendarDate('2024-02-29'), true)
  assert.equal(isCalendarDate('2025-02-29'), false)
  assert.equal(isCalendarDate('2026-04-31'), false)
  assert.equal(isCalendarDate('2026-09-08T00:00:00Z'), false)
  assert.equal(isCalendarDate('0000-01-01'), false)
  assert.equal(isWebUrl('https://example.com/jobs/123'), true)
  assert.equal(isWebUrl('javascript:alert(1)'), false)
  assert.equal(isWebUrl('not a URL'), false)
})

test('add and edit input validation trims fields and allows clearing optional values', () => {
  const input = { company: ' Example ', position: ' Engineer ', jobUrl: '', dateApplied: '', notes: ' ' }
  assert.deepEqual(parseApplicationInput(input).data, {
    company: 'Example', position: 'Engineer', jobUrl: null, dateApplied: null, notes: '',
  })
  for (const body of [null, [], 'text', { ...input, company: ' ' },
    { ...input, jobUrl: 'javascript:alert(1)' }, { ...input, dateApplied: '2026-02-30' },
    { ...input, notes: 3 }]) {
    assert.ok(parseApplicationInput(body).error)
  }
  assert.equal(parseApplicationInput({ ...input, updatedAt: 'fake', status: 'Offer' }).data.status, undefined)
  assert.equal(parseApplicationInput({ ...input, updatedAt: 'fake' }).data.updatedAt, undefined)
})
