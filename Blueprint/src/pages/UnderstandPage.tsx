import { Navigate } from 'react-router'
import { useBuild } from '../lib/buildStore'
import { DEFAULT_PLAN_ID } from '../lib/planStorage'
import { ROUTES } from '../routes'

export default function UnderstandPage() {
  const { status } = useBuild(DEFAULT_PLAN_ID)
  // Nothing to understand until the AI has built the current plan.
  if (status !== 'done') return <Navigate to={ROUTES.build} replace />

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Understand page</h1>
    </main>
  )
}
