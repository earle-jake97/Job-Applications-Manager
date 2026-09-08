import { useState, useEffect } from 'react'
import type { ApplicationStatus, JobApplication, NewApplication } from './types'
import ApplicationItem from './components/ApplicationItem'
import ApplicationForm from './components/ApplicationForm'
import FormDialog from './components/FormDialog'
import { fetchApplications } from './api'
import type { ApplicationPage } from './api'

const sortableColumns = [
  { key: 'company', label: 'Company' },
  { key: 'position', label: 'Position' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'dateApplied', label: 'Date applied' },
  { key: 'updatedAt', label: 'Date updated' },
] as const

function App() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('id')
  const [direction, setDirection] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<ApplicationPage | null>(null)
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
  const filteredJobs = applications
  const tracked = result?.counts.All ?? 0

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ search, status: statusFilter, sort, direction, page: String(page), pageSize: String(pageSize) })
    fetchApplications(query, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setApplications(data.items)
      setResult(data)
      setLoadError('')
      setIsLoading(false)
    }).catch(() => {
      if (controller.signal.aborted) return
      setLoadError('Could not load applications. Please try again.')
      setIsLoading(false)
    })
    // A late response from an older query must not replace the newest results.
    return () => controller.abort()
  }, [search, statusFilter, sort, direction, page, pageSize, revision])

  function refreshList(resetPage = false) {
    setIsLoading(true)
    if (resetPage) setPage(1)
    else if (result) setPage(result.page)
    setRevision(value => value + 1)
  }

  function handleSort(column: typeof sortableColumns[number]['key']) {
    setDirection(sort === column && direction === 'asc' ? 'desc' : 'asc')
    setSort(column)
    refreshList(true)
  }

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

      refreshList(true)
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
      refreshList()
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
      refreshList()
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

      refreshList()
      setNotice('Status updated.')
    } catch (error) {
      console.error('Could not update application status:', error)
      setStatusError('Could not update the status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  function loadApplications() {
    setDeleteError('')
    setStatusError('')
    refreshList()
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
            <p className="mt-2 text-sm text-slate-500">{isLoading ? 'Loading your applications…' : tracked + (tracked === 1 ? ' application tracked' : ' applications tracked')}</p>
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
                const count = result?.counts[status] ?? 0
                return <button key={status} type="button" aria-pressed={statusFilter === status} disabled={isBusy || isFormOpen} onClick={() => { setStatusFilter(status); refreshList(true) }}
                  className={'inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ' + (statusFilter === status ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  {status}
                  <span className={'rounded px-1.5 text-xs tabular-nums ' + (statusFilter === status ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
                </button>
              })}
            </div>
            <span className="text-sm text-slate-500">{isLoading ? 'Loading…' : `${result?.total ? ((result.page - 1) * result.pageSize) + 1 : 0}–${result ? (result.page - 1) * result.pageSize + applications.length : 0} of ${result?.total ?? 0} matching`}</span>
          </div>

          <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 px-5 py-4">
            <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim()); refreshList(true) }}>
              <label className="text-sm text-slate-600">Search company, position, or notes
                <input type="search" maxLength={200} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} disabled={isFormOpen}
                  className="mt-1 block w-72 max-w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <button disabled={isBusy || isFormOpen} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40">Search</button>
              <button type="button" disabled={isBusy || isFormOpen} onClick={() => { setSearchDraft(''); setSearch(''); refreshList(true) }} className="px-3 py-2 text-sm text-slate-600">Clear</button>
            </form>
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable applications table">
            <table className="w-full min-w-[1280px] border-collapse text-left text-base">
              <caption className="sr-only">Job applications with location, status, dates, job links, notes, and editing actions</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                <tr>
                  {sortableColumns.map(({ key, label }) => (
                    <th key={key} scope="col" aria-sort={sort === key ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                      className="whitespace-nowrap px-4 py-3 font-medium">
                      <button type="button" disabled={isBusy || isFormOpen} onClick={() => handleSort(key)}
                        aria-label={`${label}: sort ${sort === key && direction === 'asc' ? 'descending' : 'ascending'}`}
                        className="-mx-2 -my-2 inline-flex min-h-10 items-center gap-1 rounded px-2 py-2 text-left hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40">
                        {label}
                        <span aria-hidden="true" className="inline-block w-3 text-xs text-slate-900">{sort === key ? (direction === 'asc' ? '↑' : '↓') : ''}</span>
                      </button>
                    </th>
                  ))}
                  {['Job posting', 'Notes', 'Actions'].map(label => (
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
                  <p className="font-semibold text-slate-800">{tracked === 0 ? 'No applications yet' : 'No matching applications'}</p>
                  <p className="mt-2 text-sm text-slate-500">{tracked === 0 ? 'Add your first application to start tracking your search.' : 'Try another search or status.'}</p>
                </td></tr>}
                {!isLoading && loadError && applications.length === 0 && <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-500">Applications could not be loaded. Use Refresh to try again.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
            <label>Rows per page <select value={pageSize} disabled={isBusy || isFormOpen} onChange={event => { setPageSize(Number(event.target.value)); refreshList(true) }} className="ml-2 rounded border border-slate-300 p-2">
              {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
            </select></label>
            <div className="flex items-center gap-3">
              <button disabled={isBusy || isFormOpen || !!loadError || !result || result.page <= 1} onClick={() => { setIsLoading(true); setPage((result?.page ?? 1) - 1) }} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button>
              <span aria-live="polite">Page {result?.page ?? 1} of {result?.totalPages ?? 1}</span>
              <button disabled={isBusy || isFormOpen || !!loadError || !result || result.page >= result.totalPages} onClick={() => { setIsLoading(true); setPage((result?.page ?? 1) + 1) }} className="rounded border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
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
