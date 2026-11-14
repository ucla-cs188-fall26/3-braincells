import { useEffect, useRef } from 'react'

// The demo outro shown after the first time a line is traced back to the plan. It's a native
// modal dialog, so focus stays inside it and Esc closes it.
export default function OutroDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    // No close() on cleanup: it would fire onClose. Unmounting removes the dialog anyway.
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="outro-heading"
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-gray-200 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/20 motion-safe:animate-row-in"
    >
      <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 text-center">
        <h2 id="outro-heading" className="text-2xl leading-snug font-semibold tracking-tight">
          You planned it. The AI built it. You can trace every line.
        </h2>
        <p className="text-muted">Plan, then build, then understand, in your own words.</p>
        <button
          autoFocus
          type="button"
          onClick={onClose}
          className="mt-3 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Got it
        </button>
      </div>
    </dialog>
  )
}
