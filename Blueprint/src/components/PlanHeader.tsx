import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { sendPlanToAI } from '../lib/api'
import { DEFAULT_PLAN_ID } from '../lib/planStorage'
import { ROUTES } from '../routes'
import PlanName from './PlanName'

const STEPS = [
  { label: '1 · Plan', to: ROUTES.newPlan },
  { label: '2 · Build', to: ROUTES.build },
  { label: '3 · Understand', to: ROUTES.understand },
]

const PILL_STYLE =
  'rounded-full border px-4 py-1.5 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

export default function PlanHeader() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const result = await sendPlanToAI(DEFAULT_PLAN_ID)
      // TODO: show this in the UI (e.g. on the Build page).
      console.log('AI response:', result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-4">
        <Link to={ROUTES.home} className="flex w-fit shrink-0 items-center gap-3 no-underline">
          <img src="/logo.svg" alt="" className="size-6" />
          <span className="text-base font-semibold">Blueprint</span>
        </Link>
        <PlanName planId={DEFAULT_PLAN_ID} />
      </div>

      <nav aria-label="Steps" className="flex items-center gap-2">
        {STEPS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${PILL_STYLE} ${
                isActive
                  ? 'border-ink bg-ink font-medium text-white'
                  : 'border-gray-300 bg-white text-ink hover:bg-gray-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send plan to AI'}
        </button>
      </div>
    </header>
  )
}
