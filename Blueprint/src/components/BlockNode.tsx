import { useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import {
  Handle,
  NodeToolbar,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { issuesForBox, worstSeverity, type Severity } from '../lib/planCheck'
import { rulesForBox } from '../lib/rules'
import BlockToolbar from './BlockToolbar'
import { IssuesContext } from './IssuesContext'
import RuleCorner from './RuleCorner'
import { RulesContext } from './RulesContext'

export type BlockNodeData = {
  title: string
  description: string
  editing: boolean
  later?: boolean
  suggested?: boolean // added by the AI check and not kept yet
  why?: string // for a suggested box: why the AI added it
  kept?: boolean // the AI added it and the user kept it
}

export type BlockNodeType = Node<BlockNodeData, 'block'>

const BOX_STYLE = 'flex flex-col rounded-xl border border-brand bg-blue-50 px-3 py-2'
const LATER_BOX_STYLE = 'flex flex-col rounded-xl border-2 border-dotted border-gray-400 bg-white/40 px-3 py-2'
// A box the AI added that the user kept: green with a check, so it stays clear where it came from.
const KEPT_BOX_STYLE = 'flex flex-col rounded-xl border-2 border-green-700 bg-green-50 py-2 pr-8 pl-3'
const SUGGESTED_BOX_STYLE = 'flex flex-col rounded-xl border-2 border-dashed border-ai bg-ai-bg px-3 py-2'
const HALO_STYLE ='ring-4 ring-brand/20'
const SUGGESTED_HALO_STYLE = 'ring-2 ring-offset-2 ring-ink'

// The badge color for a box's most serious issue.
const BADGE_STYLE: Record<Severity, string> = {
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-400 text-ink',
  info: 'bg-gray-500 text-white',
}

const SUGGESTION_BUTTON_STYLE =
  'rounded-lg border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// Keeps a control's pointer events from reaching the box (select, drag, connect).
const keepToControl = (event: { stopPropagation: () => void }) => event.stopPropagation()

const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export default function BlockNode({ id, data, selected }: NodeProps<BlockNodeType>) {
  const { updateNodeData, deleteElements } = useReactFlow()

  // Keeping a suggested box also makes its arrows ordinary arrows, since they are only the AI's
  // while one end is still a dashed box.
  const keepSuggestion = () => updateNodeData(id, { suggested: false, kept: true })
  const [title, setTitle] = useState(data.title)
  const [description, setDescription] = useState(data.description)
  const updateNodeInternals = useUpdateNodeInternals()
  const { rules, openRuleCard, toggleRuleCard } = useContext(RulesContext)
  const boxRules = rulesForBox(rules, id)
  const { issues, openResults } = useContext(IssuesContext)
  const boxIssues = issuesForBox(issues, id)
  const worst = worstSeverity(boxIssues)
  const boxStyle = data.later
    ? LATER_BOX_STYLE
    : data.suggested
      ? SUGGESTED_BOX_STYLE
      : data.kept
        ? KEPT_BOX_STYLE
        : BOX_STYLE

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
        isVisible={selected && !data.editing && !data.suggested}
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
            className={`${boxStyle} relative ${selected ? (data.suggested ? SUGGESTED_HALO_STYLE : HALO_STYLE) : ''}`}
          >
            {worst && (
              <button
                type="button"
                aria-label={`${boxIssues.length} ${boxIssues.length === 1 ? 'issue' : 'issues'} on ${data.title}, worst: ${worst}. Open results.`}
                onClick={(event) => {
                  keepToControl(event)
                  openResults()
                }}
                onMouseDown={keepToControl}
                onPointerDown={keepToControl}
                className={`nodrag nopan absolute -top-2.5 -left-2.5 flex size-5 items-center justify-center rounded-full text-[11px] font-semibold shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${BADGE_STYLE[worst]}`}
              >
                {boxIssues.length}
              </button>
            )}
            {data.kept && !data.later && (
              <CheckIcon
                role="img"
                aria-label="Added by AI and kept"
                className="absolute top-2.5 right-2.5 size-4 text-green-700"
                strokeWidth={2.5}
              />
            )}
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

          {/* Click a dashed box to see why the AI added it, then keep or remove it. */}
          <NodeToolbar isVisible={!!data.suggested && selected} position={Position.Bottom} offset={10}>
            <div className="nodrag nopan w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
              <p className="text-[11px] font-semibold tracking-wider text-ai uppercase">Added by AI</p>
              <p className="mt-1 text-sm">{data.why || 'The AI suggested this box for your plan.'}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={keepSuggestion}
                  className={`${SUGGESTION_BUTTON_STYLE} border-ink bg-ink text-white hover:bg-black`}
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => deleteElements({ nodes: [{ id }] })}
                  className={`${SUGGESTION_BUTTON_STYLE} border-gray-300 bg-white text-ink hover:bg-gray-50`}
                >
                  Remove
                </button>
              </div>
            </div>
          </NodeToolbar>

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
