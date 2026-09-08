import './App.css'
import { useState, useEffect } from 'react'
import type { ApplicationStatus, JobApplication, NewApplication } from './types'
import ApplicationItem from './components/ApplicationItem'
import ApplicationForm from './components/ApplicationForm'
import { fetchApplications } from './api'

function App() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  const isBusy = isLoading || isSaving || deletingId !== null || updatingId !== null
  const editingApplication = applications.find(application => application.id === editingId)
  const emptyMessage = "No applications found for the selected status."
  const filteredJobs = applications.filter(job => statusFilter === 'All' || job.status === statusFilter)

  useEffect(() => {
  let ignore = false

  async function loadInitialApplications() {
    try {
      const data = await fetchApplications()

      if (!ignore) {
        setApplications(data)
      }
    } catch {
      if (!ignore) {
        setLoadError('Could not load applications. Please try again.')
      }
    } finally {
      if (!ignore) {
        setIsLoading(false)
      }
    }
  }

  loadInitialApplications()

  return () => {
    ignore = true
  }
}, [])

  async function handleAddApplication(details: NewApplication): Promise<void> {
    setIsSaving(true)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
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

  async function handleEditApplication(details: NewApplication): Promise<void> {
    if (editingId === null) throw new Error('Choose an application to edit.')
    const id = editingId
    setIsSaving(true)
    try {
      const response = await fetch(`/api/applications/${id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This application no longer exists. Your draft is still here. Cancel and reload the list to refresh it.')
        }
        throw new Error('Could not save changes. Your draft is still here; please try again.')
      }
      const application: JobApplication = await response.json()
      setApplications(currentApplications => currentApplications.map(job => job.id === id ? application : job))
      setEditingId(null)
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Could not reach the server. Your draft is still here; please try again.', { cause: error })
      }
      throw error
    } finally {
      setIsSaving(false)
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
      const data = await fetchApplications()
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
          <button type="button" onClick={loadApplications} disabled={isBusy || editingId !== null}>
            {isLoading ? 'Loading…' : 'Load applications from server'}
          </button>
          {loadError && <p role="alert">{loadError}</p>}
          <h2>Showing {filteredJobs.length} out of {applications.length} applications</h2>
          <ApplicationForm
            key={editingId === null ? 'new' : `edit-${editingId}`}
            initialValues={editingApplication}
            onSave={editingId === null ? handleAddApplication : handleEditApplication}
            onCancel={editingId === null ? undefined : () => setEditingId(null)}
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
                onEdit={setEditingId}
                disabled={isBusy || editingId !== null}
                isDeleting={deletingId === item.id}
                isUpdating={updatingId === item.id}
              />
            ))}
          </ul>
          {!isLoading && !loadError && filteredJobs.length === 0 && (
            <p>{emptyMessage}</p>
          )}
        </div>
      </section>
    </>
  )
}

export default App
