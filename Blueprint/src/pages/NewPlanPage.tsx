import { Link } from 'react-router'
import BlueprintCanvas from '../components/BlueprintCanvas'
import { ROUTES } from '../routes'

export default function NewPlanPage() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <Link to={ROUTES.home} className="flex w-fit items-center gap-3">
          <img src="/logo.svg" alt="" className="size-6" />
          <h1 className="text-base font-semibold">Blueprint</h1>
        </Link>
      </header>

      <main className="flex-1 p-6">
        <div className="bg-dot-grid size-full overflow-hidden rounded-xl border border-gray-200">
          <BlueprintCanvas />
        </div>
      </main>
    </div>
  )
}
