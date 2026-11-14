export type Explanation = {
  eyebrow: string
  heading: string
  body: string
  callouts?: string[] // bold lines, e.g. where a rule is enforced
}

// The card under the diagram that says, in plain words, what the current selection is.
export default function ExplanationCard({ eyebrow, heading, body, callouts = [] }: Explanation) {
  return (
    <section aria-live="polite" className="shrink-0 rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{heading}</h2>
      <p className="mt-1.5 text-muted">{body}</p>
      {callouts.map((callout) => (
        <p key={callout} className="mt-2 font-semibold text-ink">
          {callout}
        </p>
      ))}
    </section>
  )
}
