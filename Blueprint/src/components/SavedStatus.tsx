import { useEffect, useState } from 'react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { loadPlanSavedAt, subscribeToPlanSaves } from '../lib/planStorage'

const MINUTE = 60_000

function timeAgo(savedAt: number, now: number): string {
  const minutes = Math.floor((now - savedAt) / MINUTE)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(savedAt).toLocaleDateString()
}

// "✓ Saved · just now". Updates on every save, and once a minute so the time stays right.
export default function SavedStatus({ planId }: { planId: string }) {
  const [savedAt, setSavedAt] = useState(() => loadPlanSavedAt(planId))
  const [now, setNow] = useState(() => Date.now())

  useEffect(
    () =>
      subscribeToPlanSaves((saved) => {
        if (saved !== planId) return
        setSavedAt(loadPlanSavedAt(planId))
        setNow(Date.now())
      }),
    [planId],
  )
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE / 2)
    return () => clearInterval(timer)
  }, [])

  if (savedAt === null) return null
  return (
    <span role="status" className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted">
      <CheckIcon aria-hidden="true" className="size-4 text-green-600" />
      Saved · {timeAgo(savedAt, now)}
    </span>
  )
}
