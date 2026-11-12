import { useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import {
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { rulesForBox } from '../lib/rules'
import BlockToolbar from './BlockToolbar'
import RuleCorner from './RuleCorner'
import { RulesContext } from './RulesContext'

export type BlockNodeData = {
  title: string
  description: string
  editing: boolean
  later?: boolean
  suggested?: boolean // added by the AI check and not kept yet
}

export type BlockNodeType = Node<BlockNodeData, 'block'>

const BOX_STYLE = 'flex flex-col rounded-xl border border-brand bg-blue-50 px-3 py-2'
const LATER_BOX_STYLE = 'flex flex-col rounded-xl border-2 border-dotted border-gray-400 bg-white/40 px-3 py-2'
const HALO_STYLE ='ring-4 ring-brand/20'

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function BlockNode({ id, data, selected }: NodeProps<BlockNodeType>) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const [title, setTitle] = useState(data.title)
  const [description, setDescription] = useState(data.description)
  const updateNodeInternals = useUpdateNodeInternals()
  const { rules, openRuleCard, toggleRuleCard } = useContext(RulesContext)
  const boxRules = rulesForBox(rules, id)

  // The corner pops when a rule is added (not when the plan loads or a rule is deleted).
  const cornerRef = useRef<HTMLButtonElement>(null)
  const previousCount = useRef(boxRules.length)
  useEffect(() => {
    if (boxRules.length > previousCount.current) {
      cornerRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }],
        { duration: 300, easing: 'ease-out' },
      )
    }
    previousCount.current = boxRules.length
  }, [boxRules.length])

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, data.editing, updateNodeInternals])

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
      <BlockToolbar
        isVisible={selected && !data.editing}
        onEdit={startEditing}
        onAddRule={() => openRuleCard(id)}
        onMarkForLater={() => updateNodeData(id, { later: !data.later })}
        isLater={!!data.later}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
      />

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
            className={`${data.later ? LATER_BOX_STYLE : BOX_STYLE} relative ${selected ? HALO_STYLE : ''}`}
          >
            <p className={`text-sm font-bold ${data.later ? 'text-gray-500' : ''}`}>{data.title}</p>
            {data.description && (
              <p className={`text-xs ${data.later ? 'text-gray-400' : 'text-gray-500'}`}>
                {data.description}
              </p>
            )}
            {boxRules.length > 0 && (
              <RuleCorner
                ref={cornerRef}
                boxId={id}
                count={boxRules.length}
                boxName={data.title}
                firstRuleText={boxRules[0].text}
                onClick={() => toggleRuleCard(id)}
              />
            )}
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
