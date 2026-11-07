import { useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'

export type BlockNodeData = {
  title: string
  description: string
  editing: boolean
}

export type BlockNodeType = Node<BlockNodeData, 'block'>

const BOX_STYLE = 'flex flex-col rounded-xl border border-brand bg-blue-50 px-3 py-2'
const HALO_STYLE = 'ring-4 ring-brand/20'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function BlockNode({ id, data, selected }: NodeProps<BlockNodeType>) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const [title, setTitle] = useState(data.title)
  const [description, setDescription] = useState(data.description)

  const pointerDown = useRef({ x: 0, y: 0 })

  const startEditing = () => {
    setTitle(data.title)
    setDescription(data.description)
    updateNodeData(id, { editing: true })
  }

  // Cancelling a block that was never saved removes it; otherwise it reverts to the saved text.
  const cancel = () => {
    if (!data.title) return deleteElements({ nodes: [{ id }] })
    updateNodeData(id, { editing: false })
  }

  const save = () => {
    if (!title.trim()) return cancel()
    updateNodeData(id, { title: title.trim(), description: description.trim(), editing: false })
  }

  const handlePointerDown = (event: PointerEvent) => {
    pointerDown.current = { x: event.clientX, y: event.clientY }
  }

  // Only a real click starts editing, not the end of a drag.
  const handleClick = (event: MouseEvent) => {
    const { x, y } = pointerDown.current
    if (Math.hypot(event.clientX - x, event.clientY - y) < 4) startEditing()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') save()
    if (event.key === 'Escape') cancel()
  }

  // Save when focus leaves the block, but not when it just moves between the two inputs.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // The editor can also blur because it was just removed; there is nothing to save then.
    if (!event.currentTarget.isConnected) return
    if (!event.currentTarget.contains(event.relatedTarget)) save()
  }

  return (
    <div className="group relative w-48">
      {data.editing ? (
        <>
          <div
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`${BOX_STYLE} ${HALO_STYLE}`}
          >
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name"
              className="nodrag bg-transparent text-sm font-bold outline-none placeholder:text-gray-400"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What it does (optional)"
              className="nodrag bg-transparent text-xs text-gray-500 outline-none placeholder:text-gray-400"
            />
          </div>
          <p className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-sm whitespace-nowrap text-muted">
            Enter to save · Esc to cancel
          </p>
        </>
      ) : (
        <>
          <div
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            className={`${BOX_STYLE} cursor-text ${selected ? HALO_STYLE : ''}`}
          >
            <p className="text-sm font-bold">{data.title}</p>
            {data.description && <p className="text-xs text-gray-500">{data.description}</p>}
          </div>

          {HANDLE_POSITIONS.map((position) => (
            <Handle
              key={position}
              id={position}
              type="source"
              position={position}
              className="size-3! border-2! border-brand! bg-white! opacity-0 transition group-hover:opacity-100 hover:bg-brand!"
            />
          ))}
        </>
      )}
    </div>
  )
}
