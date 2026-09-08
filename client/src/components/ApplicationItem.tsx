import type { ApplicationStatus, JobApplication } from '../types'

type ApplicationItemProps = {
  application: JobApplication
  onStatusChange: (id: number, newStatus: ApplicationStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
  disabled: boolean
  isDeleting: boolean
  isUpdating: boolean
}

export default function ApplicationItem({
  application,
  onStatusChange,
  onDelete,
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
      <button type="button" onClick={() => onDelete(application.id)} disabled={disabled}>
      {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
      </li> 
  )
}
