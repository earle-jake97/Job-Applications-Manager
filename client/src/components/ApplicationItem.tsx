import type { ApplicationStatus, JobApplication } from '../types'

type ApplicationItemProps = {
  application: JobApplication
  onStatusChange: (id: number, newStatus: ApplicationStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onEdit: (id: number) => void
  disabled: boolean
  isDeleting: boolean
  isUpdating: boolean
}

export default function ApplicationItem({
  application,
  onStatusChange,
  onDelete,
  onEdit,
  disabled,
  isDeleting,
  isUpdating,
}: ApplicationItemProps) {
  return (
    <li>{application.company}: {application.position} -- 
      <label htmlFor={`status-${application.id}`}>Status</label>
      <select
      id={`status-${application.id}`}
      value={application.status}
      disabled={disabled}
      onChange={(event) =>
            onStatusChange(
            application.id,
            event.target.value as ApplicationStatus
            )
      }
      >
      <option value="Applied">Applied</option>
      <option value="Interview">Interview</option>
      <option value="Rejected">Rejected</option>
      <option value="Offer">Offer</option>
      </select> 
      {isUpdating && <span role="status">Saving status…</span>}
      <button type="button" onClick={() => onEdit(application.id)} disabled={disabled}>Edit</button>
      <button type="button" onClick={() => onDelete(application.id)} disabled={disabled}>
      {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
      <dl>
        <dt>Date applied</dt>
        <dd>{application.dateApplied ?? 'Not recorded'}</dd>
        <dt>Date updated</dt>
        <dd>{application.updatedAt
          ? <time dateTime={application.updatedAt}>{new Date(application.updatedAt).toLocaleString()}</time>
          : 'Not recorded'}</dd>
      </dl>
      {application.jobUrl && (
        <p><a href={application.jobUrl} target="_blank" rel="noopener noreferrer">View job posting</a></p>
      )}
      {application.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{application.notes}</p>}
      </li> 
  )
}
