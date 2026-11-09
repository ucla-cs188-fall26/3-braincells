import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type RuleContextMenuProps = {
  x: number // screen position of the right-click
  y: number
  onAddRule: () => void
  onClose: () => void
}

// The small right-click menu on a box. It has a single item.
export default function RuleContextMenu({ x, y, onAddRule, onClose }: RuleContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 rounded-lg border border-[#C3CED6] bg-white p-1 shadow-lg"
    >
      <button
        autoFocus
        type="button"
        role="menuitem"
        onClick={onAddRule}
        className="block w-full rounded-md px-2.5 py-1 text-left text-xs whitespace-nowrap hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand"
      >
        Add rule
      </button>
    </div>,
    document.body,
  )
}
