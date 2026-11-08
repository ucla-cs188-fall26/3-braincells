import BlueprintCanvas from '../components/BlueprintCanvas'

export default function NewPlanPage() {
  return (
    <main className="flex-1 p-6">
      <div className="bg-dot-grid size-full overflow-hidden rounded-xl border border-gray-200">
        <BlueprintCanvas />
      </div>
    </main>
  )
}
