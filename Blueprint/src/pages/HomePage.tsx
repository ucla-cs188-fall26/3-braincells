import ButtonLink from '../components/ButtonLink'
import Logo from '../components/Logo'
import SketchBackground from '../components/SketchBackground'
import { ROUTES } from '../routes'

export default function HomePage() {
  return (
    <main className="bg-dot-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 text-center">
      <SketchBackground />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-140 w-225 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,var(--color-canvas)_55%,transparent)]"
      />

      <div className="relative flex w-full max-w-180 flex-col items-center gap-10">
        <Logo />
        <h1 className="text-[clamp(36px,5.5vw,56px)] leading-[1.08] font-bold tracking-[-0.025em]">
          Draw it before
          <br />
          you prompt it.
        </h1>
        <ButtonLink to={ROUTES.newPlan}>Start a blank plan</ButtonLink>
      </div>
    </main>
  )
}
