import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import CodeViewer, { type LineHighlight, type LineLabel } from '../components/CodeViewer'
import ExplanationCard, { type Explanation } from '../components/ExplanationCard'
import PlanDiagram from '../components/PlanDiagram'
import type { BuildPayload } from '../lib/buildPayload'
import { currentPayload, useBuild } from '../lib/buildStore'
import type { CodeSource, GeneratedFile } from '../lib/generateCode'
import { DEFAULT_PLAN_ID, loadPlan, type PlanState } from '../lib/planStorage'
import {
  boxAtLine,
  describeLines,
  functionAtLine,
  quoteRule,
  traceBox,
  traceLine,
  type BoxTrace,
} from '../lib/trace'
import { ROUTES } from '../routes'

type LineSelection = {
  kind: 'line'
  file: string
  line: number
  source: CodeSource | null // the most specific box, arrow or rule it belongs to; null for setup code
  functionName: string | null
  ownerBoxId: string | null // the box whose code the line sits in
}
type Selection = { kind: 'box'; boxId: string; trace: BoxTrace | null } | LineSelection | null

// What the diagram lights up: boxes get the selected border, one arrow gets darker and thicker.
type DiagramFocus = { boxIds: Set<string>; arrowId: string | null }

const DEFAULT_EXPLANATION: Explanation = {
  eyebrow: 'Understand',
  heading: 'Click a box to see its code',
  body: 'Each box on the left is linked to lines on the right.',
}

// What a file is for, in plan words: "the task list", or the whole app for App.jsx.
function filePurpose(payload: BuildPayload, file: GeneratedFile): string {
  if (file.name === 'App.jsx') return 'the whole app, so your screens work together'
  const main = file.sources
    .filter((source) => source.kind === 'box')
    .reduce<CodeSource | null>(
      (best, source) =>
        !best || source.lines.end - source.lines.start > best.lines.end - best.lines.start ? source : best,
      null,
    )
  const name = payload.boxes.find((box) => box.id === main?.id)?.name
  return name ? `the ${name.toLowerCase()}` : 'this file'
}

const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`)
const joinSentences = (...parts: (string | undefined)[]) =>
  parts
    .filter((part): part is string => !!part?.trim())
    .map(sentence)
    .join(' ')

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

// Ties a clicked line back to the plan in the user's own words, plus where to look when it breaks.
function explainLine(payload: BuildPayload, file: GeneratedFile, selection: LineSelection): Explanation {
  const { source, line, functionName, ownerBoxId } = selection
  const eyebrow = `Line → box · line ${line}${functionName ? `, ${functionName}` : ''}`

  if (!source) {
    return {
      eyebrow,
      heading: 'Setup code',
      body: `This line is setup code that supports ${filePurpose(payload, file)}. It isn't tied to one box, arrow or rule in your plan.`,
    }
  }

  if (source.kind === 'arrow') {
    const arrow = payload.arrows.find((a) => a.id === source.id)
    if (arrow) {
      const heading =
        ownerBoxId === arrow.to
          ? `Belongs to ${arrow.toName}, used by ${arrow.fromName}`
          : ownerBoxId === arrow.from
            ? `Belongs to ${arrow.fromName}, connects to ${arrow.toName}`
            : `Connects ${arrow.fromName} and ${arrow.toName}`
      const which = arrow.label
        ? `This is the "${arrow.label}" arrow in your plan`
        : `This is the arrow from ${arrow.fromName} to ${arrow.toName} in your plan`
      return { eyebrow, heading, body: joinSentences(which, source.debugHint) }
    }
  }

  if (source.kind === 'rule') {
    const rule = payload.rules.find((r) => r.id === source.id)
    if (rule) {
      return {
        eyebrow,
        heading: `Belongs to ${rule.boxName}`,
        body: joinSentences(`This line checks a rule you wrote for ${rule.boxName}`, source.debugHint),
        callouts: [`Your rule ${quoteRule(rule.text)} is enforced on line ${line}.`],
      }
    }
  }

  const boxId = source.kind === 'box' ? source.id : ownerBoxId
  const name = payload.boxes.find((box) => box.id === boxId)?.name ?? 'your plan'
  return {
    eyebrow,
    heading: `Belongs to ${name}`,
    body: joinSentences(source.summary, source.debugHint) || `This line is part of ${name}.`,
  }
}

function lineFocus(payload: BuildPayload, { source, ownerBoxId }: LineSelection): DiagramFocus {
  // Setup code isn't part of any one box, so nothing in the diagram lights up.
  if (!source) return { boxIds: new Set(), arrowId: null }
  if (source.kind === 'arrow') {
    const arrow = payload.arrows.find((a) => a.id === source.id)
    if (arrow) return { boxIds: new Set([arrow.from, arrow.to]), arrowId: arrow.id }
  }
  if (source.kind === 'rule') {
    const rule = payload.rules.find((r) => r.id === source.id)
    if (rule) return { boxIds: new Set([rule.boxId]), arrowId: null }
  }
  const boxId = source.kind === 'box' ? source.id : ownerBoxId
  return { boxIds: new Set(boxId ? [boxId] : []), arrowId: null }
}

type CodeMarks = { highlights: Map<number, LineHighlight>; labels: Map<number, LineLabel> }
const noMarks = (): CodeMarks => ({ highlights: new Map(), labels: new Map() })

