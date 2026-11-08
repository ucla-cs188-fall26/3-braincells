import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import { DEFAULT_PLAN_NAME, loadPlanName, savePlanName } from '../lib/planStorage'

const MAX_LENGTH = 60

// Click the name to rename it: Enter or clicking away saves, Esc cancels.
export default function PlanName({ planId }: { planId: string }) {
  const [name, setName] = useState(() => loadPlanName(planId))
  const [draft, setDraft] = useState(name)
  const [editing, setEditing] = useState(false)

  const startEditing = () => {
    setDraft(name)
    setEditing(true)
  }

  const save = () => {
    const next = draft.trim() || DEFAULT_PLAN_NAME
    setName(next)
    savePlanName(planId, next)
    setEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') save()
    if (event.key === 'Escape') setEditing(false)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    // The input also blurs when Esc removes it; there is nothing to save then.
    if (event.currentTarget.isConnected) save()
  }

  return (
    <div className="flex items-center gap-1 text-sm text-muted">
      <span aria-hidden="true">/</span>
      {editing ? (
        // The hidden span holds the same text as the input, so the box grows as you type.
        <div className="inline-grid rounded-md border border-brand bg-white px-2 py-0.5 text-ink">
          <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre">
            {draft || DEFAULT_PLAN_NAME}
          </span>
          <input
            autoFocus
            size={1} // keeps the input's built-in width from stretching the box
            maxLength={MAX_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={DEFAULT_PLAN_NAME}
            aria-label="Plan name"
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          title="Rename plan"
          className="max-w-64 cursor-text truncate rounded-md border border-transparent px-2 py-0.5 hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {name}
        </button>
      )}
    </div>
  )
}
