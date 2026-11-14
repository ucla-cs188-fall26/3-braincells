import { useEffect, useRef, type ReactNode } from 'react'
import type { GeneratedFile } from '../lib/generateCode'

export type LineHighlight = 'box' | 'block' | 'rule'

const HIGHLIGHT_STYLE: Record<LineHighlight, string> = {
  box: 'bg-trace-box',
  block: 'bg-trace-block',
  rule: 'bg-trace-rule',
}

// Just enough coloring to tell comments, strings and keywords apart; everything else stays dark.
const TOKEN = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|default|function|const|let|return|if|else|throw|new)\b/g

function colorize(line: string): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of line.matchAll(TOKEN)) {
    if (match.index > last) parts.push(line.slice(last, match.index))
    const className = match[1] ? 'text-gray-400' : match[2] ? 'text-emerald-700' : 'text-violet-700'
    parts.push(
      <span key={match.index} className={className}>
        {match[0]}
      </span>,
    )
    last = match.index + match[0].length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts
}

type CodeViewerProps = {
  files: GeneratedFile[]
  activeFile: string
  onSelectFile: (name: string) => void
  highlights: Map<number, LineHighlight> // for the active file
  // Changing this scrolls that line into view (a new object each time, so the same line can repeat).
  scrollTarget: { line: number } | null
  onLineClick?: (line: number) => void
}

export default function CodeViewer({
  files,
  activeFile,
  onSelectFile,
  highlights,
  scrollTarget,
  onLineClick,
}: CodeViewerProps) {
  const file = files.find((f) => f.name === activeFile) ?? files[0]
  const lines = file ? file.code.replace(/\n$/, '').split('\n') : []
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!scrollTarget || !container) return
    const row = container.querySelector<HTMLElement>(`[data-line="${scrollTarget.line}"]`)
    if (!row) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    container.scrollTo({ top: Math.max(0, row.offsetTop - 48), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [scrollTarget, activeFile])

  return (
    <section aria-label="Generated code" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div role="tablist" aria-label="Files" className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-200 px-4">
        {files.map(({ name }) => {
          const active = name === file?.name
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectFile(name)}
              className={`-mb-px border-b-2 px-3 py-3 font-mono text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                active ? 'border-ink text-ink' : 'border-transparent text-gray-400 hover:text-muted'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      <div ref={scrollRef} role="tabpanel" className="relative min-h-0 flex-1 overflow-auto py-3 font-mono text-[13px] leading-6">
        {lines.map((text, index) => {
          const number = index + 1
          const highlight = highlights.get(number)
          return (
            <div
              key={`${file.name}:${number}`}
              data-line={number}
              onClick={onLineClick ? () => onLineClick(number) : undefined}
              className={`flex cursor-pointer transition-colors duration-150 ${
                highlight ? HIGHLIGHT_STYLE[highlight] : 'hover:bg-gray-50'
              }`}
            >
              <span aria-hidden="true" className="w-12 shrink-0 pr-4 text-right text-gray-300 select-none">
                {number}
              </span>
              <code className="pr-6 whitespace-pre text-ink">{text ? colorize(text) : ' '}</code>
            </div>
          )
        })}
      </div>
    </section>
  )
}
