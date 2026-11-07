import BlueprintCanvas from '../components/BlueprintCanvas'

export default function NewPlanPage() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
        <img src="/logo.svg" alt="" className="size-6" />
        <h1 className="text-base font-semibold">Blueprint</h1>
      </header>

      <main className="flex-1 p-6">
        <div className="bg-dot-grid size-full overflow-hidden rounded-xl border border-gray-200">
          <BlueprintCanvas />
        </div>
      </main>
    </div>
  )
}
