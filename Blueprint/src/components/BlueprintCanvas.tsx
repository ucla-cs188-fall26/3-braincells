import type { MouseEvent } from 'react'
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
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import BlockNode, { type BlockNodeType } from './BlockNode'
import CanvasEmptyState from './CanvasEmptyState'
import LabeledEdge, { type LabeledEdgeType } from './LabeledEdge'

const nodeTypes = { block: BlockNode }
const edgeTypes = { labeled: LabeledEdge }

const EDGE_COLOR = '#6b7280'
const defaultEdgeOptions = {
  type: 'labeled',
  markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
  style: { strokeWidth: 2, stroke: EDGE_COLOR },
}

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledEdgeType>([])
  const { screenToFlowPosition, updateEdgeData } = useReactFlow()

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

  const editEdge = (_: MouseEvent, edge: Edge) => updateEdgeData(edge.id, { editing: true })

  return (
    <div className="relative size-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose} // every handle can start or end a connection
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connect}
        onEdgeClick={editEdge}
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
