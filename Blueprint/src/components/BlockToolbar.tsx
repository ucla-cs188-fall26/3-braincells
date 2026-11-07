import { useState, type ComponentType, type SVGProps } from 'react'
import { NodeToolbar, Position } from '@xyflow/react'
import { ClockIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

type Action = {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  onClick?: () => void // "Add Rule" and "Mark for later" are placeholders for now
  danger?: boolean
}

type BlockToolbarProps = {
  isVisible: boolean
  onEdit: () => void
  onDelete: () => void
}

export default function BlockToolbar({ isVisible, onEdit, onDelete }: BlockToolbarProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null)

  const actions: Action[] = [
    { label: 'Edit', Icon: PencilIcon, onClick: onEdit },
    { label: 'Add Rule', Icon: DocumentTextIcon },
    { label: 'Mark for later', Icon: ClockIcon },
    { label: 'Delete', Icon: TrashIcon, onClick: onDelete, danger: true },
  ]

  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top} offset={12}>
      <div className="nodrag nopan relative" onMouseLeave={() => setActiveLabel(null)}>
        {activeLabel && (
          <p className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 text-sm whitespace-nowrap text-muted">
            {activeLabel}
          </p>
        )}

        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {actions.map(({ label, Icon, onClick, danger }) => (
            <div key={label} className="flex items-center gap-1">
              {danger && <div className="mr-1 h-6 w-px bg-gray-300" />}
              <button
                type="button"
                aria-label={label}
                onClick={onClick}
                onMouseEnter={() => setActiveLabel(label)}
                onFocus={() => setActiveLabel(label)}
                onBlur={() => setActiveLabel(null)}
                className={`flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 ${
                  danger ? 'text-red-700' : 'text-ink'
                }`}
              >
                <Icon className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </NodeToolbar>
  )
}
