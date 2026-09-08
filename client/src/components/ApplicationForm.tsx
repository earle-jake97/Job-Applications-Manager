import { useState } from 'react'

type ApplicationFormProps = {
  onAdd: (company: string, position: string) => Promise<void>
  isSaving: boolean
  disabled: boolean
}

export default function ApplicationForm({ onAdd, isSaving, disabled }: ApplicationFormProps) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
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

    try {
      await onAdd(trimmedCompany, trimmedPosition)
      setCompany('')
      setPosition('')
    } catch (error) {
      console.error('Could not save application:', error)
      setSubmitError('Could not save the application. Your entries are still here; please try again.')
    }
  }

  return (
    <>
      <h2>Add application</h2>
      <form onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          type="text"
          required
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

        <p>Applying to {company} for the position of {position}</p>

        {submitError && <p role="alert">{submitError}</p>}
        <button type="submit" disabled={disabled}>
          {isSaving ? 'Saving…' : 'Add Application'}
        </button>
      </form>
    </>
  )
}
