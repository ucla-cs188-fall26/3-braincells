import { postJson, UNEXPECTED_ANSWER } from './api'
import type { BuildPayload } from './buildPayload'
import { isRecord } from './planCheck'

// 1-based, inclusive line numbers.
export type LineRange = { start: number; end: number }

// "These lines came from this box / arrow / rule". The Understand step uses this to link
// the plan to the code both ways, e.g. Task storage → storage.js lines 1–12.
export type CodeSource = {
  kind: 'box' | 'arrow' | 'rule'
  id: string // the box, arrow or rule id from the plan
  lines: LineRange
  summary?: string // what these lines do, in plain words
  debugHint?: string // "If X goes wrong, start here."
}

export type GeneratedFile = {
  name: string
  language: 'jsx' | 'js'
  purpose?: string // what the file is for, in plain words ("the task list screen")
  code: string
  boxIds: string[]
  arrowIds: string[]
  ruleIds: string[]
  sources: CodeSource[]
}

export type FileProgress = { done: number; total: number }

type GenerateOptions = { signal?: AbortSignal }

// The whole answer arrives at once, so the files are revealed one after another from it.
const REVEAL_DELAY_MS = 350

// Sends the plan to the AI (POST /api/generate, which calls OpenAI with the server's API key)
// and calls onFileWritten for each file it wrote, in order.
export async function generateCode(
  payload: BuildPayload,
  onFileWritten: (file: GeneratedFile, progress: FileProgress) => void,
  { signal }: GenerateOptions = {},
): Promise<GeneratedFile[]> {
  const answer = await postJson('/api/generate', payload, signal)
  const files = parseFiles(answer)
  if (files.length === 0) throw new Error(UNEXPECTED_ANSWER)

  for (const [index, file] of files.entries()) {
    if (index > 0) await wait(REVEAL_DELAY_MS, signal)
    onFileWritten(file, { done: index + 1, total: files.length })
  }
  return files
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Generation was cancelled.', 'AbortError'))
    }
    if (signal?.aborted) return abort()
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

// ---------------------------------------------------------------------------------------------
// The server sends each file's code plus which lines each box, arrow and rule covers. (The AI marks
// those parts in its code and the server turns the marks into line numbers; the AI never counts.)
// Anything malformed is dropped rather than trusted.

const KINDS = new Set<CodeSource['kind']>(['box', 'arrow', 'rule'])
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function parseSource(value: unknown, lineCount: number): CodeSource | null {
  if (!isRecord(value) || !isRecord(value.lines)) return null
  const { kind, id } = value
  const { start, end } = value.lines
  if (typeof kind !== 'string' || !KINDS.has(kind as CodeSource['kind']) || typeof id !== 'string' || !id) return null
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null
  const range = { start: Math.max(1, start as number), end: Math.min(lineCount, end as number) }
  if (range.start > range.end) return null
  const source: CodeSource = { kind: kind as CodeSource['kind'], id, lines: range }
  const summary = text(value.summary)
  const debugHint = text(value.debugHint)
  if (summary) source.summary = summary
  if (debugHint) source.debugHint = debugHint
  return source
}

function parseFiles(answer: unknown): GeneratedFile[] {
  if (!isRecord(answer) || !Array.isArray(answer.files)) throw new Error(UNEXPECTED_ANSWER)
  return answer.files.flatMap((file: unknown): GeneratedFile[] => {
    if (!isRecord(file) || typeof file.name !== 'string' || typeof file.code !== 'string') return []
    if (!file.code.trim()) return []
    const code = file.code.endsWith('\n') ? file.code : `${file.code}\n`
    const lineCount = code.replace(/\n$/, '').split('\n').length
    const sources = (Array.isArray(file.sources) ? file.sources : [])
      .map((source) => parseSource(source, lineCount))
      .filter((source): source is CodeSource => source !== null)
      .sort((a, b) => a.lines.start - b.lines.start || b.lines.end - a.lines.end)
    const ids = (kind: CodeSource['kind']) => [
      ...new Set(sources.filter((source) => source.kind === kind).map((source) => source.id)),
    ]
    const purpose = text(file.purpose)
    return [
      {
        name: file.name,
        language: file.name.endsWith('.jsx') ? 'jsx' : 'js',
        ...(purpose ? { purpose } : {}),
        code,
        boxIds: ids('box'),
        arrowIds: ids('arrow'),
        ruleIds: ids('rule'),
        sources,
      },
    ]
  })
}
