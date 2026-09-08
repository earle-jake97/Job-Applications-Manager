import type { JobApplication } from './types'

export async function fetchApplications(): Promise<JobApplication[]> {
  const response = await fetch('/api/applications')

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json()
}
