import { isRecord, parseReview, type PlanReview } from './planCheck'
import { DEFAULT_PLAN_ID, loadPlan, loadPlanName } from './planStorage'

const UNEXPECTED = 'The AI sent back something unexpected. Try again.'

// Builds what the backend needs from the autosaved plan. Suggested boxes the user hasn't kept yet
// aren't part of the plan, so they are left out together with their arrows and rules.
function planRequestBody(planId: string) {
  const plan = loadPlan(planId)
  const nodes = (plan?.nodes ?? []).filter((node) => !node.data.suggested)
  const ids = new Set(nodes.map((node) => node.id))
  return {
    name: loadPlanName(planId),
    nodes,
    edges: (plan?.edges ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    // The AI only needs which box a rule belongs to and what it says, not the rule's own id.
    rules: (plan?.rules ?? [])
      .filter((rule) => ids.has(rule.boxId))
      .map(({ boxId, text }) => ({ boxId, text })),
  }
}

// POSTs the plan to the backend and returns the JSON answer. Throws the backend's error message if it fails.
async function postPlan(path: string, planId: string): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planRequestBody(planId)),
  })

  const body: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string' ? body.error : null
    throw new Error(message ?? `Request failed (${response.status})`)
  }
  return body
}

// Sends the autosaved plan to the backend, which asks the AI model to generate code for it.
export async function sendPlanToAI(planId: string = DEFAULT_PLAN_ID): Promise<string> {
  const body = await postPlan('/api/generate', planId)
  if (!isRecord(body) || typeof body.result !== 'string') throw new Error(UNEXPECTED)
  return body.result
}

// Sends the autosaved plan to the backend, which asks the AI model to review it.
export async function checkPlan(planId: string = DEFAULT_PLAN_ID): Promise<PlanReview> {
  return parseReview(await postPlan('/api/check', planId))
}
