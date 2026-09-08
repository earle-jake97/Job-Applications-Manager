import { useState } from 'react'
import type { NewApplication } from '../types'

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
        jobUrl: jobUrl.trim() || null,
        dateApplied: dateApplied || null,
        notes: notes.trim(),
      })
      if (!isEditing) {
        setCompany('')
        setPosition('')
        setJobUrl('')
        setDateApplied(today())
        setNotes('')
      }
    } catch (error) {
      console.error('Could not save application:', error)
      setSubmitError(isEditing && error instanceof Error ? error.message : 'Could not save the application. Your entries are still here; please try again.')
    }
  }

  return (
    <>
      <h2>{isEditing ? 'Edit application' : 'Add application'}</h2>
      <form onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          type="text"
          required
          autoFocus={isEditing}
          disabled={disabled}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />

        <label htmlFor="position">Position</label>
        <input
          id="position"
          type="text"
          required
          disabled={disabled}
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        />

        <label htmlFor="job-url">Job URL (optional)</label>
        <input
          id="job-url"
          type="url"
          placeholder="https://…"
          disabled={disabled}
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
        />

        <label htmlFor="date-applied">Date applied (optional)</label>
        <input
          id="date-applied"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          disabled={disabled}
          value={dateApplied}
          onChange={(event) => setDateApplied(event.target.value)}
        />

        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          rows={3}
          disabled={disabled}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <p>Date updated is recorded automatically when an application is created or changed.</p>

        {submitError && <p role="alert">{submitError}</p>}
        <button type="submit" disabled={disabled}>
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add Application'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} disabled={disabled}>Cancel</button>}
      </form>
    </>
  )
}
