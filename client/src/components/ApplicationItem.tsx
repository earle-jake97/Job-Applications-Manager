import { useState } from 'react'
import type { ApplicationStatus, JobApplication } from '../types'

const statusClasses: Record<ApplicationStatus, string> = {
  Applied: 'border-blue-200 bg-blue-50 text-blue-800',
  Interview: 'border-amber-200 bg-amber-50 text-amber-900',
  Rejected: 'border-slate-200 bg-slate-100 text-slate-600',
  Offer: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return month + '/' + day + '/' + year
}

type ApplicationItemProps = {
  application: JobApplication
  onStatusChange: (id: number, newStatus: ApplicationStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onEdit: (id: number) => void
  disabled: boolean
  isDeleting: boolean
  isUpdating: boolean
}

export default function ApplicationItem({ application, onStatusChange, onDelete, onEdit, disabled, isDeleting, isUpdating }: ApplicationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cell = 'px-4 py-4 align-top '
  const updated = application.updatedAt ? new Date(application.updatedAt) : null

  return (
    <tr className="h-20 border-b border-slate-200/80 transition-colors last:border-0 even:bg-slate-50/60 hover:bg-blue-50/40">
      <th scope="row" className={cell + 'max-w-56 text-left font-semibold text-slate-900'}><span title={application.company} className="line-clamp-2 max-h-12 leading-6 [overflow-wrap:anywhere]">{application.company}</span></th>
      <td className={cell + 'max-w-64 text-slate-700'}><span title={application.position} className="line-clamp-2 max-h-12 leading-6 [overflow-wrap:anywhere]">{application.position}</span></td>
      <td className={cell + 'whitespace-nowrap text-sm text-slate-600'}>
        {application.location ? <span className="inline-flex min-h-9 items-center">{application.location}</span> : <span aria-label="Location not specified" className="text-slate-400">—</span>}
      </td>
      <td className={cell}>
        <select
          aria-label={'Status for ' + application.company + ', ' + application.position}
          value={application.status}
          disabled={disabled}
          onChange={(event) => onStatusChange(application.id, event.target.value as ApplicationStatus)}
          className={'min-h-9 w-28 rounded-md border px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ' + statusClasses[application.status]}
        >
          <option value="Applied">Applied</option>
          <option value="Interview">Interview</option>
          <option value="Rejected">Rejected</option>
          <option value="Offer">Offer</option>
        </select>
        {isUpdating && <span role="status" className="sr-only">Saving…</span>}
      </td>
      <td className={cell + 'whitespace-nowrap text-sm text-slate-600 tabular-nums'}>
        <span aria-label={application.dateApplied ? undefined : 'Date applied not recorded'}>{formatDate(application.dateApplied)}</span>
      </td>
      <td className={cell + 'whitespace-nowrap text-sm text-slate-600 tabular-nums'}>
        {updated ? <time dateTime={application.updatedAt!} title={updated.toLocaleString()}>
          {updated.toLocaleDateString()}<span className="mt-1 block text-xs text-slate-500">{updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        </time> : <span aria-label="Date updated not recorded">—</span>}
      </td>
      <td className={cell + 'text-sm'}>
        {application.jobUrl ? <a href={application.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap font-medium text-blue-700 underline-offset-4 hover:underline">View job <span aria-hidden="true">↗</span><span className="sr-only"> for {application.company} (opens in a new tab)</span></a> : <span className="text-slate-400" aria-label="No job URL">—</span>}
      </td>
      <td className={cell + 'w-56 max-w-64 text-sm text-slate-600'}>
        {application.notes ? <details className="group">
          <summary className="flex cursor-pointer list-none items-start gap-1 rounded text-left hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="shrink-0 leading-6 text-slate-400 transition-transform group-open:rotate-90">▸</span>
            <span className="line-clamp-2 max-h-12 whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">{application.notes}</span>
          </summary>
          <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-100 p-3 leading-6 [overflow-wrap:anywhere]">{application.notes}</p>
        </details> : <span className="text-slate-400" aria-label="No notes">—</span>}
      </td>
      <td className={cell + 'w-44 text-sm'}>
        {confirmDelete ? <div className="h-12 min-w-36">
          <p className="text-xs leading-4 font-medium text-red-900">Delete this entry?</p>
          <div className="flex h-8 gap-2">
            <button type="button" disabled={disabled} onClick={async () => { await onDelete(application.id); setConfirmDelete(false) }} className="rounded-md bg-red-700 px-2 font-medium text-white hover:bg-red-800 disabled:opacity-50">{isDeleting ? 'Deleting…' : 'Delete'}</button>
            <button type="button" disabled={disabled} onClick={() => setConfirmDelete(false)} className="rounded-md px-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          </div>
        </div> : <div className="flex items-center gap-1">
          <button type="button" onClick={() => onEdit(application.id)} disabled={disabled} aria-label={'Edit ' + application.company} className="min-h-9 rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 shadow-xs hover:border-blue-300 hover:text-blue-700 disabled:opacity-40">Edit</button>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={disabled} aria-label={'Delete ' + application.company} className="min-h-9 rounded-md px-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40">Delete</button>
        </div>}
      </td>
    </tr>
  )
}

