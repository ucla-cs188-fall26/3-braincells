// One-time hints. Each is shown once per browser and then remembered.
const outroKey = 'blueprint:seen:understand-outro'

export function hasSeenOutro(): boolean {
  try {
    return localStorage.getItem(outroKey) === '1'
  } catch {
    // If storage is blocked, say "seen" so the outro can't pop up on every click.
    return true
  }
}

export function markOutroSeen() {
  try {
    localStorage.setItem(outroKey, '1')
  } catch {
    // Nothing to do: without storage it simply won't be remembered.
  }
}
