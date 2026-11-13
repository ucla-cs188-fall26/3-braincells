import type { XYPosition } from '@xyflow/react'
import type { BlockNodeType } from '../components/BlockNode'
import type { LabeledEdgeType } from '../components/LabeledEdge'
import type { LinkDirection, PlanSuggestion } from './planCheck'

const COLUMN_GAP = 260 // how far beside its box a suggestion is placed
const ROW_GAP = 100 // how far down it moves to clear another box
const MIN_DX = 220 // closer than this sideways (and MIN_DY vertically) counts as overlapping
const MIN_DY = 90

type Side = 'top' | 'right' | 'bottom' | 'left'

// True when the arrow points from the existing box into the new one.
const intoNew = (direction: LinkDirection) => direction === 'arrow_into_new_box'

// Which sides of two boxes an arrow between them should leave from and arrive at.
function sidesBetween(from: XYPosition, to: XYPosition): [Side, Side] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['right', 'left'] : ['left', 'right']
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

// Turns the AI's suggestions into boxes and arrows. A new box goes beside the first box it links to
// (right of it when the arrow comes from that box, left of it when the arrow goes to it) and is
// nudged down until it doesn't overlap anything. Links to boxes that aren't there are skipped.
export function suggestionsToElements(
  suggestions: PlanSuggestion[],
  existing: BlockNodeType[],
): { nodes: BlockNodeType[]; edges: LabeledEdgeType[] } {
  const byId = new Map(existing.map((node) => [node.id, node]))
  const nodes: BlockNodeType[] = []
  const edges: LabeledEdgeType[] = []

  for (const suggestion of suggestions) {
    const links = suggestion.links.flatMap((link) => {
      const box = byId.get(link.boxId)
      return box ? [{ ...link, box }] : []
    })
    const first = links[0]
    if (!first) continue

    const x = first.box.position.x + (intoNew(first.direction) ? COLUMN_GAP : -COLUMN_GAP)
    let y = first.box.position.y
    const taken = [...existing, ...nodes]
    while (
      taken.some(
        (node) => Math.abs(node.position.x - x) < MIN_DX && Math.abs(node.position.y - y) < MIN_DY,
      )
    )
      y += ROW_GAP

    const node: BlockNodeType = {
      id: crypto.randomUUID(),
      type: 'block',
      position: { x, y },
      origin: [0.5, 0.5], // position the node by its center, like every other box
      data: {
        title: suggestion.title,
        description: suggestion.description,
        editing: false,
        suggested: true,
        why: suggestion.why,
      },
    }
    nodes.push(node)

    for (const link of links) {
      const [source, target] = intoNew(link.direction) ? [link.box, node] : [node, link.box]
      const [sourceHandle, targetHandle] = sidesBetween(source.position, target.position)
      edges.push({
        id: crypto.randomUUID(),
        source: source.id,
        target: target.id,
        sourceHandle,
        targetHandle,
        type: 'labeled',
        data: { label: link.label, editing: false },
      })
    }
  }

  return { nodes, edges }
}
