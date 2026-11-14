import type { PayloadRule } from './buildPayload'
import type { CodeSource, GeneratedFile, LineRange } from './generateCode'

// Where one of the box's rules is enforced.
export type RuleTrace = { rule: PayloadRule; file: string; line: number }

// Where a box lives in the code: its main file and lines, plus where its rules are checked.
export type BoxTrace = { file: string; lines: LineRange; source: CodeSource; rules: RuleTrace[] }

const size = ({ lines }: CodeSource) => lines.end - lines.start

// A box can show up in several files (App.jsx imports every screen). Its "home" is the biggest
// block of code written for it, preferring its own file over App.jsx.
export function traceBox(files: GeneratedFile[], boxId: string, rules: PayloadRule[]): BoxTrace | null {
  const candidates = files.flatMap((file) =>
    file.sources
      .filter((source) => source.kind === 'box' && source.id === boxId)
      .map((source) => ({ file: file.name, source })),
  )
  if (candidates.length === 0) return null
  const own = candidates.filter((candidate) => candidate.file !== 'App.jsx')
  const best = (own.length ? own : candidates).reduce((a, b) => (size(b.source) > size(a.source) ? b : a))

  return {
    file: best.file,
    lines: best.source.lines,
    source: best.source,
    rules: rules
      .filter((rule) => rule.boxId === boxId)
      .flatMap((rule) => {
        for (const file of files) {
          const source = file.sources.find((s) => s.kind === 'rule' && s.id === rule.id)
          if (source) return [{ rule, file: file.name, line: source.lines.start }]
        }
        return []
      }),
  }
}

// Rules and arrows are more specific than the box they sit in, so they win; within a kind, the
// smallest block wins.
const SPECIFICITY: Record<CodeSource['kind'], number> = { rule: 0, arrow: 1, box: 2 }

// The most specific box, arrow or rule a line was written for, or null for setup code.
export function traceLine(file: GeneratedFile, line: number): CodeSource | null {
  const matches = file.sources.filter((source) => source.lines.start <= line && line <= source.lines.end)
  if (matches.length === 0) return null
  return matches.reduce((best, source) =>
    SPECIFICITY[source.kind] < SPECIFICITY[best.kind] ||
    (source.kind === best.kind && size(source) < size(best))
      ? source
      : best,
  )
}

// The box whose code a line sits inside in this file (the smallest box block around it). Lines
// outside every box, like imports at the top, belong to the file's main (biggest) box.
export function boxAtLine(file: GeneratedFile, line: number): string | null {
  const boxes = file.sources.filter((source) => source.kind === 'box')
  const around = boxes.filter((source) => source.lines.start <= line && line <= source.lines.end)
  if (around.length) return around.reduce((a, b) => (size(b) < size(a) ? b : a)).id
  return boxes.length ? boxes.reduce((a, b) => (size(b) > size(a) ? b : a)).id : null
}

const FUNCTION_START = /^\s*(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_$][\w$]*)/

// The name of the innermost function a line is in ("loadTasks"), or null outside any function.
// Counts braces line by line, which is enough for the plain code the generator writes.
export function functionAtLine(code: string, line: number): string | null {
  const open: { name: string; depth: number }[] = []
  let depth = 0
  const lines = code.split('\n')
  for (let index = 0; index < lines.length && index < line; index++) {
    const text = lines[index].replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\/.*$/, '')
    const name = text.match(FUNCTION_START)?.[1]
    if (name) open.push({ name, depth })
    for (const char of text) {
      if (char === '{') depth++
      if (char === '}') depth--
    }
    // A function that closed on an earlier line no longer contains anything after it.
    if (index < line - 1) while (open.length && depth <= open.at(-1)!.depth) open.pop()
  }
  return open.at(-1)?.name ?? null
}

// "A task needs a title." → "A task needs a title", for quoting inside a sentence.
export const quoteRule = (text: string) => `"${text.trim().replace(/[.!]+$/, '')}"`

export const describeLines = ({ start, end }: LineRange) =>
  start === end ? `line ${start}` : `lines ${start} to ${end}`
