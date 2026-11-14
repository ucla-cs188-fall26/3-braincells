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

// "A task needs a title." → "A task needs a title", for quoting inside a sentence.
export const quoteRule = (text: string) => `"${text.trim().replace(/[.!]+$/, '')}"`

export const describeLines = ({ start, end }: LineRange) =>
  start === end ? `line ${start}` : `lines ${start} to ${end}`
