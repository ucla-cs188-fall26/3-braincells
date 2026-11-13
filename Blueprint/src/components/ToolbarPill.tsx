import { useState, type ComponentType, type SVGProps } from 'react'

export type ToolbarAction = {
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  onClick?: () => void // some actions are placeholders for now
  danger?: boolean
  active?: boolean
}

const SIZES = {
  md: { pill: 'rounded-xl p-1', button: 'size-8 rounded-lg', icon: 'size-4', divider: 'h-6', tip: 'mb-2 text-sm' },
  sm: { pill: 'rounded-lg p-0.5', button: 'size-6 rounded-md', icon: 'size-3.5', divider: 'h-4', tip: 'mb-0.5 text-xs' },
}

type ToolbarPillProps = {
  actions: ToolbarAction[]
  size?: keyof typeof SIZES
}

// The floating row of icon buttons shared by block and edge toolbars.
export default function ToolbarPill({ actions, size = 'md' }: ToolbarPillProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const style = SIZES[size]

  return (
    <div className="nodrag nopan relative" onMouseLeave={() => setActiveLabel(null)}>
      {activeLabel && (
        <p className={`absolute bottom-full left-1/2 ${style.tip} -translate-x-1/2 whitespace-nowrap text-muted`}>
          {activeLabel}
        </p>
      )}

      <div
        className={`flex items-center gap-1 border border-gray-200 bg-white shadow-lg ${style.pill}`}
      >
        {actions.map(({ label, Icon, onClick, danger, active }) => (
          <div key={label} className="flex items-center gap-1">
            {danger && <div className={`mr-1 w-px bg-gray-300 ${style.divider}`} />}
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={onClick}
              onMouseEnter={() => setActiveLabel(label)}
              onFocus={() => setActiveLabel(label)}
              onBlur={() => setActiveLabel(null)}
              className={`flex items-center justify-center transition-colors ${active ? 'bg-blue-100' : 'hover:bg-gray-100'} ${style.button} ${
                danger ? 'text-red-700' : 'text-ink'
              }`}
            >
              <Icon className={style.icon} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
