import { useState, type Ref } from 'react'

type RuleCornerProps = {
  count: number
  boxName: string
  firstRuleText: string
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
  boxId: string
}

// Keeps the corner's pointer events from reaching the box (select, drag, connect).
const keepToCorner = (event: { stopPropagation: () => void }) => event.stopPropagation()

// The folded corner inside a box's bottom-right, with the rule count and a hover preview.
// Positioned absolutely inside the box, so it never changes the box's size.
export default function RuleCorner({
  count,
  boxName,
  firstRuleText,
  onClick,
  ref,
  boxId,
}: RuleCornerProps) {
  const [previewing, setPreviewing] = useState(false)
  const more = count - 1

  return (
    <>
      {/* A clipping layer the size of the box's inside, with the box's inner radius (12px corner
          minus its 1px border). The corner is a plain square in its bottom-right and this layer
          rounds it, so the corner follows the box's shape by construction and never has to
          line up with the border by hand. Only the button inside takes clicks. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[11px]">
        <button
          ref={ref}
          type="button"
          data-rules-trigger
          data-rules-corner={boxId}
          aria-label={`${count} ${count === 1 ? 'rule' : 'rules'} on ${boxName}`}
          onClick={(event) => {
            keepToCorner(event)
            onClick()
          }}
          onMouseDown={keepToCorner}
          onPointerDown={keepToCorner}
          onMouseEnter={() => setPreviewing(true)}
          onMouseLeave={() => setPreviewing(false)}
          onFocus={() => setPreviewing(true)}
          onBlur={() => setPreviewing(false)}
          className="nodrag nopan pointer-events-auto absolute right-0 bottom-0 block size-[26px] origin-bottom-right cursor-pointer p-0 transition-transform duration-250 hover:scale-130 focus-visible:scale-130 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="block">
            <path d="M26 0 L26 26 L0 26 Z" fill="#EEF1F3" />
            <path d="M0 26 L26 0" fill="none" stroke="#C3CED6" strokeWidth="1.25" />
            <text
              x="17"
              y="20"
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#14202B"
              fontFamily="inherit"
            >
              {count}
            </text>
          </svg>
        </button>
      </div>

      {previewing && (
        <p
          role="tooltip"
          className="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 -translate-x-1/2 w-max max-w-[24rem] rounded-md bg-[#14202B] px-2.5 py-1 text-[11px] text-white"
        >
          Rule: {firstRuleText}
          {more > 0 && <span className="ml-2 text-white/75">+{more} more</span>}
        </p>
      )}
    </>
  )
}
