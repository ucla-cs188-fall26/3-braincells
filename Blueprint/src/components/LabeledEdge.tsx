import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import ToolbarPill from './ToolbarPill'

export type LabeledEdgeData = {
  label: string
  editing: boolean
}

export type LabeledEdgeType = Edge<LabeledEdgeData, 'labeled'>

const PLACEHOLDER = 'Add label'
const BOX_STYLE = 'min-w-16 rounded-md border bg-white px-2 py-0.5 text-sm text-ink'

// Mounted only while editing, so the draft always starts from the saved label.
function EdgeLabelInput({ edgeId, initialLabel }: { edgeId: string; initialLabel: string }) {
  const { updateEdgeData } = useReactFlow()
  const [draft, setDraft] = useState(initialLabel)

  const save = () => updateEdgeData(edgeId, { label: draft.trim(), editing: false })
  const cancel = () => updateEdgeData(edgeId, { editing: false })

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') save()
    if (event.key === 'Escape') cancel()
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    // The input can also blur because it was just removed; there is nothing to save then.
    if (event.currentTarget.isConnected) save()
  }

  return (
    // The hidden span holds the same text as the input, so the box grows as you type.
    <div className={`${BOX_STYLE} inline-grid border-brand`}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-pre">
        {draft || PLACEHOLDER}
      </span>
      <input
        autoFocus
        size={1} // keeps the input's built-in width from stretching the box
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={PLACEHOLDER}
        className="col-start-1 row-start-1 w-full min-w-0 bg-transparent outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

export default function LabeledEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps<LabeledEdgeType>) {
  const { updateEdgeData, deleteElements } = useReactFlow()
  const label = data?.label ?? ''
  const editing = data?.editing ?? false

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  // Above the line when it runs mostly sideways, beside it when it runs mostly up or down.
  const isHorizontal = Math.abs(targetX - sourceX) >= Math.abs(targetY - sourceY)
  const placement = isHorizontal ? '-translate-x-1/2 -translate-y-full -mt-3' : '-translate-y-1/2 ml-3'

  const showToolbar = selected && !editing
  const toolbar = (
    <ToolbarPill
      size="sm"
      actions={[
        { label: 'Edit', Icon: PencilIcon, onClick: () => updateEdgeData(id, { editing: true }) },
        {
          label: 'Delete',
          Icon: TrashIcon,
          onClick: () => deleteElements({ edges: [{ id }] }),
          danger: true,
        },
      ]}
    />
  )

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={20} />

      <EdgeLabelRenderer>
        {/* Without a label there is nothing to line up with, so the toolbar sits over the line. */}
        {showToolbar && !label && (
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{ transform: `translate(${labelX}px, ${labelY}px) translate(-50%, -100%)` }}
          >
            <div className="mb-3">{toolbar}</div>
          </div>
        )}
        <div
          className={`nodrag nopan pointer-events-auto absolute ${placement}`}
          style={{ transform: `translate(${labelX}px, ${labelY}px)` }}
        >
          {editing ? (
            <EdgeLabelInput edgeId={id} initialLabel={label} />
          ) : (
            label && (
              <>
                <button
                  type="button"
                  onClick={() => updateEdgeData(id, { editing: true })}
                  className={`${BOX_STYLE} cursor-text border-transparent`}
                >
                  {label}
                </button>
                {/* Centered on the label, just above it */}
                {showToolbar && (
                  <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2">
                    {toolbar}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
