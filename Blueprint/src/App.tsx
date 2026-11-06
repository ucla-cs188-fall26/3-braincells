import { Navigate, Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import NewPlanPage from './pages/NewPlanPage'
import { ROUTES } from './routes'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomePage />} />
      <Route path={ROUTES.newPlan} element={<NewPlanPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
