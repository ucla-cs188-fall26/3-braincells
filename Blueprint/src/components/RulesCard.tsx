import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { isBlankRuleText, MAX_RULE_LENGTH, type Rule } from '../lib/rules'

export const RULES_CARD_WIDTH = 256

type RulesCardProps = {
  boxName: string
  rules: Rule[]
  centerX: number // screen position of the box's horizontal center, from its on-screen rect
  top: number
  onAdd: (text: string) => void
  onUpdate: (ruleId: string, text: string) => void
  onDelete: (ruleId: string) => void
  onClose: (options: { restoreFocus: boolean }) => void
}

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand'

// The rules list for one box. It lives in screen space (a portal), not on the canvas, so zoom
// and pan never distort it. It keeps only draft text; the rules themselves belong to the plan.
export default function RulesCard({
  boxName,
  rules,
  centerX,
  top,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: RulesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Escape cancels an inline edit first, and only then closes the card.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (editingId) setEditingId(null)
      else onClose({ restoreFocus: true })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingId, onClose])

  // A click outside closes it (the rule triggers handle their own clicks), and so does a resize.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (cardRef.current?.contains(target) || target?.closest('[data-rules-trigger]')) return
      onClose({ restoreFocus: false })
    }
    const handleResize = () => onClose({ restoreFocus: false })
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [onClose])

  const add = () => {
    if (isBlankRuleText(draft)) return
    onAdd(draft)
    setDraft('')
  }

  const startEditing = (rule: Rule) => {
    setEditingId(rule.id)
    setEditText(rule.text)
  }

  const saveEdit = () => {
    if (!editingId || isBlankRuleText(editText)) return
    onUpdate(editingId, editText)
    setEditingId(null)
  }

  const handleDraftKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') add()
  }

  const handleEditKeyDown = (event: KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter') saveEdit()
  }

  // Centered under the box, but kept fully on screen.
  const maxLeft = Math.max(8, window.innerWidth - RULES_CARD_WIDTH - 8)
  const left = Math.min(Math.max(centerX - RULES_CARD_WIDTH / 2, 8), maxLeft)

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Rules for ${boxName}`}
      style={{ left, top, width: RULES_CARD_WIDTH }}
      className="fixed z-50 overflow-hidden rounded-xl border border-[#C3CED6] bg-white shadow-xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#C3CED6] px-3 py-2">
        <h2 className="min-w-0 text-sm font-semibold break-words text-[#14202B]">
          Rules for {boxName}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => onClose({ restoreFocus: true })}
          className={`rounded px-1 text-base leading-none text-muted hover:text-ink ${FOCUS_RING}`}
        >
          ×
        </button>
      </div>

      <ul className="max-h-[40vh] overflow-y-auto">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-center justify-between gap-2 border-b border-[#C3CED6] px-3 py-2"
          >
            {editingId === rule.id ? (
              <input
                autoFocus
                value={editText}
                maxLength={MAX_RULE_LENGTH}
                aria-label="Edit rule"
                onChange={(event) => setEditText(event.target.value)}
                onKeyDown={handleEditKeyDown}
                className={`min-w-0 flex-1 rounded border border-[#C3CED6] px-2 py-0.5 text-xs ${FOCUS_RING}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => startEditing(rule)}
                className={`min-w-0 flex-1 rounded text-left text-xs break-words text-[#14202B] ${FOCUS_RING}`}
              >
                {rule.text}
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete rule: ${rule.text}`}
              onClick={() => onDelete(rule.id)}
              className={`rounded px-1 text-base leading-none text-muted hover:text-ink ${FOCUS_RING}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 px-3 py-2">
        <input
          autoFocus
          value={draft}
          maxLength={MAX_RULE_LENGTH}
          placeholder="Add a rule…"
          aria-label="New rule"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          className={`min-w-0 flex-1 rounded-lg border border-[#C3CED6] px-2.5 py-1.5 text-xs placeholder:text-gray-400 ${FOCUS_RING}`}
        />
        <button
          type="button"
          disabled={isBlankRuleText(draft)}
          onClick={add}
          className={`rounded-lg bg-[#14202B] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          Add rule
        </button>
      </div>
    </div>,
    document.body,
  )
}
