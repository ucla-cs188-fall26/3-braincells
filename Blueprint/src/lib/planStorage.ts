import type { Viewport } from '@xyflow/react'
import type { BlockNodeType } from '../components/BlockNode'
import type { LabeledEdgeType } from '../components/LabeledEdge'

export type PlanState = {
  nodes: BlockNodeType[]
  edges: LabeledEdgeType[]
  viewport: Viewport
}

const VERSION = 1
// Only one plan exists so far, so everything is saved under this id.
export const DEFAULT_PLAN_ID = 'default'
export const DEFAULT_PLAN_NAME = 'Untitled plan'
const storageKey = (planId: string) => `blueprint:plan:${planId}`

// Keeps only what belongs in a saved plan. Selection, dragging, measured sizes and
// the derived edge colors are UI state, and "editing" always starts off after a load.
function cleanNodes(nodes: BlockNodeType[]): BlockNodeType[] {
  return nodes
    .filter((node) => typeof node.data?.title === 'string' && node.data.title.trim() !== '')
    .map((node) => ({
      id: node.id,
      type: 'block',
      position: node.position,
      origin: node.origin,
      data: { title: node.data.title, description: node.data.description ?? '', editing: false },
    }))
}

function cleanEdges(edges: LabeledEdgeType[], nodes: BlockNodeType[]): LabeledEdgeType[] {
  const ids = new Set(nodes.map((node) => node.id))
  return edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'labeled',
      data: { label: edge.data?.label ?? '', editing: false },
    }))
}

export function savePlan(planId: string, { nodes, edges, viewport }: PlanState) {
  try {
    const cleanedNodes = cleanNodes(nodes)
    const payload = {
      version: VERSION,
      nodes: cleanedNodes,
      edges: cleanEdges(edges, cleanedNodes),
      viewport,
    }
    localStorage.setItem(storageKey(planId), JSON.stringify(payload))
  } catch {
    // Storage can be full or blocked; losing one autosave is not worth crashing the canvas.
  }
}

export function loadPlan(planId: string): PlanState | null {
  try {
    const raw = localStorage.getItem(storageKey(planId))
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (saved?.version !== VERSION || !Array.isArray(saved.nodes) || !Array.isArray(saved.edges)) {
      return null
    }
    const nodes = cleanNodes(saved.nodes)
    const { x, y, zoom } = saved.viewport ?? {}
    const validViewport = [x, y, zoom].every((n) => typeof n === 'number' && Number.isFinite(n))
    return {
      nodes,
      edges: cleanEdges(saved.edges, nodes),
      viewport: validViewport ? { x, y, zoom } : { x: 0, y: 0, zoom: 1 },
    }
  } catch {
    return null
  }
}

const nameKey = (planId: string) => `blueprint:plan-name:${planId}`

export function loadPlanName(planId: string): string {
  try {
    return localStorage.getItem(nameKey(planId))?.trim() || DEFAULT_PLAN_NAME
  } catch {
    return DEFAULT_PLAN_NAME
  }
}

export function savePlanName(planId: string, name: string) {
  try {
    localStorage.setItem(nameKey(planId), name)
  } catch {
    // Same as savePlan: a failed write isn't worth breaking the page.
  }
}
