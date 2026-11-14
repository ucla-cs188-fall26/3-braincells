import type { PlanState } from './planStorage'

export type PayloadBox = { id: string; name: string; description: string }
export type PayloadArrow = {
  id: string
  from: string // box id
  to: string // box id
  fromName: string
  toName: string
  label: string
}
export type PayloadRule = { id: string; boxId: string; boxName: string; text: string }

// What gets sent to the AI: the version-1 part of the plan, plus the boxes left out on purpose.
export type BuildPayload = {
  name: string
  boxes: PayloadBox[]
  arrows: PayloadArrow[]
  rules: PayloadRule[]
  later: PayloadBox[]
}

// Suggested boxes the user hasn't kept aren't part of the plan. Boxes marked "later" are listed
// separately, and arrows and rules touching them stay out of version 1.
export function buildPayload(plan: PlanState | null, name: string): BuildPayload {
  const nodes = (plan?.nodes ?? []).filter((node) => !node.data.suggested)
  const toBox = (node: (typeof nodes)[number]): PayloadBox => ({
    id: node.id,
    name: node.data.title,
    description: node.data.description,
  })
  const boxes = nodes.filter((node) => !node.data.later).map(toBox)
  const later = nodes.filter((node) => node.data.later).map(toBox)
  const names = new Map(boxes.map((box) => [box.id, box.name]))

  const arrows = (plan?.edges ?? [])
    .filter((edge) => names.has(edge.source) && names.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      fromName: names.get(edge.source)!,
      toName: names.get(edge.target)!,
      label: (edge.data?.label ?? '').trim(),
    }))

  const rules = (plan?.rules ?? [])
    .filter((rule) => names.has(rule.boxId))
    .map((rule) => ({
      id: rule.id,
      boxId: rule.boxId,
      boxName: names.get(rule.boxId)!,
      text: rule.text,
    }))

  return { name, boxes, arrows, rules, later }
}

// Identifies what the AI would build. The plan's name is left out so renaming doesn't undo a build.
export function payloadKey({ boxes, arrows, rules, later }: BuildPayload): string {
  return JSON.stringify({ boxes, arrows, rules, later })
}

export const isEmptyPayload = (payload: BuildPayload) => payload.boxes.length === 0

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// "A, B and C"
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

// e.g. "4 boxes, 3 arrows and 1 rule. Email reminders are marked later, so they stay out."
export function summarizePayload({ boxes, arrows, rules, later }: BuildPayload): string {
  const counts = `${plural(boxes.length, 'box', 'boxes')}, ${plural(arrows.length, 'arrow', 'arrows')} and ${plural(rules.length, 'rule', 'rules')}.`
  if (later.length === 0) return counts
  // One box named like a plural ("Email reminders") still reads as "are ... they".
  const singular = later.length === 1 && !/[^s]s$/i.test(later[0].name.trim())
  const verb = singular ? 'is' : 'are'
  const pronoun = singular ? 'it stays' : 'they stay'
  return `${counts} ${joinNames(later.map((box) => box.name))} ${verb} marked later, so ${pronoun} out.`
}

// "Login screen → Task list (logged in)"
export const describeArrow = (arrow: PayloadArrow) =>
  `${arrow.fromName} → ${arrow.toName}${arrow.label ? ` (${arrow.label})` : ''}`
