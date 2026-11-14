import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { currentPayload } from '../lib/buildStore'
import { ROUTES } from '../routes'

const ITEM_STYLE =
  'block w-full rounded-md px-3 py-1.5 text-left text-sm whitespace-nowrap hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand'

// Saves the plan (in the same shape that is sent to the AI) as a .json file.
function exportPlan(planId: string) {
  const payload = currentPayload(planId)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${payload.name.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'plan'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// The "File ▾" dropdown in the top bar.
export default function FileMenu({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        File
        <ChevronDownIcon aria-hidden="true" className="size-4 text-muted" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 min-w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          <button autoFocus type="button" role="menuitem" onClick={choose(() => exportPlan(planId))} className={ITEM_STYLE}>
            Export plan as JSON
          </button>
          <button type="button" role="menuitem" onClick={choose(() => navigate(ROUTES.home))} className={ITEM_STYLE}>
            Close plan
          </button>
        </div>
      )}
    </div>
  )
}
