import type { JobApplication } from './types'

export type ApplicationPage = { items: JobApplication[]; total: number; page: number; pageSize: number; totalPages: number; counts: Record<string, number> }

export async function fetchApplications(query: URLSearchParams, signal: AbortSignal): Promise<ApplicationPage> {
  const response = await fetch('/api/applications?' + query, { signal })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}
