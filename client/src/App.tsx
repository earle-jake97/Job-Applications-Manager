import { useState, useEffect } from 'react'
import type { ApplicationStatus, JobApplication, NewApplication } from './types'
import ApplicationItem from './components/ApplicationItem'
import ApplicationForm from './components/ApplicationForm'
import FormDialog from './components/FormDialog'
import { fetchApplications } from './api'

function App() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [notice, setNotice] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [statusError, setStatusError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [loadError, setLoadError] = useState('')
  const isBusy = isLoading || isSaving || deletingId !== null || updatingId !== null
  const editingApplication = applications.find(application => application.id === editingId)
  const isFormOpen = isAdding || editingId !== null
  const closeForm = () => { setIsAdding(false); setEditingId(null) }
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
      setIsAdding(false)
      setNotice('Application added. ' + (statusFilter !== 'All' && statusFilter !== 'Applied' ? 'Choose All or Applied to see it.' : ''))
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
      setNotice('Application deleted.')
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
      setNotice('Changes saved.')
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
      setNotice('Status updated.')
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold tracking-tight">Jake's Application Manager</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">Job search</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Applications</h1>
            <p className="mt-2 text-sm text-slate-500">{isLoading ? 'Loading your applications…' : applications.length + (applications.length === 1 ? ' application tracked' : ' applications tracked')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadApplications} disabled={isBusy || isFormOpen}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40">
              {isLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => { setNotice(''); setIsAdding(true) }} disabled={isBusy || isFormOpen}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40">
              <span aria-hidden="true" className="text-lg leading-none">+</span> Add application
            </button>
          </div>
        </div>

        {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification" className="rounded px-2 py-1 text-emerald-800 hover:bg-emerald-100">×</button>
        </div>}
        {[loadError, deleteError, statusError].filter(Boolean).map((message, index) => (
          <p key={index} role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{message}</p>
        ))}

        <section aria-label="Application tracker" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter applications by status">
              {(['All', 'Applied', 'Interview', 'Offer', 'Rejected'] as const).map(status => {
                const count = status === 'All' ? applications.length : applications.filter(job => job.status === status).length
                return <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)}
                  className={'inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ' + (statusFilter === status ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  {status}
                  <span className={'rounded px-1.5 text-xs tabular-nums ' + (statusFilter === status ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
                </button>
              })}
            </div>
            <span className="text-sm text-slate-500">{filteredJobs.length} of {applications.length} shown</span>
          </div>

          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable applications table">
            <table className="w-full min-w-[1280px] border-collapse text-left text-base">
              <caption className="sr-only">Job applications with location, status, dates, job links, notes, and editing actions</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                <tr>
                  {['Company', 'Position', 'Location', 'Status', 'Date applied', 'Date updated', 'Job posting', 'Notes', 'Actions'].map(label => (
                    <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(item => (
                  <ApplicationItem key={item.id} application={item}
                    onStatusChange={handleStatusChange} onDelete={handleDeleteApplication}
                    onEdit={(id) => { setNotice(''); setEditingId(id) }}
                    disabled={isBusy || isFormOpen} isDeleting={deletingId === item.id} isUpdating={updatingId === item.id} />
                ))}
                {isLoading && applications.length === 0 && <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-500"><span role="status">Loading applications…</span></td></tr>}
                {!isLoading && !loadError && filteredJobs.length === 0 && <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <p className="font-semibold text-slate-800">{applications.length === 0 ? 'No applications yet' : 'No ' + statusFilter.toLowerCase() + ' applications'}</p>
                  <p className="mt-2 text-sm text-slate-500">{applications.length === 0 ? 'Add your first application to start tracking your search.' : 'Choose another status to see more applications.'}</p>
                </td></tr>}
                {!isLoading && loadError && applications.length === 0 && <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-500">Applications could not be loaded. Use Refresh to try again.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">Dates are displayed in local time.<span className="ml-2 lg:hidden">Scroll horizontally to see all columns.</span></div>
        </section>

        {isFormOpen && <FormDialog busy={isBusy} onClose={closeForm}>
          <ApplicationForm key={editingId === null ? 'new' : 'edit-' + editingId}
            initialValues={editingApplication}
            onSave={editingId === null ? handleAddApplication : handleEditApplication}
            onCancel={closeForm} isSaving={isSaving} disabled={isBusy} />
        </FormDialog>}
      </main>
    </div>
  )
}

export default App
