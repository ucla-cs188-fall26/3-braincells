import { useEffect, useRef } from 'react'

type RuleBoxMenuProps = {
  boxes: { id: string; name: string }[]
  onPick: (boxId: string) => void
  onClose: (options: { restoreFocus: boolean }) => void
}

// The list under "+ Rule" for choosing which box a new rule is for.
export default function RuleBoxMenu({ boxes, onPick, onClose }: RuleBoxMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('button') ?? [])

  useEffect(() => {
    items()[0]?.focus()
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element
      // The "+ Rule" button toggles the menu itself.
      if (menuRef.current?.contains(target) || target.closest('[data-rules-trigger]')) return
      onClose({ restoreFocus: false })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose({ restoreFocus: true })
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const moveFocus = (event: React.KeyboardEvent, step: 1 | -1) => {
    event.preventDefault()
    const all = items()
    const index = all.indexOf(document.activeElement as HTMLElement)
    all[(index + step + all.length) % all.length]?.focus()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Which box is this rule for?"
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') moveFocus(event, 1)
        if (event.key === 'ArrowUp') moveFocus(event, -1)
      }}
      className="absolute top-full left-0 z-50 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <p className="px-3 py-1 text-xs text-gray-500">Which box is this rule for?</p>
      {boxes.map((box) => (
        <button
          key={box.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(box.id)}
          className="block w-full truncate px-3 py-1.5 text-left text-sm text-ink hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {box.name}
        </button>
      ))}
    </div>
  )
}
