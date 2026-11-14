import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import { describeArrow, isEmptyPayload, summarizePayload } from '../lib/buildPayload'
import { currentPayload, startBuild, useBuild } from '../lib/buildStore'
import { DEFAULT_PLAN_ID } from '../lib/planStorage'
import { ROUTES } from '../routes'

const CARD_STYLE = 'flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-8'
const EYEBROW_STYLE = 'text-xs font-semibold tracking-wider text-muted uppercase'
const PRIMARY_BUTTON_STYLE =
  'rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand'

function ReviewSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className={EYEBROW_STYLE}>{label}</h3>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </section>
  )
}

// Left card: exactly what will be sent to the AI.
function ReviewCard({ planId, sending }: { planId: string; sending: boolean }) {
  // The plan can't change while this page is open (it's edited in the Plan step), so read it once.
  const [payload] = useState(() => currentPayload(planId))
  const { boxes, arrows, rules, later } = payload
  const empty = isEmptyPayload(payload)

  return (
    <section aria-labelledby="review-heading" className={CARD_STYLE}>
      <p className={EYEBROW_STYLE}>Review</p>
      <h2 id="review-heading" className="mt-2 text-2xl font-semibold tracking-tight">
        This is what will be sent to the AI
      </h2>
      <p className="mt-2 text-muted">
        {empty ? 'There are no boxes for version 1 yet. Add some in the Plan step first.' : summarizePayload(payload)}
      </p>

      {!empty && (
        <div className="mt-6 flex min-h-0 flex-col gap-5 overflow-y-auto rounded-lg border border-gray-200 p-5">
          <ReviewSection label="Boxes">{boxes.map((box) => box.name).join(', ')}</ReviewSection>
          {arrows.length > 0 && (
            <ReviewSection label="Arrows">
              <ul>
                {arrows.map((arrow) => (
                  <li key={arrow.id}>{describeArrow(arrow)}</li>
                ))}
              </ul>
            </ReviewSection>
          )}
          {rules.length > 0 && (
            <ReviewSection label="Rules">
              <ul>
                {rules.map((rule) => (
                  <li key={rule.id}>
                    <strong className="font-semibold">{rule.boxName}.</strong> {rule.text}
                  </li>
                ))}
              </ul>
            </ReviewSection>
          )}
          {later.length > 0 && (
            <ReviewSection label="Later, left out">
              <span className="text-muted">{later.map((box) => box.name).join(', ')}</span>
            </ReviewSection>
          )}
        </div>
      )}

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => startBuild(planId)}
          disabled={empty || sending}
          className={PRIMARY_BUTTON_STYLE}
        >
          {sending ? 'Sending…' : 'Send plan to AI'}
        </button>
      </div>
    </section>
  )
}

// Right card: the AI's progress, file by file.
function ResultCard({ planId }: { planId: string }) {
  const navigate = useNavigate()
  const { status, files, total, error } = useBuild(planId)
  const progress = status === 'done' ? 1 : total ? files.length / total : 0
  const heading =
    status === 'done'
      ? `Done. ${files.length} ${files.length === 1 ? 'file' : 'files'} written.`
      : status === 'generating'
        ? 'Writing code...'
        : 'Waiting to send'

  return (
    <section aria-labelledby="result-heading" className={CARD_STYLE}>
      <p className={EYEBROW_STYLE}>From the AI</p>
      <h2 id="result-heading" aria-live="polite" className="mt-2 text-2xl font-semibold tracking-tight">
        {heading}
      </h2>
      <div
        role="progressbar"
        aria-label="Code written"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-6 flex min-h-0 flex-col gap-2 overflow-y-auto">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 motion-safe:animate-row-in"
            >
              <CheckCircleIcon aria-hidden="true" className="size-5 shrink-0 text-green-600" />
              <span className="font-mono text-sm">{file.name}</span>
            </li>
          ))}
        </ul>
      )}

      {status === 'done' && (
        <div className="mt-auto flex justify-center pt-6">
          <button type="button" onClick={() => navigate(ROUTES.understand)} className={PRIMARY_BUTTON_STYLE}>
            See what it built
          </button>
        </div>
      )}
    </section>
  )
}

export default function BuildPage() {
  const { status } = useBuild(DEFAULT_PLAN_ID)
  return (
    <main className="grid min-h-0 flex-1 grid-cols-2 gap-6 bg-canvas p-6">
      <ReviewCard planId={DEFAULT_PLAN_ID} sending={status === 'generating'} />
      <ResultCard planId={DEFAULT_PLAN_ID} />
    </main>
  )
}
