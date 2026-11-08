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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DEFAULT_PLAN_ID, loadPlan, savePlan } from '../lib/planStorage'
import BlockNode, { type BlockNodeType } from './BlockNode'
import CanvasEmptyState from './CanvasEmptyState'
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

  const addNodeAtCursor = (event: MouseEvent) => {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
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

  // A new edge opens its description field right away, like a new block does.
  const connect = (connection: Connection) => {
    const edge: LabeledEdgeType = {
      ...connection,
      id: crypto.randomUUID(),
      data: { label: '', editing: true },
    }
    setEdges((current) => addEdge(edge, current))
  }

  return (
    <div className="relative size-full">
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
  )
}

export default function BlueprintCanvas({ planId = DEFAULT_PLAN_ID }: { planId?: string }) {
  return (
    <ReactFlowProvider>
      <Canvas planId={planId} />
    </ReactFlowProvider>
  )
}
