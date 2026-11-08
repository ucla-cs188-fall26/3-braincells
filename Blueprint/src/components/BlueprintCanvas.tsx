import { useMemo, type MouseEvent } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
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

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledEdgeType>([])
  const { screenToFlowPosition } = useReactFlow()

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
      />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <CanvasEmptyState />
        </div>
      )}
    </div>
  )
}

export default function BlueprintCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
