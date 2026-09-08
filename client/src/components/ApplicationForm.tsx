import { useState } from 'react'
import type { ApplicationLocation, NewApplication } from '../types'

function today(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type ApplicationFormProps = {
  onSave: (application: NewApplication) => Promise<void>
  initialValues?: NewApplication
  onCancel?: () => void
  isSaving: boolean
  disabled: boolean
}

export default function ApplicationForm({ onSave, initialValues, onCancel, isSaving, disabled }: ApplicationFormProps) {
  const isEditing = initialValues !== undefined
  const [company, setCompany] = useState(initialValues?.company ?? '')
  const [position, setPosition] = useState(initialValues?.position ?? '')
  const [location, setLocation] = useState<ApplicationLocation | ''>(initialValues?.location ?? '')
  const [jobUrl, setJobUrl] = useState(initialValues?.jobUrl ?? '')
  const [dateApplied, setDateApplied] = useState(() => initialValues ? initialValues.dateApplied ?? '' : today())
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit() {
    if (disabled) {
      return
    }

    setSubmitError('')
    const trimmedCompany = company.trim()
    const trimmedPosition = position.trim()

    if (!trimmedCompany || !trimmedPosition) {
      setSubmitError('Enter a company and position before submitting.')
      return
    }

    if (jobUrl.trim()) {
      try {
        const url = new URL(jobUrl.trim())
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Invalid protocol')
      } catch {
        setSubmitError('Enter a job URL starting with http:// or https://.')
        return
      }
    }

    try {
      await onSave({
        company: trimmedCompany,
        position: trimmedPosition,
        location: location || null,
        jobUrl: jobUrl.trim() || null,
        dateApplied: dateApplied || null,
        notes: notes.trim(),
      })
      if (!isEditing) {
        setCompany('')
        setPosition('')
        setLocation('')
        setJobUrl('')
        setDateApplied(today())
        setNotes('')
      }
    } catch (error) {
      console.error('Could not save application:', error)
      setSubmitError(isEditing && error instanceof Error ? error.message : 'Could not save the application. Your entries are still here; please try again.')
    }
  }

  const inputClass = 'mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500'
  const labelClass = 'text-sm font-medium text-slate-700'

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="application-form-title" className="text-2xl font-semibold tracking-tight text-slate-900">{isEditing ? 'Edit application' : 'Add application'}</h2>
          <p className="mt-1 text-sm text-slate-500">{isEditing ? 'Changes are saved only when you select Save changes.' : 'Company and position are required.'}</p>
        </div>
        {onCancel && <button type="button" disabled={disabled} onClick={onCancel} aria-label="Close form" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">×</button>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); handleSubmit() }}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="company" className={labelClass}>Company <span className="text-blue-600" aria-hidden="true">*</span></label>
            <input id="company" type="text" required autoFocus disabled={disabled} value={company} placeholder="Company name" className={inputClass} onChange={(event) => setCompany(event.target.value)} />
          </div>
          <div>
            <label htmlFor="position" className={labelClass}>Position <span className="text-blue-600" aria-hidden="true">*</span></label>
            <input id="position" type="text" required disabled={disabled} value={position} placeholder="Job title" className={inputClass} onChange={(event) => setPosition(event.target.value)} />
          </div>
          <div>
            <label htmlFor="job-url" className={labelClass}>Job URL <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="job-url" type="url" disabled={disabled} value={jobUrl} placeholder="https://…" className={inputClass} onChange={(event) => setJobUrl(event.target.value)} />
          </div>
          <div>
            <label htmlFor="date-applied" className={labelClass}>Date applied <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="date-applied" type="date" min="0001-01-01" max="9999-12-31" disabled={disabled} value={dateApplied} className={inputClass} onChange={(event) => setDateApplied(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="location" className={labelClass}>Location <span className="font-normal text-slate-400">(optional)</span></label>
            <select id="location" disabled={disabled} value={location} className={inputClass} onChange={(event) => setLocation(event.target.value as ApplicationLocation | '')} aria-describedby="location-hint">
              <option value="">Not specified</option>
              <option value="In-office">In-office</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
            <p id="location-hint" className="mt-2 text-xs text-slate-500">Add a city, office address, or other location details in Notes.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className={labelClass}>Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="notes" rows={4} disabled={disabled} value={notes} placeholder="Contacts, interview details, or anything to remember…" className={inputClass + ' resize-y'} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">Date updated is recorded automatically when you save a change.</p>
        {submitError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{submitError}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
          {onCancel && <button type="button" onClick={onCancel} disabled={disabled} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Cancel</button>}
          <button type="submit" disabled={disabled} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40">
            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add application'}
          </button>
        </div>
      </form>
    </>
  )
}

