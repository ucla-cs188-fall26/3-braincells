import ButtonLink from '../components/ButtonLink'
import { ROUTES } from '../routes'

export default function NewPlanPage() {
  return (
    <main className="bg-dot-grid flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">New plan</h1>
      <p className="text-muted">The plan editor is coming soon.</p>
      <ButtonLink to={ROUTES.home}>Back to home</ButtonLink>
    </main>
  )
}
