import { NodeToolbar, Position } from '@xyflow/react'
import { ClockIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import ToolbarPill from './ToolbarPill'

type BlockToolbarProps = {
  isVisible: boolean
  onEdit: () => void
  onAddRule: () => void
  onMarkForLater: () => void
  isLater: boolean
  onDelete: () => void
}

export default function BlockToolbar({
  isVisible,
  onEdit,
  onAddRule,
  onMarkForLater,
  isLater,
  onDelete,
}: BlockToolbarProps) {
  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top} offset={12}>
      <ToolbarPill
        actions={[
          { label: 'Edit', Icon: PencilIcon, onClick: onEdit },
          { label: 'Add Rule', Icon: DocumentTextIcon, onClick: onAddRule },
          {
            label: isLater ? 'Mark for now' : 'Mark for later',
            Icon: ClockIcon,
            onClick: onMarkForLater,
            active: isLater,
          },
          { label: 'Delete', Icon: TrashIcon, onClick: onDelete, danger: true },
        ]}
      />
    </NodeToolbar>
  )
}
