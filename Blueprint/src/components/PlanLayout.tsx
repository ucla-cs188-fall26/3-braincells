import { Outlet } from 'react-router'
import PlanHeader from './PlanHeader'

export default function PlanLayout() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <PlanHeader />
      <Outlet />
    </div>
  )
}
