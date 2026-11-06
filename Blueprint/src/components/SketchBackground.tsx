interface Sketch {
  src: string
  /** Tailwind classes that position, size and rotate the sketch. */
  className: string
  /** Hide on narrow screens where it would collide with the content. */
  hideOnPhone?: boolean
}

const SKETCHES: Sketch[] = [
  { src: '/sketches/home-reminders.svg', className: 'top-[9%] left-[4%] w-92.5 -rotate-2' },
  { src: '/sketches/timer-storage.svg', className: 'top-[18%] right-[6%] w-40 rotate-2', hideOnPhone: true },
  { src: '/sketches/settings.svg', className: 'top-[44%] left-[3%] w-54 rotate-[1.5deg]', hideOnPhone: true },
  { src: '/sketches/rule.svg', className: 'bottom-[11%] left-[7%] w-67.5 -rotate-[1.5deg]', hideOnPhone: true },
  { src: '/sketches/signin-profile.svg', className: 'right-[7%] bottom-[9%] w-86 -rotate-1' },
]

/** Decorative example plan scattered behind the hero content. */
export default function SketchBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-55">
      {SKETCHES.map(({ src, className, hideOnPhone }) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute ${className} ${hideOnPhone ? 'max-[900px]:hidden' : ''}`}
        />
      ))}
    </div>
  )
}
