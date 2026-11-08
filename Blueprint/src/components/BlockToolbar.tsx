import { NodeToolbar, Position } from '@xyflow/react'
import { ClockIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import ToolbarPill from './ToolbarPill'

type BlockToolbarProps = {
  isVisible: boolean
  onEdit: () => void
  onDelete: () => void
}

export default function BlockToolbar({ isVisible, onEdit, onDelete }: BlockToolbarProps) {
  return (
    <NodeToolbar isVisible={isVisible} position={Position.Top} offset={12}>
      <ToolbarPill
        actions={[
          { label: 'Edit', Icon: PencilIcon, onClick: onEdit },
          { label: 'Add Rule', Icon: DocumentTextIcon },
          { label: 'Mark for later', Icon: ClockIcon },
          { label: 'Delete', Icon: TrashIcon, onClick: onDelete, danger: true },
        ]}
      />
    </NodeToolbar>
  )
}
