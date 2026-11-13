import { XMarkIcon } from '@heroicons/react/24/outline'
import type { PlanCheck, Severity } from '../lib/planCheck'

type CheckResultsPanelProps = {
  check: PlanCheck
  boxNames: Map<string, string> // box id -> title, for naming the box an issue is about
  suggestedCount: number // suggested boxes currently on the canvas
  onSelectBox: (boxId: string) => void
  onClose: () => void
}

// The color and plain-words label for each severity, so color is never the only signal.
const SEVERITY_STYLE: Record<Severity, { dot: string; label: string }> = {
  error: { dot: 'bg-red-600', label: 'Needs fixing' },
  warning: { dot: 'bg-amber-400', label: 'Worth fixing' },
  info: { dot: 'bg-gray-500', label: 'Idea' },
}

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// The AI check's results: a short summary, the issues, and a note about the suggested boxes.
// Issues about the whole plan come first; clicking one about a box takes you to that box.
export default function CheckResultsPanel({
  check,
  boxNames,
  suggestedCount,
  onSelectBox,
  onClose,
}: CheckResultsPanelProps) {
  const issues = [
    ...check.issues.filter((issue) => issue.boxId === null),
    ...check.issues.filter((issue) => issue.boxId !== null),
  ]
  const checkedAt = new Date(check.checkedAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <section
      aria-label="AI check results"
      className="absolute top-3 right-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">AI check</h2>
          <p className="text-xs text-muted">Checked at {checkedAt}. May be out of date after edits.</p>
        </div>
        <button
          type="button"
          aria-label="Close results"
          onClick={onClose}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-gray-100 ${FOCUS_RING}`}
        >
          <XMarkIcon className="size-4" strokeWidth={2} />
        </button>
      </div>

      <p className="text-sm">{check.summary}</p>

      {issues.length === 0 ? (
        <p className="text-sm font-medium text-green-700">No issues found.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {issues.map((issue, index) => {
            const style = SEVERITY_STYLE[issue.severity]
            const boxName = issue.boxId ? boxNames.get(issue.boxId) : undefined
            const content = (
              <>
                <span className="flex items-center gap-2 text-xs font-medium text-muted">
                  <span aria-hidden="true" className={`size-2 rounded-full ${style.dot}`} />
                  {style.label}
                  {boxName && <span className="truncate text-ink">· {boxName}</span>}
                </span>
                <span className="text-sm">{issue.message}</span>
                {issue.fix && <span className="text-xs text-muted">Try: {issue.fix}</span>}
              </>
            )
            const boxId = issue.boxId
            return (
              <li key={index}>
                {boxId && boxName ? (
                  <button
                    type="button"
                    onClick={() => onSelectBox(boxId)}
                    className={`flex w-full flex-col gap-0.5 rounded-lg border border-gray-200 p-2.5 text-left hover:bg-gray-50 ${FOCUS_RING}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex flex-col gap-0.5 rounded-lg border border-gray-200 p-2.5">
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {suggestedCount > 0 && (
        <p className="rounded-lg bg-blue-50 p-2.5 text-xs text-ink">
          {suggestedCount === 1
            ? 'Added 1 suggested box to the canvas.'
            : `Added ${suggestedCount} suggested boxes to the canvas.`}{' '}
          Keep the ones you like and dismiss the rest.
        </p>
      )}
    </section>
  )
}
