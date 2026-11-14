import { useEffect, useMemo, useRef } from 'react'
import {
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CheckIcon } from '@heroicons/react/24/outline'
import type { PlanState } from '../lib/planStorage'
import { rulesForBox } from '../lib/rules'
import { BOX_STYLE, KEPT_BOX_STYLE, LATER_BOX_STYLE } from './boxStyles'

type DiagramNodeData = {
  title: string
  description: string
  later: boolean
  kept: boolean
  ruleCount: number
  selected: boolean
  onSelect: (boxId: string) => void
}
type DiagramNode = Node<DiagramNodeData, 'diagram'>
type DiagramEdge = Edge<{ label: string }, 'diagram'>

const EDGE_COLOR = 'var(--color-edge)'
const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const FIT_OPTIONS = { padding: 0.15 }

// A box as it looks on the Plan canvas, but the only thing it does is get clicked.
function DiagramBox({ id, data }: NodeProps<DiagramNode>) {
  const style = data.later ? LATER_BOX_STYLE : data.kept ? KEPT_BOX_STYLE : BOX_STYLE
  return (
    <div className="relative w-48">
      <button
        type="button"
        aria-pressed={data.selected}
        onClick={() => data.onSelect(id)}
        className={`${style} relative w-full cursor-pointer text-left transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          data.later ? 'opacity-60' : ''
        } ${data.selected ? 'ring-2 ring-brand ring-offset-1' : 'hover:ring-2 hover:ring-brand/25'}`}
      >
        {data.kept && !data.later && (
          <CheckIcon
            role="img"
            aria-label="Added by AI and kept"
            className="absolute top-2.5 right-2.5 size-4 text-green-700"
            strokeWidth={2.5}
          />
        )}
        <span className={`text-sm font-bold ${data.later ? 'text-gray-500' : ''}`}>{data.title}</span>
        {data.description && (
          <span className={`text-xs ${data.later ? 'text-gray-400' : 'text-gray-500'}`}>{data.description}</span>
        )}
        {data.ruleCount > 0 && (
          <span
            aria-label={`${data.ruleCount} ${data.ruleCount === 1 ? 'rule' : 'rules'}`}
            className="absolute right-1.5 bottom-1.5 rounded bg-trace-rule px-1 text-[10px] font-semibold text-ink"
          >
            {data.ruleCount}
          </span>
        )}
      </button>
      {/* Invisible handles, so saved arrows attach to the same sides as on the Plan canvas. */}
      {HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          isConnectable={false}
          className="pointer-events-none! opacity-0!"
        />
      ))}
    </div>
  )
}

function DiagramArrow({ data, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style }: EdgeProps<DiagramEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const isHorizontal = Math.abs(targetX - sourceX) >= Math.abs(targetY - sourceY)
  const placement = isHorizontal ? '-translate-x-1/2 -translate-y-full -mt-3' : '-translate-y-1/2 ml-3'
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <span
            className={`absolute rounded-md bg-white px-2 py-0.5 text-sm text-ink ${placement}`}
            style={{ transform: `translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const nodeTypes = { diagram: DiagramBox }
const edgeTypes = { diagram: DiagramArrow }

type PlanDiagramProps = {
  plan: PlanState | null
  selectedBoxIds: Set<string>
  onSelectBox: (boxId: string) => void
  onClear: () => void
}

function Diagram({ plan, selectedBoxIds, onSelectBox, onClear }: PlanDiagramProps) {
  const { fitView } = useReactFlow()
  const frameRef = useRef<HTMLDivElement>(null)

  // Suggested boxes the user never kept aren't part of the plan, so they aren't drawn.
  const nodes = useMemo<DiagramNode[]>(
    () =>
      (plan?.nodes ?? [])
        .filter((node) => !node.data.suggested)
        .map((node) => ({
          id: node.id,
          type: 'diagram',
          position: node.position,
          origin: node.origin,
          data: {
            title: node.data.title,
            description: node.data.description,
            later: !!node.data.later,
            kept: !!node.data.kept,
            ruleCount: rulesForBox(plan?.rules ?? [], node.id).length,
            selected: selectedBoxIds.has(node.id),
            onSelect: onSelectBox,
          },
        })),
    [plan, selectedBoxIds, onSelectBox],
  )
  const edges = useMemo<DiagramEdge[]>(() => {
    const ids = new Set(nodes.map((node) => node.id))
    return (plan?.edges ?? [])
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'diagram',
        data: { label: edge.data?.label ?? '' },
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR },
        style: { strokeWidth: 2, stroke: EDGE_COLOR },
      }))
  }, [plan, nodes])

  // Keep the whole plan in view when the card changes size.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(() => fitView(FIT_OPTIONS))
    observer.observe(frame)
    return () => observer.disconnect()
  }, [fitView])

  return (
    <div ref={frameRef} className="bg-dot-grid size-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={FIT_OPTIONS}
        minZoom={0.2}
        // Read-only: nothing moves, connects, pans or zooms. Only clicks do anything.
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        onPaneClick={onClear}
      />
    </div>
  )
}

export default function PlanDiagram(props: PlanDiagramProps) {
  return (
    <ReactFlowProvider>
      <Diagram {...props} />
    </ReactFlowProvider>
  )
}
