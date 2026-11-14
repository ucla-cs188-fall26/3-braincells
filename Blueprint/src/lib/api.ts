import { isRecord, parseReview, type PlanReview } from './planCheck'
import { DEFAULT_PLAN_ID, loadPlan, loadPlanName } from './planStorage'

export const UNEXPECTED_ANSWER = 'The AI sent back something unexpected. Try again.'
const NO_SERVER = "Couldn't reach the server. Is the backend running?"

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

// POSTs JSON to the backend and returns the JSON answer. Throws the backend's error message if it fails.
export async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new Error(NO_SERVER, { cause: err })
  }

  const answer: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = isRecord(answer) && typeof answer.error === 'string' ? answer.error : null
    // The dev server answers for a backend that isn't running, with a bare 5xx and no message.
    throw new Error(message ?? (response.status >= 500 ? NO_SERVER : `Request failed (${response.status})`))
  }
  return answer
}

// Sends the autosaved plan to the backend, which asks the AI model to review it.
export async function checkPlan(planId: string = DEFAULT_PLAN_ID): Promise<PlanReview> {
  return parseReview(await postJson('/api/check', planRequestBody(planId)))
}