// For a box: every block of its code in the open file is tinted light blue and labeled with the
// box's name (a box can have several, e.g. its screen and the place App.jsx shows it). Its rule
// lines are yellow, labeled with the rule.
function boxMarks(file: GeneratedFile, boxId: string, boxName: string, trace: BoxTrace | null): CodeMarks {
  const marks = noMarks()
  const blocks = file.sources.filter((source) => source.kind === 'box' && source.id === boxId)
  for (const block of blocks) {
    for (let line = block.lines.start; line <= block.lines.end; line++) marks.highlights.set(line, 'box')
    // A block inside a bigger block of the same box is already covered by that block's label.
    const nested = blocks.some(
      (other) =>
        other !== block &&
        other.lines.start <= block.lines.start &&
        other.lines.end >= block.lines.end &&
        other.lines.end - other.lines.start > block.lines.end - block.lines.start,
    )
    if (!nested) marks.labels.set(block.lines.start, { text: boxName, tone: 'box' })
  }
  for (const rule of trace?.rules ?? []) {
    if (rule.file !== file.name) continue
    marks.highlights.set(rule.line, 'rule')
    marks.labels.set(rule.line, { text: `Rule: ${rule.rule.text}`, tone: 'rule' })
  }
  return marks
}

// The files that hold any code for a box, so their tabs can point the way.
const filesForBox = (files: GeneratedFile[], boxId: string) =>
  new Set(files.filter((file) => file.boxIds.includes(boxId)).map((file) => file.name))

// For a clicked line: only its own block, in the stronger blue. The file's rule lines stay yellow.
function lineHighlights(file: GeneratedFile, { source }: LineSelection): Map<number, LineHighlight> {
  const highlights = new Map<number, LineHighlight>()
  if (source) for (let line = source.lines.start; line <= source.lines.end; line++) highlights.set(line, 'block')
  for (const rule of file.sources.filter((s) => s.kind === 'rule')) {
    for (let line = rule.lines.start; line <= rule.lines.end; line++) highlights.set(line, 'rule')
  }
  return highlights
}

function Understand({ files }: { files: GeneratedFile[] }) {
  // The build is only "done" while it matches the saved plan, so reading the plan once is safe.
  const [plan] = useState(() => loadPlan(DEFAULT_PLAN_ID))
  const [payload] = useState(() => currentPayload(DEFAULT_PLAN_ID))
  const [selection, setSelection] = useState<Selection>(null)
  const [activeFile, setActiveFile] = useState(files[0].name)
  const [scrollTarget, setScrollTarget] = useState<{ line: number } | null>(null)
  const openFile = files.find((f) => f.name === activeFile) ?? files[0]

  const selectBox = useCallback(
    (boxId: string) => {
      const trace = traceBox(files, boxId, payload.rules)
      setSelection({ kind: 'box', boxId, trace })
      if (trace) {
        setActiveFile(trace.file)
        setScrollTarget({ line: trace.lines.start })
      }
    },
    [files, payload],
  )
  const clear = useCallback(() => setSelection(null), [])

  const selectLine = (line: number) => {
    const source = traceLine(openFile, line)
    setSelection({
      kind: 'line',
      file: openFile.name,
      line,
      source,
      functionName: functionAtLine(openFile.code, line),
      ownerBoxId: boxAtLine(openFile, line),
    })
  }

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

  const focus = useMemo<DiagramFocus>(() => {
    if (selection?.kind === 'box') return { boxIds: new Set([selection.boxId]), arrowId: null }
    if (selection?.kind === 'line') return lineFocus(payload, selection)
    return { boxIds: new Set(), arrowId: null }
  }, [selection, payload])

  const lineInView = selection?.kind === 'line' && selection.file === openFile.name ? selection : null
  const explanation =
    selection?.kind === 'box'
      ? explainBox(plan, selection.boxId, selection.trace)
      : selection?.kind === 'line'
        ? explainLine(payload, files.find((f) => f.name === selection.file) ?? openFile, selection)
        : DEFAULT_EXPLANATION
  const markedFiles = useMemo(
    () => (selection?.kind === 'box' ? filesForBox(files, selection.boxId) : new Set<string>()),
    [selection, files],
  )
  const boxName =
    selection?.kind === 'box' ? (payload.boxes.find((box) => box.id === selection.boxId)?.name ?? '') : ''
  // A line selection only tints its own file; switching tabs shows the other files plain.
  const marks: CodeMarks =
    selection?.kind === 'box'
      ? boxMarks(openFile, selection.boxId, boxName, selection.trace)
      : lineInView
        ? { highlights: lineHighlights(openFile, lineInView), labels: new Map() }
        : noMarks()

  return (
    <main className="grid min-h-0 flex-1 grid-cols-2 gap-6 bg-canvas p-6">
      <div className="flex min-h-0 flex-col gap-6">
        <section aria-label="Your plan" className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <PlanDiagram
            plan={plan}
            selectedBoxIds={focus.boxIds}
            highlightedArrowId={focus.arrowId}
            onSelectBox={selectBox}
            onClear={clear}
          />
        </section>
        <ExplanationCard {...explanation} />
      </div>
      <CodeViewer
        files={files}
        activeFile={openFile.name}
        onSelectFile={setActiveFile}
        highlights={marks.highlights}
        labels={marks.labels}
        markedFiles={markedFiles}
        scrollTarget={scrollTarget}
        selectedLine={lineInView?.line ?? null}
        onLineClick={selectLine}
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
