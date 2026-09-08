import './App.css'
import { useState } from 'react'
import type { ApplicationStatus, JobApplication } from './types'
import ApplicationItem from './components/ApplicationItem'
import ApplicationForm from './components/ApplicationForm'

function App() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  const isBusy = isLoading || isSaving || deletingId !== null || updatingId !== null
  const emptyMessage = "No applications found for the selected status."
  const filteredJobs = applications.filter(job => statusFilter === 'All' || job.status === statusFilter)

  async function handleAddApplication(company: string, position: string): Promise<void> {
    setIsSaving(true)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, position }),
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const application: JobApplication = await response.json()
      setApplications(currentApplications => [...currentApplications, application])
    } finally {
      // Let failures reach the form so it can preserve the inputs and show an error.
      setIsSaving(false)
    }
  }

  async function handleDeleteApplication(id: number): Promise<void> {
    if (isBusy) return

    setDeletingId(id)
    setDeleteError('')

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        if (response.status === 404) {
          setDeleteError('This application no longer exists on the server. Load applications again to refresh the list.')
          return
        }
        throw new Error(`Request failed: ${response.status}`)
      }

      // A successful DELETE returns 204 with no JSON body to parse.
      setApplications(currentApplications =>
        currentApplications.filter(job => job.id !== id)
      )
    } catch (error) {
      console.error('Could not delete application:', error)
      setDeleteError('Could not delete the application. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleStatusChange(id: number, newStatus: ApplicationStatus): Promise<void> {
    if (isBusy) return

    setUpdatingId(id)
    setStatusError('')

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          setStatusError('This application no longer exists on the server. Load applications again to refresh the list.')
          return
        }
        throw new Error(`Request failed: ${response.status}`)
      }

      const application: JobApplication = await response.json()
      setApplications(currentApplications =>
        currentApplications.map(job => job.id === id ? application : job)
      )
    } catch (error) {
      console.error('Could not update application status:', error)
      setStatusError('Could not update the status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function loadApplications() {
    setIsLoading(true)
    setLoadError('')

    try {
      const response = await fetch('/api/applications')

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const data: JobApplication[] = await response.json()
      setApplications(data)
      setDeleteError('')
      setStatusError('')
    } catch (error) {
      console.error('Could not load applications:', error)
      setLoadError('Could not load applications. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <section>
        <div>
          <h1>Job Application Manager</h1>
          <button type="button" onClick={loadApplications} disabled={isBusy}>
            {isLoading ? 'Loading…' : 'Load applications from server'}
          </button>
          {loadError && <p role="alert">{loadError}</p>}
          <h2>Showing {filteredJobs.length} out of {applications.length} applications</h2>
          <ApplicationForm
            onAdd={handleAddApplication}
            isSaving={isSaving}
            disabled={isBusy}
          />

          <label htmlFor="status-filter">Filter by status </label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'All')}>
            <option value="All">All</option>
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Rejected">Rejected</option>
            <option value="Offer">Offer</option>
          </select>
          {deleteError && <p role="alert">{deleteError}</p>}
          {statusError && <p role="alert">{statusError}</p>}
          <ul>
            {filteredJobs.map(item => (
              <ApplicationItem
                key={item.id}
                application={item}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteApplication}
                disabled={isBusy}
                isDeleting={deletingId === item.id}
                isUpdating={updatingId === item.id}
              />
            ))}
          </ul>
          {filteredJobs.length === 0 && (
            <p>{emptyMessage}</p>
          )}
        </div>
      </section>
    </>
  )
}

export default App
