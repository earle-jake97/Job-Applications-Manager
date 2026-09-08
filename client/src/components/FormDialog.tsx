import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type FormDialogProps = { children: ReactNode; busy: boolean; onClose: () => void }

export default function FormDialog({ children, busy, onClose }: FormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={dialogRef} aria-labelledby="application-form-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 sm:p-8">
      {children}
    </dialog>
  )
}
