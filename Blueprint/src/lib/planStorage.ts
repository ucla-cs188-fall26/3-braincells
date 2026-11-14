import type { Viewport } from '@xyflow/react'
import type { BlockNodeType } from '../components/BlockNode'
import type { LabeledEdgeType } from '../components/LabeledEdge'
import { cleanRules, type Rule } from './rules'

export type PlanState = {
  nodes: BlockNodeType[]
  edges: LabeledEdgeType[]
  rules: Rule[]
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
      data: {
        title: node.data.title,
        description: node.data.description ?? '',
        editing: false,
        later: node.data.later === true,
        suggested: node.data.suggested === true,
        why: node.data.suggested === true ? (node.data.why ?? '') : '',
        kept: node.data.kept === true,
      },
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

const savedAtKey = (planId: string) => `blueprint:plan-saved-at:${planId}`
const saveListeners = new Set<(planId: string) => void>()

function markSaved(planId: string) {
  try {
    localStorage.setItem(savedAtKey(planId), String(Date.now()))
  } catch {
    // The timestamp is only for the "Saved" label; the plan itself is already written.
  }
  saveListeners.forEach((listener) => listener(planId))
}

// Calls the listener after each save that changed the plan or its name. Returns an unsubscribe.
export function subscribeToPlanSaves(listener: (planId: string) => void) {
  saveListeners.add(listener)
  return () => {
    saveListeners.delete(listener)
  }
}

// When the plan or its name last changed (ms since epoch), or null if it never was saved.
export function loadPlanSavedAt(planId: string): number | null {
  try {
    const value = Number(localStorage.getItem(savedAtKey(planId)))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

const boxIds = (nodes: BlockNodeType[]) => new Set(nodes.map((node) => node.id))

export function savePlan(planId: string, { nodes, edges, rules, viewport }: PlanState) {
  try {
    const cleanedNodes = cleanNodes(nodes)
    const payload = {
      version: VERSION,
      nodes: cleanedNodes,
      edges: cleanEdges(edges, cleanedNodes),
      rules: cleanRules(rules, boxIds(cleanedNodes)),
      viewport,
    }
    const serialized = JSON.stringify(payload)
    // The canvas also saves when nothing changed (on load, after a pan); only real edits count.
    if (localStorage.getItem(storageKey(planId)) === serialized) return
    localStorage.setItem(storageKey(planId), serialized)
    markSaved(planId)
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
      // Plans saved before rules existed have no rules field; cleanRules turns that into [].
      rules: cleanRules(saved.rules, boxIds(nodes)),
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
    if (localStorage.getItem(nameKey(planId)) === name) return
    localStorage.setItem(nameKey(planId), name)
    markSaved(planId)
  } catch {
    // Same as savePlan: a failed write isn't worth breaking the page.
  }
}
