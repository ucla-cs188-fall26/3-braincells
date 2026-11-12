import { DEFAULT_PLAN_ID, loadGeneratedCode } from '../lib/planStorage'

// Shows the code the AI generated from the plan, or a hint if nothing was generated yet.
export default function BuildPage() {
  const code = loadGeneratedCode(DEFAULT_PLAN_ID)

  if (!code) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted">Send your plan to AI to generate code.</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold">Generated code</h1>
      <pre className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm whitespace-pre-wrap">
        {code}
      </pre>
    </main>
  )
}
