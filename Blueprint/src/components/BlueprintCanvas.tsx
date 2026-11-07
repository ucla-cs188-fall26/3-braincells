import type { MouseEvent } from 'react'
import { ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CanvasEmptyState from './CanvasEmptyState'

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const { screenToFlowPosition } = useReactFlow()

  const addNodeAtCursor = (event: MouseEvent) => {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    setNodes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        position,
        origin: [0.5, 0.5], // position the node by its center
        data: { label: 'Block' },
      },
    ])
  }

  return (
    <div className="relative size-full">
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} onPaneClick={addNodeAtCursor} />

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
