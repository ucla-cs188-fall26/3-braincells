import { createContext } from 'react'
import type { Rule } from '../lib/rules'

export type RulesContextValue = {
  rules: Rule[]
  openRuleCard: (boxId: string) => void
  toggleRuleCard: (boxId: string) => void
}

// Boxes read the plan's rules from here. The defaults are safe, so a box rendered
// outside the canvas shows no rules instead of crashing.
export const RulesContext = createContext<RulesContextValue>({
  rules: [],
  openRuleCard: () => {},
  toggleRuleCard: () => {},
})
