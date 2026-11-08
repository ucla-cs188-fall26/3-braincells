import { Navigate, Route, Routes } from 'react-router'
import PlanLayout from './components/PlanLayout'
import BuildPage from './pages/BuildPage'
import HomePage from './pages/HomePage'
import NewPlanPage from './pages/NewPlanPage'
import UnderstandPage from './pages/UnderstandPage'
import { ROUTES } from './routes'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomePage />} />
      <Route element={<PlanLayout />}>
        <Route path={ROUTES.newPlan} element={<NewPlanPage />} />
        <Route path={ROUTES.build} element={<BuildPage />} />
        <Route path={ROUTES.understand} element={<UnderstandPage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
