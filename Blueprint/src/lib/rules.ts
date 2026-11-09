// A rule is a plain-language constraint attached to one box (boxId = the box's node id).
export type Rule = {
  id: string
  boxId: string
  text: string
}

export const MAX_RULE_LENGTH = 140

export const isBlankRuleText = (text: string) => text.trim() === ''

export function rulesForBox(rules: Rule[], boxId: string): Rule[] {
  return rules.filter((rule) => rule.boxId === boxId)
}

const isValidRuleText = (text: string) =>
  !isBlankRuleText(text) && text.trim().length <= MAX_RULE_LENGTH

export function addRule(rules: Rule[], boxId: string, text: string): Rule[] {
  if (!boxId || !isValidRuleText(text)) return rules
  return [...rules, { id: crypto.randomUUID(), boxId, text: text.trim() }]
}

export function updateRule(rules: Rule[], ruleId: string, text: string): Rule[] {
  if (!isValidRuleText(text) || !rules.some((rule) => rule.id === ruleId)) return rules
  return rules.map((rule) => (rule.id === ruleId ? { ...rule, text: text.trim() } : rule))
}

export function deleteRule(rules: Rule[], ruleId: string): Rule[] {
  if (!rules.some((rule) => rule.id === ruleId)) return rules
  return rules.filter((rule) => rule.id !== ruleId)
}

export function removeRulesForBoxes(rules: Rule[], boxIds: string[]): Rule[] {
  const removed = new Set(boxIds)
  if (!rules.some((rule) => removed.has(rule.boxId))) return rules
  return rules.filter((rule) => !removed.has(rule.boxId))
}

// Keeps only well-formed rules whose box still exists. Safe to call on anything read from storage.
export function cleanRules(raw: unknown, boxIds: Set<string>): Rule[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (rule): rule is Rule =>
        typeof rule?.id === 'string' &&
        typeof rule.boxId === 'string' &&
        typeof rule.text === 'string' &&
        !isBlankRuleText(rule.text) &&
        boxIds.has(rule.boxId),
    )
    .map(({ id, boxId, text }) => ({ id, boxId, text: text.trim().slice(0, MAX_RULE_LENGTH) }))
}
