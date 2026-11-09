import { DEFAULT_PLAN_ID, loadPlan, loadPlanName } from './planStorage'

// Sends the autosaved plan to the backend, which forwards it to the AI model.
export async function sendPlanToAI(planId: string = DEFAULT_PLAN_ID): Promise<string> {
  const plan = loadPlan(planId)
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: loadPlanName(planId),
      nodes: plan?.nodes ?? [],
      edges: plan?.edges ?? [],
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body.result
}
