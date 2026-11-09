type CanvasToolbarProps = {
  hasBoxes: boolean
  onAddBox: () => void
  onAddRule?: () => void // placeholder until the rule popover exists
  onCheck: () => void
  checking: boolean
  checkError: string | null
}

const BUTTON_STYLE =
  'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const PLAIN_BUTTON_STYLE = `${BUTTON_STYLE} border-gray-300 bg-white text-ink hover:bg-gray-50`

// The row of actions that sits above the canvas.
export default function CanvasToolbar({
  hasBoxes,
  onAddBox,
  onAddRule,
  onCheck,
  checking,
  checkError,
}: CanvasToolbarProps) {
  return (
    <div role="toolbar" aria-label="Plan actions" className="flex items-center gap-3">
      <button type="button" onClick={onAddBox} className={PLAIN_BUTTON_STYLE}>
        + Box
      </button>

      {/* aria-disabled instead of disabled, so the button stays focusable and its tooltip still shows. */}
      <button
        type="button"
        aria-disabled={!hasBoxes}
        title={hasBoxes ? undefined : 'Add a box first'}
        onClick={hasBoxes ? onAddRule : undefined}
        className={`${BUTTON_STYLE} border-[#C9A84C] bg-[#FFF3C9] text-[#6B4A00] ${
          hasBoxes ? 'hover:bg-[#FBE9A8]' : 'cursor-not-allowed opacity-50'
        }`}
      >
        + Rule
      </button>

      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className={`${PLAIN_BUTTON_STYLE} disabled:cursor-wait disabled:opacity-60`}
      >
        {checking ? 'Sending…' : 'Check with AI'}
      </button>

      {checkError && (
        <span role="alert" className="text-sm text-red-600">
          {checkError}
        </span>
      )}
    </div>
  )
}
