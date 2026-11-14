import { Link, NavLink, useMatch } from 'react-router'
import { useBuild } from '../lib/buildStore'
import { DEFAULT_PLAN_ID } from '../lib/planStorage'
import { ROUTES } from '../routes'
import FileMenu from './FileMenu'
import PlanName from './PlanName'
import SavedStatus from './SavedStatus'

const PILL_STYLE =
  'rounded-full border px-4 py-1.5 text-sm no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const ACTIVE_PILL = 'border-ink bg-ink font-medium text-white'
const OPEN_PILL = 'border-gray-300 bg-white text-ink hover:bg-gray-50'
const LOCKED_PILL = 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'

// The top bar: name, the three steps, save status and the File menu. In the Plan step it also
// has the button that moves on to Build.
export default function PlanHeader() {
  const onPlanStep = useMatch(ROUTES.newPlan) !== null
  const build = useBuild(DEFAULT_PLAN_ID)

  // Understand opens once the AI has written the code for the current plan.
  const steps = [
    { label: '1 · Plan', to: ROUTES.newPlan, locked: false },
    { label: '2 · Build', to: ROUTES.build, locked: false },
    { label: '3 · Understand', to: ROUTES.understand, locked: build.status !== 'done' },
  ]

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link to={ROUTES.home} className="flex w-fit shrink-0 items-center gap-2.5 no-underline">
          <img src="/logo.svg" alt="" className="size-6" />
          <span className="text-base font-bold">Blueprint</span>
        </Link>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-gray-300" />
        <PlanName planId={DEFAULT_PLAN_ID} />
      </div>

      <nav aria-label="Steps" className="flex items-center gap-2">
        {steps.map(({ label, to, locked }) =>
          locked ? (
            <span
              key={to}
              role="link"
              aria-disabled="true"
              title="Build the plan first"
              className={`${PILL_STYLE} ${LOCKED_PILL}`}
            >
              {label}
            </span>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${PILL_STYLE} ${isActive ? ACTIVE_PILL : OPEN_PILL}`}
            >
              {label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="flex items-center gap-3 justify-self-end">
        <SavedStatus planId={DEFAULT_PLAN_ID} />
        <FileMenu planId={DEFAULT_PLAN_ID} />
        {onPlanStep && (
          <Link
            to={ROUTES.build}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold whitespace-nowrap text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Review and build →
          </Link>
        )}
      </div>
    </header>
  )
}
