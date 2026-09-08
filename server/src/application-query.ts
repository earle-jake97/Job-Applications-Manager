import { pool } from './db.js'

const sorts = { company: 'lower(company)', position: 'lower(position)', status: 'status', location: 'location', dateApplied: 'date_applied', updatedAt: 'updated_at', id: 'id' } as const
export type ListQuery = { search: string; status: string; sort: keyof typeof sorts; direction: 'asc' | 'desc'; page: number; pageSize: number }

export function parseListQuery(input: Record<string, unknown>): ListQuery {
  const value = (key: string, fallback: string) => {
    const entry = input[key] ?? fallback
    if (typeof entry !== 'string') throw new Error(`Invalid ${key}`)
    return entry
  }
  const search = value('search', '').trim()
  const status = value('status', 'All')
  const sort = value('sort', 'id')
  const direction = value('direction', 'asc')
  const page = value('page', '1')
  const pageSize = value('pageSize', '10')
  if (search.length > 200 || !['All', 'Applied', 'Interview', 'Offer', 'Rejected'].includes(status) ||
      !Object.hasOwn(sorts, sort) || !['asc', 'desc'].includes(direction) ||
      !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)) ||
      !['10', '25', '50'].includes(pageSize)) throw new Error('Invalid application list query')
  return { search, status, sort: sort as ListQuery['sort'], direction: direction as ListQuery['direction'], page: Number(page), pageSize: Number(pageSize) }
}

export async function queryApplications(query: ListQuery) {
  const client = await pool.connect()
  try {
    // Counts and rows describe the same snapshot, even if another request edits a job.
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const pattern = '%' + query.search.replace(/[\\%_]/g, '\\$&') + '%'
    const where = `WHERE ($1 = 'All' OR status = $1) AND
      (company ILIKE $2 OR position ILIKE $2 OR notes ILIKE $2)`
    const params = [query.status, pattern]
    const counted = await client.query(`SELECT count(*)::int AS total FROM applications ${where}`, params)
    const total = counted.rows[0].total as number
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
    const page = Math.min(query.page, totalPages)
    // Only allowlisted SQL identifiers are interpolated. User values stay parameters.
    const rows = await client.query(`SELECT id, company, position, status, location, notes,
      job_url AS "jobUrl", to_char(date_applied, 'YYYY-MM-DD') AS "dateApplied", updated_at AS "updatedAt"
      FROM applications ${where} ORDER BY ${sorts[query.sort]} ${query.direction} NULLS LAST, id ASC
      LIMIT $3 OFFSET $4`, [...params, query.pageSize, (page - 1) * query.pageSize])
    const grouped = await client.query('SELECT status, count(*)::int AS count FROM applications GROUP BY status')
    const counts: Record<string, number> = { All: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 }
    for (const row of grouped.rows) { counts[row.status] = row.count; counts.All! += row.count }
    await client.query('COMMIT')
    return { items: rows.rows, total, page, pageSize: query.pageSize, totalPages, counts }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}
