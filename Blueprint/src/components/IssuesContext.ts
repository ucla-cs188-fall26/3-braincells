import { createContext } from 'react'
import type { PlanIssue } from '../lib/planCheck'

export type IssuesContextValue = {
  issues: PlanIssue[]
  openResults: () => void
}

// Boxes read the AI check's issues from here. The defaults are safe, so a box rendered
// outside the canvas shows no badge instead of crashing.
export const IssuesContext = createContext<IssuesContextValue>({
  issues: [],
  openResults: () => {},
})
