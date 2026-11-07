export default function CanvasEmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative size-16 rounded-full border-2 border-dashed border-brand bg-white text-brand">
        {/* Plus drawn as two bars so it is exactly centered, regardless of font metrics */}
        <span className="absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-current" />
        <span className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-current" />
      </div>

      <p className="text-xl font-bold">Click anywhere to add a block</p>
    </div>
  )
}
