import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  ConnectionMode,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Viewport,
  type XYPosition,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { sendPlanToAI } from '../lib/api'
import { DEFAULT_PLAN_ID, loadPlan, savePlan } from '../lib/planStorage'
import BlockNode, { type BlockNodeType } from './BlockNode'
import CanvasEmptyState from './CanvasEmptyState'
import CanvasToolbar from './CanvasToolbar'
import LabeledEdge, { type LabeledEdgeType } from './LabeledEdge'

const nodeTypes = { block: BlockNode }
const edgeTypes = { labeled: LabeledEdge }

const EDGE_COLOR = 'var(--color-edge)'
const SELECTED_EDGE_COLOR = 'var(--color-brand)'
const defaultEdgeOptions = {
  type: 'labeled',
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  style: { strokeWidth: 2, stroke: EDGE_COLOR },
}

const SAVE_DELAY_MS = 400

function Canvas({ planId }: { planId: string }) {
  // Read storage once, on first render.
  const [saved] = useState(() => loadPlan(planId))
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>(saved?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledEdgeType>(saved?.edges ?? [])
  const { screenToFlowPosition } = useReactFlow()
  const viewportRef = useRef<Viewport>(saved?.viewport ?? { x: 0, y: 0, zoom: 1 })

  // Autosave shortly after the last change, so a drag doesn't write on every pixel.
  const save = useCallback(
    () => savePlan(planId, { nodes, edges, viewport: viewportRef.current }),
    [planId, nodes, edges],
  )
  useEffect(() => {
    const timer = setTimeout(save, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [save])

  const handleMoveEnd = (_event: unknown, viewport: Viewport) => {
    viewportRef.current = viewport
    save()
  }

  // Selected edges turn blue; every other edge gets the grey look back explicitly.
  const displayedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const color = edge.selected ? SELECTED_EDGE_COLOR : EDGE_COLOR
        return {
          ...edge,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: { strokeWidth: 2, stroke: color },
        }
      }),
    [edges],
  )

  const addNodeAt = (position: XYPosition) => {
    setNodes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: 'block',
        position,
        origin: [0.5, 0.5], // position the node by its center
        // Approximate size so the node is visible (and can take focus) before React Flow measures it
        initialWidth: 128,
        initialHeight: 24,
        data: { title: '', description: '', editing: true },
      },
    ])
  }

  const addNodeAtCursor = (event: MouseEvent) => {
    addNodeAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  // "+ Box" drops a box in the middle of what is visible, nudged down past any box already there.
  const frameRef = useRef<HTMLDivElement>(null)
  const addNodeInView = () => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    const center = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    let y = center.y
    while (nodes.some((node) => node.position.x === center.x && node.position.y === y)) y += 48
    addNodeAt({ x: center.x, y })
  }

  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  // Saves right away first, so the AI sees the latest edits rather than the last autosave.
  const checkWithAI = async () => {
    save()
    setChecking(true)
    setCheckError(null)
    try {
      const result = await sendPlanToAI(planId)
      // TODO: show this in the UI (e.g. on the Build page).
      console.log('AI response:', result)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setChecking(false)
    }
  }

  // A new edge opens its description field right away, like a new block does.
  const connect = (connection: Connection) => {
    const edge: LabeledEdgeType = {
      ...connection,
      id: crypto.randomUUID(),
      data: { label: '', editing: true },
    }
    setEdges((current) => addEdge(edge, current))
  }

  // A box only counts once it has a name; a brand-new box still being typed does not.
  const hasBoxes = nodes.some((node) => node.data.title.trim() !== '')

  return (
    <div className="flex size-full flex-col gap-3">
      <CanvasToolbar
        hasBoxes={hasBoxes}
        onAddBox={addNodeInView}
        onCheck={checkWithAI}
        checking={checking}
        checkError={checkError}
      />

      <div
        ref={frameRef}
        className="bg-dot-grid relative min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200"
      >
        <ReactFlow
          nodes={nodes}
          edges={displayedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose} // every handle can start or end a connection
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          onPaneClick={addNodeAtCursor}
          defaultViewport={saved?.viewport}
          onMoveEnd={handleMoveEnd}
        />

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <CanvasEmptyState />
          </div>
        )}
      </div>
    </div>
  )
}

export default function BlueprintCanvas({ planId = DEFAULT_PLAN_ID }: { planId?: string }) {
  return (
    <ReactFlowProvider>
      <Canvas planId={planId} />
    </ReactFlowProvider>
  )
}
