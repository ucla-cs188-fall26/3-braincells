import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import CodeViewer, { type LineHighlight } from '../components/CodeViewer'
import ExplanationCard, { type Explanation } from '../components/ExplanationCard'
import PlanDiagram from '../components/PlanDiagram'
import { currentPayload, useBuild } from '../lib/buildStore'
import type { GeneratedFile } from '../lib/generateCode'
import { DEFAULT_PLAN_ID, loadPlan, type PlanState } from '../lib/planStorage'
import { ROUTES } from '../routes'
import { describeLines, quoteRule, traceBox, type BoxTrace } from '../lib/trace'

type Selection = { kind: 'box'; boxId: string; trace: BoxTrace | null } | null

const DEFAULT_EXPLANATION: Explanation = {
  eyebrow: 'Understand',
  heading: 'Click a box to see its code',
  body: 'Each box on the left is linked to lines on the right.',
}

function explainBox(plan: PlanState | null, boxId: string, trace: BoxTrace | null): Explanation {
  const box = plan?.nodes.find((node) => node.id === boxId)
  const title = box?.data.title ?? 'This box'
  if (box?.data.later) {
    return {
      eyebrow: 'Later · not built',
      heading: title,
      body: 'You marked this box for later, so the AI left it out of version 1.',
    }
  }
  if (!trace) {
    return {
      eyebrow: 'Box → code',
      heading: title,
      body: "The AI didn't write separate code for this box.",
    }
  }
  return {
    eyebrow: `Box → code · ${trace.file}, ${describeLines(trace.lines)}`,
    heading: title,
    body: box?.data.description || trace.source.summary || 'The highlighted lines on the right are the code for this box.',
    callouts: trace.rules.map(
      ({ rule, file, line }) =>
        `Your rule ${quoteRule(rule.text)} is enforced on line ${line}${file === trace.file ? '' : ` of ${file}`}.`,
    ),
  }
}

// Which lines of the open file to tint for a box: its whole block in blue, rule lines in yellow.
function boxHighlights(trace: BoxTrace | null, activeFile: string): Map<number, LineHighlight> {
  const highlights = new Map<number, LineHighlight>()
  if (!trace) return highlights
  if (trace.file === activeFile) {
    for (let line = trace.lines.start; line <= trace.lines.end; line++) highlights.set(line, 'box')
  }
  for (const rule of trace.rules) if (rule.file === activeFile) highlights.set(rule.line, 'rule')
  return highlights
}

function Understand({ files }: { files: GeneratedFile[] }) {
  // The build is only "done" while it matches the saved plan, so reading the plan once is safe.
  const [plan] = useState(() => loadPlan(DEFAULT_PLAN_ID))
  const [rules] = useState(() => currentPayload(DEFAULT_PLAN_ID).rules)
  const [selection, setSelection] = useState<Selection>(null)
  const [activeFile, setActiveFile] = useState(files[0].name)
  const [scrollTarget, setScrollTarget] = useState<{ line: number } | null>(null)

  const selectBox = useCallback(
    (boxId: string) => {
      const trace = traceBox(files, boxId, rules)
      setSelection({ kind: 'box', boxId, trace })
      if (trace) {
        setActiveFile(trace.file)
        setScrollTarget({ line: trace.lines.start })
      }
    },
    [files, rules],
  )
  const clear = useCallback(() => setSelection(null), [])

  // Esc goes back to "nothing selected", unless it's meant for a text field (like renaming).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, [role="menu"]')) return
      setSelection(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectedBoxIds = useMemo(() => new Set(selection ? [selection.boxId] : []), [selection])
  const explanation = selection ? explainBox(plan, selection.boxId, selection.trace) : DEFAULT_EXPLANATION
  const highlights = selection ? boxHighlights(selection.trace, activeFile) : new Map<number, LineHighlight>()

  return (
    <main className="grid min-h-0 flex-1 grid-cols-2 gap-6 bg-canvas p-6">
      <div className="flex min-h-0 flex-col gap-6">
        <section aria-label="Your plan" className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <PlanDiagram plan={plan} selectedBoxIds={selectedBoxIds} onSelectBox={selectBox} onClear={clear} />
        </section>
        <ExplanationCard {...explanation} />
      </div>
      <CodeViewer
        files={files}
        activeFile={activeFile}
        onSelectFile={setActiveFile}
        highlights={highlights}
        scrollTarget={scrollTarget}
      />
    </main>
  )
}

export default function UnderstandPage() {
  const { status, files } = useBuild(DEFAULT_PLAN_ID)
  // Nothing to understand until the AI has built the current plan.
  if (status !== 'done' || files.length === 0) return <Navigate to={ROUTES.build} replace />
  return <Understand files={files} />
}
