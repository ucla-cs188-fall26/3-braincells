export const SEVERITIES = ['error', 'warning', 'info'] as const
export type Severity = (typeof SEVERITIES)[number]

// A problem the AI found. boxId is null when it is about the whole plan.
export type PlanIssue = {
  boxId: string | null
  severity: Severity
  message: string
  fix: string
}

export type LinkDirection = 'arrow_into_new_box' | 'arrow_out_of_new_box'

// A new box the AI proposes. Each link joins it to an existing box:
// 'arrow_into_new_box' = the arrow points from that box to the new one,
// 'arrow_out_of_new_box' = it points from the new box to that one.
export type PlanSuggestion = {
  title: string
  description: string
  links: { boxId: string; direction: LinkDirection; label: string }[]
}

// What the backend sends back from a check.
export type PlanReview = {
  summary: string
  issues: PlanIssue[]
  suggestions: PlanSuggestion[]
}

// The part of a check that is saved with the plan. Suggestions become boxes on the canvas instead.
export type PlanCheck = {
  checkedAt: number
  summary: string
  issues: PlanIssue[]
}

const VERSION = 1
const storageKey = (planId: string) => `blueprint:plan-check:${planId}`

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSeverity = (value: unknown): value is Severity =>
  SEVERITIES.some((severity) => severity === value)

// Keeps only well-formed issues. With boxIds, also drops issues about boxes that no longer exist.
export function cleanIssues(raw: unknown, boxIds?: Set<string>): PlanIssue[] {
  if (!Array.isArray(raw)) return []
  const issues: PlanIssue[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const { boxId, severity, message, fix } = item
    if (!isSeverity(severity) || typeof message !== 'string' || message.trim() === '') continue
    if (boxId !== null && typeof boxId !== 'string') continue
    if (typeof boxId === 'string' && boxIds && !boxIds.has(boxId)) continue
    issues.push({ boxId, severity, message, fix: typeof fix === 'string' ? fix : '' })
  }
  return issues
}

function cleanSuggestions(raw: unknown): PlanSuggestion[] {
  if (!Array.isArray(raw)) return []
  const suggestions: PlanSuggestion[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.title !== 'string' || item.title.trim() === '') continue
    const links: PlanSuggestion['links'] = []
    for (const link of Array.isArray(item.links) ? item.links : []) {
      if (!isRecord(link) || typeof link.boxId !== 'string') continue
      if (link.direction !== 'arrow_into_new_box' && link.direction !== 'arrow_out_of_new_box') continue
      links.push({
        boxId: link.boxId,
        direction: link.direction,
        label: typeof link.label === 'string' ? link.label : '',
      })
    }
    if (links.length === 0) continue
    suggestions.push({
      title: item.title.trim(),
      description: typeof item.description === 'string' ? item.description : '',
      links,
    })
  }
  return suggestions
}

// Checks the backend's answer. Throws if it isn't shaped like a review at all.
export function parseReview(raw: unknown): PlanReview {
  if (!isRecord(raw) || typeof raw.summary !== 'string' || !Array.isArray(raw.issues)) {
    throw new Error('The AI sent back something unexpected. Try again.')
  }
  return {
    summary: raw.summary,
    issues: cleanIssues(raw.issues),
    suggestions: cleanSuggestions(raw.suggestions),
  }
}

// Drops the issues about the given boxes, for when those boxes are deleted.
export function removeIssuesForBoxes(check: PlanCheck, boxIds: string[]): PlanCheck {
  const removed = new Set(boxIds)
  if (!check.issues.some((issue) => issue.boxId !== null && removed.has(issue.boxId))) return check
  return {
    ...check,
    issues: check.issues.filter((issue) => issue.boxId === null || !removed.has(issue.boxId)),
  }
}

// Saves the latest check, or clears it when check is null.
export function savePlanCheck(planId: string, check: PlanCheck | null) {
  try {
    if (check === null) localStorage.removeItem(storageKey(planId))
    else localStorage.setItem(storageKey(planId), JSON.stringify({ version: VERSION, ...check }))
  } catch {
    // Same as savePlan: a failed write isn't worth breaking the page.
  }
}

// Loads the saved check, leaving out issues about boxes that are gone. Null if there is none.
export function loadPlanCheck(planId: string, boxIds: Set<string>): PlanCheck | null {
  try {
    const raw = localStorage.getItem(storageKey(planId))
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved) || saved.version !== VERSION) return null
    if (typeof saved.summary !== 'string' || typeof saved.checkedAt !== 'number') return null
    return {
      checkedAt: saved.checkedAt,
      summary: saved.summary,
      issues: cleanIssues(saved.issues, boxIds),
    }
  } catch {
    return null
  }
}
