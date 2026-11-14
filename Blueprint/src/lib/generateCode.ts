import type { BuildPayload, PayloadArrow, PayloadBox, PayloadRule } from './buildPayload'

// 1-based, inclusive line numbers.
export type LineRange = { start: number; end: number }

// "These lines came from this box / arrow / rule". The Understand step uses this to link
// the plan to the code both ways, e.g. Task storage → storage.js lines 1–12. A real AI response
// should fill the same shape: the plain-language summary and debugHint are optional.
export type CodeSource = {
  kind: 'box' | 'arrow' | 'rule'
  id: string // the box, arrow or rule id from the plan
  lines: LineRange
  summary?: string // what these lines do, in plain words
  debugHint?: string // "If X goes wrong, start here."
}
type SourceNotes = Pick<CodeSource, 'summary' | 'debugHint'>

export type GeneratedFile = {
  name: string
  language: 'jsx' | 'js'
  code: string
  boxIds: string[]
  arrowIds: string[]
  ruleIds: string[]
  sources: CodeSource[]
}

export type FileProgress = { done: number; total: number }

type GenerateOptions = { signal?: AbortSignal }

const FILE_DELAY_MS = { min: 700, max: 900 }

// Asks the AI to write code for the plan, calling onFileWritten as each file is finished.
// For now this is a mock: it writes the files locally and reveals them one at a time. To use a
// real model, replace the body and keep the signature (and the GeneratedFile metadata).
export async function generateCode(
  payload: BuildPayload,
  onFileWritten: (file: GeneratedFile, progress: FileProgress) => void,
  { signal }: GenerateOptions = {},
): Promise<GeneratedFile[]> {
  const files = writeFiles(payload)
  for (const [index, file] of files.entries()) {
    await wait(FILE_DELAY_MS.min + Math.random() * (FILE_DELAY_MS.max - FILE_DELAY_MS.min), signal)
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
// The mock "AI": turns the plan into a handful of small React files.

const STORAGE_WORDS = /\b(storage|store|database|db|data|cache|backend|api)\b/gi
const SCREEN_WORDS = /\b(screen|page|view|form|dialog|modal)\b/gi
const AUTH_WORDS = /\b(log ?in|sign ?(in|up)|auth\w*|account)\b/i

const words = (text: string) => text.match(/[A-Za-z0-9]+/g) ?? []
const pascal = (text: string) =>
  words(text)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('')
const camelFromWords = (prefix: string, text: string) => prefix + pascal(text)

const isStorageBox = (box: PayloadBox) => new RegExp(STORAGE_WORDS.source, 'i').test(box.name)
const isScreenBox = (box: PayloadBox) => new RegExp(SCREEN_WORDS.source, 'i').test(box.name)

type StorageModule = { box: PayloadBox; file: string; load: string; save: string; rules: PayloadRule[] }
type Component = {
  box: PayloadBox
  file: string
  ident: string
  folded: PayloadBox[]
  rules: PayloadRule[]
}

function writeFiles(payload: BuildPayload): GeneratedFile[] {
  const { boxes, arrows, rules } = payload
  const byId = new Map(boxes.map((box) => [box.id, box]))
  const rulesOf = (boxId: string) => rules.filter((rule) => rule.boxId === boxId)
  // File names are compared without case (and App is taken), since some file systems ignore case.
  const usedNames = new Set(['app'])
  const uniqueName = (base: string) => {
    let name = base
    for (let n = 2; usedNames.has(name.toLowerCase()); n++) name = `${base}${n}`
    usedNames.add(name.toLowerCase())
    return name
  }

  // A small box with no rules whose only arrow feeds another component becomes part of that
  // component's file (e.g. Categories → Task list (groups) is drawn inside TaskList.jsx).
  const foldTarget = new Map<string, string>()
  for (const box of boxes) {
    if (isStorageBox(box) || isScreenBox(box) || rulesOf(box.id).length > 0) continue
    const touching = arrows.filter((arrow) => arrow.from === box.id || arrow.to === box.id)
    const target = touching.length === 1 && touching[0].from === box.id ? byId.get(touching[0].to) : null
    if (target && !isStorageBox(target)) foldTarget.set(box.id, target.id)
  }
  // Don't fold into a box that is itself folded away.
  for (const [boxId, targetId] of foldTarget) if (foldTarget.has(targetId)) foldTarget.delete(boxId)

  const storage = new Map<string, StorageModule>()
  const components = new Map<string, Component>()
  const order: (StorageModule | Component)[] = []
  for (const box of boxes) {
    if (foldTarget.has(box.id)) continue
    if (isStorageBox(box)) {
      const base = words(box.name.replace(STORAGE_WORDS, '')).at(0) ?? 'item'
      const entity = pascal(base)
      const plural = entity.endsWith('s') ? entity : `${entity}s`
      const singular = entity.endsWith('s') ? entity.slice(0, -1) || entity : entity
      const storageWord = box.name.match(STORAGE_WORDS)?.[0]?.toLowerCase() ?? 'storage'
      const module: StorageModule = {
        box,
        file: `${uniqueName(storageWord)}.js`,
        load: `load${plural}`,
        save: `save${singular}`,
        rules: rulesOf(box.id),
      }
      storage.set(box.id, module)
      order.push(module)
    } else {
      let ident = pascal(box.name.replace(SCREEN_WORDS, '')) || pascal(box.name) || 'Box'
      if (/^\d/.test(ident)) ident = `Box${ident}`
      ident = uniqueName(ident)
      const component: Component = { box, file: `${ident}.jsx`, ident, folded: [], rules: rulesOf(box.id) }
      components.set(box.id, component)
      order.push(component)
    }
  }
  for (const [boxId, targetId] of foldTarget) components.get(targetId)?.folded.push(byId.get(boxId)!)

  // Arrows between two screens become a callback prop the screen calls; App switches screens.
  const linked = new Set<string>()
  const transitions = new Map<string, { arrow: PayloadArrow; prop: string }[]>()
  for (const arrow of arrows) {
    if (!components.has(arrow.from) || !components.has(arrow.to)) continue
    const list = transitions.get(arrow.from) ?? []
    let prop = camelFromWords('on', arrow.label || `go to ${arrow.toName}`)
    if (prop === 'on' || list.some((t) => t.prop === prop)) prop = `${prop}${list.length + 1}`
    list.push({ arrow, prop })
    transitions.set(arrow.from, list)
  }
  // Arrows between a component and a storage box (either direction) become an import.
  const storageLinks = (boxId: string) =>
    arrows.flatMap((arrow) => {
      const other = arrow.from === boxId ? arrow.to : arrow.to === boxId ? arrow.from : null
      const module = other ? storage.get(other) : undefined
      return module ? [{ arrow, module }] : []
    })

  const files: GeneratedFile[] = []
  for (const item of order) {
    if ('ident' in item) {
      files.push(writeComponent(item, storageLinks(item.box.id), transitions.get(item.box.id) ?? [], arrows, linked))
    } else {
      const id = item.box.id
      const users = arrows.filter(
        (a) => (a.from === id && components.has(a.to)) || (a.to === id && components.has(a.from)),
      )
      files.push(writeStorage(item, payload.name, users))
    }
  }
  files.push(writeApp([...components.values()], transitions, arrows, linked))
  return files
}

function createWriter() {
  const lines: string[] = []
  const sources: CodeSource[] = []
  return {
    line(text = '') {
      lines.push(text)
    },
    // Records every line written inside fn as coming from that box, arrow or rule.
    from(kind: CodeSource['kind'], id: string, fn: () => void, notes: SourceNotes = {}) {
      const start = lines.length + 1
      fn()
      if (lines.length >= start) sources.push({ kind, id, lines: { start, end: lines.length }, ...notes })
    },
    finish(name: string): GeneratedFile {
      const ids = (kind: CodeSource['kind']) => [
        ...new Set(sources.filter((source) => source.kind === kind).map((source) => source.id)),
      ]
      return {
        name,
        language: name.endsWith('.jsx') ? 'jsx' : 'js',
        code: lines.join('\n') + '\n',
        boxIds: ids('box'),
        arrowIds: ids('arrow'),
        ruleIds: ids('rule'),
        sources: [...sources].sort((a, b) => a.lines.start - b.lines.start || b.lines.end - a.lines.end),
      }
    },
  }
}

type Writer = ReturnType<typeof createWriter>

const heading = (box: PayloadBox) => `// ${box.name}${box.description ? `: ${box.description}` : ''}`

// "A task needs a title." → `title`, so the rule can become a real check.
const requiredField = (rule: PayloadRule) =>
  rule.text.match(/\bneeds?\s+(?:a|an|the)?\s*([A-Za-z]+)/i)?.[1]?.toLowerCase() ?? null

// The rule maps to the one line that enforces it (or to its comment when it can't be checked).
function writeRuleCheck(out: Writer, rule: PayloadRule, value: string, onFail: string, indent: string) {
  const field = requiredField(rule)
  const notes = {
    summary: `Checks your rule: ${rule.text}`,
    debugHint: field
      ? `If something without a ${field} gets through, start here.`
      : 'If this rule is not being followed, start here.',
  }
  if (!field) return out.from('rule', rule.id, () => out.line(`${indent}// Rule: ${rule.text}`), notes)
  out.line(`${indent}// Rule: ${rule.text}`)
  out.from('rule', rule.id, () => out.line(`${indent}if (!${value}.${field}?.toString().trim()) ${onFail}`), notes)
}

// Records fn's lines once for each arrow (the same code can serve several arrows).
function fromArrows(out: Writer, arrows: PayloadArrow[], fn: () => void, notes: (arrow: PayloadArrow) => SourceNotes) {
  if (arrows.length === 0) return fn()
  const [first, ...rest] = arrows
  out.from('arrow', first.id, () => fromArrows(out, rest, fn, notes), notes(first))
}

const arrowSummary = (arrow: PayloadArrow) =>
  `${arrow.label ? `The "${arrow.label}" arrow` : 'The arrow'} from ${arrow.fromName} to ${arrow.toName}`

const lower = (text: string) => text.toLowerCase()

const boxNotesFor = (box: PayloadBox): SourceNotes => ({
  summary: box.description || `Shows the ${lower(box.name)}.`,
  debugHint: `If something on the ${lower(box.name)} looks wrong, start here.`,
})
const storageUseNotes = (arrow: PayloadArrow, user: PayloadBox, module: StorageModule): SourceNotes => ({
  summary: arrowSummary(arrow),
  debugHint: `If the ${lower(user.name)} shows the wrong ${lower(module.load.slice(4))}, start here.`,
})
const transitionNotes = (arrow: PayloadArrow): SourceNotes => ({
  summary: arrowSummary(arrow),
  debugHint: `If you don't get to the ${lower(arrow.toName)} when you should, start here.`,
})

function writeStorage(module: StorageModule, planName: string, links: PayloadArrow[]): GeneratedFile {
  const out = createWriter()
  const things = module.load.slice(4).toLowerCase()
  // load/save are what the arrows to this box mean ("save, load"), so they map to those arrows too.
  const arrowNotes = (arrow: PayloadArrow) => ({
    summary: arrowSummary(arrow),
    debugHint: `If the ${things} shown or saved look wrong, start here.`,
  })
  const key = `${words(planName).join('-').toLowerCase() || 'app'}:${module.load.slice(4).toLowerCase()}`
  const boxNotes = {
    summary: module.box.description || `Keeps the ${things} saved in the browser.`,
    debugHint: `If saved ${things} go missing after a reload, start here.`,
  }
  out.from(
    'box',
    module.box.id,
    () => {
      out.line(heading(module.box))
      out.line(`const KEY = '${key}'`)
      out.line()
      fromArrows(
        out,
        links,
        () => {
          out.line(`export function ${module.load}() {`)
          out.line(`  return JSON.parse(localStorage.getItem(KEY) ?? '[]')`)
          out.line('}')
        },
        arrowNotes,
      )
      out.line()
      fromArrows(
        out,
        links,
        () => {
          out.line(`export function ${module.save}(item) {`)
          for (const rule of module.rules) {
            writeRuleCheck(out, rule, 'item', `throw new Error(${JSON.stringify(rule.text)})`, '  ')
          }
          out.line(`  localStorage.setItem(KEY, JSON.stringify([...${module.load}(), item]))`)
          out.line('}')
        },
        arrowNotes,
      )
    },
    boxNotes,
  )
  return out.finish(module.file)
}

function writeComponent(
  component: Component,
  links: { arrow: PayloadArrow; module: StorageModule }[],
  transitions: { arrow: PayloadArrow; prop: string }[],
  arrows: PayloadArrow[],
  linked: Set<string>,
): GeneratedFile {
  const out = createWriter()
  const { box } = component
  const store = links[0]?.module
  const isAuth = AUTH_WORDS.test(`${box.name} ${box.description}`)
  const field = component.rules.map(requiredField).find(Boolean) ?? (isAuth ? 'email' : 'title')
  const props = transitions.map((t) => t.prop)

  out.line(`import { useState } from 'react'`)
  for (const { arrow, module } of links) {
    linked.add(arrow.id)
    out.from(
      'arrow',
      arrow.id,
      () => out.line(`import { ${module.load}, ${module.save} } from './${module.file.replace(/\.js$/, '')}'`),
      storageUseNotes(arrow, box, module),
    )
  }
  out.line()

  out.from('box', box.id, () => {
    out.line(heading(box))
    out.line(`export default function ${component.ident}(${props.length ? `{ ${props.join(', ')} }` : ''}) {`)
    if (!isAuth) {
      const initial = store ? `() => ${store.load}()` : '[]'
      const line = `  const [items, setItems] = useState(${initial})`
      if (store) out.from('arrow', links[0].arrow.id, () => out.line(line), storageUseNotes(links[0].arrow, box, store))
      else out.line(line)
    }
    out.line(`  const [draft, setDraft] = useState('')`)
    out.line()
    out.line('  function handleSubmit(event) {')
    out.line('    event.preventDefault()')
    out.line(`    const item = { ${field}: draft.trim() }`)
    for (const rule of component.rules) writeRuleCheck(out, rule, 'item', 'return', '    ')
    for (const { arrow, module } of links) {
      out.from('arrow', arrow.id, () => out.line(`    ${module.save}(item)`), storageUseNotes(arrow, box, module))
    }
    if (!isAuth) out.line(store ? `    setItems(${store.load}())` : '    setItems([...items, item])')
    out.line(`    setDraft('')`)
    if (isAuth && transitions[0]) {
      const { arrow, prop } = transitions[0]
      out.from('arrow', arrow.id, () => out.line(`    ${prop}(item)`), transitionNotes(arrow))
    }
    out.line('  }')
    out.line()
    out.line('  return (')
    out.line('    <section>')
    out.line(`      <h2>${box.name}</h2>`)
    out.line('      <form onSubmit={handleSubmit}>')
    out.line(
      `        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="${isAuth ? 'Email' : `New ${field}`}" />`,
    )
    out.line(`        <button>${isAuth ? 'Continue' : 'Add'}</button>`)
    out.line('      </form>')
    if (!isAuth) {
      out.line('      <ul>')
      out.line(`        {items.map((item, index) => <li key={index}>{item.${field}}</li>)}`)
      out.line('      </ul>')
    }
    for (const folded of component.folded) {
      out.from('box', folded.id, () => {
        const arrow = arrows.find((a) => a.from === folded.id && a.to === box.id)
        if (arrow) {
          linked.add(arrow.id)
          out.from(
            'arrow',
            arrow.id,
            () => out.line(`      <${pascal(folded.name) || 'Part'} items={${isAuth ? '[]' : 'items'}} />`),
            { summary: arrowSummary(arrow), debugHint: `If ${folded.name} doesn't show up on the ${lower(box.name)}, start here.` },
          )
        }
      }, boxNotesFor(folded))
    }
    for (const [index, { arrow, prop }] of transitions.entries()) {
      if (isAuth && index === 0) continue
      out.from(
        'arrow',
        arrow.id,
        () => out.line(`      <button type="button" onClick={${prop}}>${arrow.label || arrow.toName}</button>`),
        transitionNotes(arrow),
      )
    }
    out.line('    </section>')
    out.line('  )')
    out.line('}')
  }, boxNotesFor(box))

  for (const folded of component.folded) {
    out.line()
    out.from('box', folded.id, () => {
      const name = pascal(folded.name) || 'Part'
      out.line(heading(folded))
      out.line(`function ${name}({ items }) {`)
      out.line(`  return <p>${folded.name}: {items.length}</p>`)
      out.line('}')
    }, boxNotesFor(folded))
  }
  return out.finish(component.file)
}

const screenNotes = ({ box }: Component): SourceNotes => ({
  summary: `Decides when the ${lower(box.name)} is on screen.`,
  debugHint: `If the ${lower(box.name)} shows up at the wrong time, start here.`,
})

function writeApp(
  components: Component[],
  transitions: Map<string, { arrow: PayloadArrow; prop: string }[]>,
  arrows: PayloadArrow[],
  linked: Set<string>,
): GeneratedFile {
  const out = createWriter()
  // Start on the first screen nothing leads to (usually the login screen).
  const reached = new Set([...transitions.values()].flat().map((t) => t.arrow.to))
  const first = components.find((c) => !reached.has(c.box.id)) ?? components[0]

  out.line(`import { useState } from 'react'`)
  for (const component of components) {
    out.from('box', component.box.id, () => out.line(`import ${component.ident} from './${component.ident}'`), screenNotes(component))
  }
  out.line()
  out.line('export default function App() {')
  if (!first) {
    out.line('  return <main />')
  } else {
    out.line(`  const [screen, setScreen] = useState('${first.ident}')`)
    out.line()
    for (const component of components) {
      const list = transitions.get(component.box.id) ?? []
      out.from('box', component.box.id, () => {
        out.line(`  if (screen === '${component.ident}') {`)
        if (list.length === 0) {
          out.line(`    return <${component.ident} />`)
        } else {
          out.line('    return (')
          out.line(`      <${component.ident}`)
          for (const { arrow, prop } of list) {
            linked.add(arrow.id)
            const target = components.find((c) => c.box.id === arrow.to)!
            out.from('arrow', arrow.id, () => out.line(`        ${prop}={() => setScreen('${target.ident}')}`), transitionNotes(arrow))
          }
          out.line('      />')
          out.line('    )')
        }
        out.line('  }')
      }, screenNotes(component))
    }
    out.line('  return null')
  }
  out.line('}')

  // Anything the files above don't cover is at least noted, so every arrow links somewhere.
  const leftover = arrows.filter((arrow) => !linked.has(arrow.id))
  if (leftover.length) out.line()
  for (const arrow of leftover) {
    out.from('arrow', arrow.id, () =>
      out.line(`// ${arrow.fromName} → ${arrow.toName}${arrow.label ? ` (${arrow.label})` : ''}`),
      { summary: `${arrowSummary(arrow)}. The AI only noted it here.` },
    )
  }
  return out.finish('App.jsx')
}
