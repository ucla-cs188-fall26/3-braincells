import { useSyncExternalStore } from 'react'
import { buildPayload, payloadKey, type BuildPayload } from './buildPayload'
import { generateCode, type GeneratedFile } from './generateCode'
import { loadPlan, loadPlanName, subscribeToPlanSaves } from './planStorage'

export type BuildStatus = 'idle' | 'generating' | 'done'

export type BuildState = {
  status: BuildStatus
  files: GeneratedFile[] // written so far (all of them once done)
  total: number | null // known once the first file arrives
  key: string | null // which version of the plan this build is for
  error: string | null
}

const IDLE: BuildState = { status: 'idle', files: [], total: null, key: null, error: null }
const VERSION = 1
const storageKey = (planId: string) => `blueprint:plan-build:${planId}`

// The plan as it would be sent right now, read from the autosave.
export const currentPayload = (planId: string): BuildPayload =>
  buildPayload(loadPlan(planId), loadPlanName(planId))

// A finished build is kept so the Build and Understand steps survive a reload, but only while the
// plan still matches it.
function loadFinishedBuild(planId: string): BuildState {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(planId)) ?? 'null')
    if (saved?.version !== VERSION || !Array.isArray(saved.files) || typeof saved.key !== 'string') return IDLE
    if (saved.key !== payloadKey(currentPayload(planId))) return IDLE
    return { status: 'done', files: saved.files, total: saved.files.length, key: saved.key, error: null }
  } catch {
    return IDLE
  }
}

function saveFinishedBuild(planId: string, state: BuildState | null) {
  try {
    if (state) {
      localStorage.setItem(storageKey(planId), JSON.stringify({ version: VERSION, key: state.key, files: state.files }))
    } else {
      localStorage.removeItem(storageKey(planId))
    }
  } catch {
    // Losing the saved build only means sending the plan again after a reload.
  }
}

const states = new Map<string, BuildState>()
const running = new Map<string, AbortController>()
const listeners = new Set<() => void>()

export function getBuildState(planId: string): BuildState {
  let state = states.get(planId)
  if (!state) {
    state = loadFinishedBuild(planId)
    states.set(planId, state)
  }
  return state
}

function setBuildState(planId: string, state: BuildState) {
  states.set(planId, state)
  listeners.forEach((listener) => listener())
}

export function resetBuild(planId: string) {
  running.get(planId)?.abort()
  running.delete(planId)
  saveFinishedBuild(planId, null)
  setBuildState(planId, IDLE)
}

// Editing the plan (or marking a box later) undoes the build, so the Build step goes back to
// "Waiting to send". Moving boxes around or renaming the plan doesn't change what gets sent.
subscribeToPlanSaves((planId) => {
  const state = states.get(planId)
  if (!state || state.status === 'idle') return
  if (state.key !== payloadKey(currentPayload(planId))) resetBuild(planId)
})

// Sends the plan as it is now and reveals the files as they are written.
export async function startBuild(planId: string) {
  if (getBuildState(planId).status === 'generating') return
  running.get(planId)?.abort()
  const controller = new AbortController()
  running.set(planId, controller)

  const payload = currentPayload(planId)
  const key = payloadKey(payload)
  saveFinishedBuild(planId, null)
  setBuildState(planId, { ...IDLE, status: 'generating', key })

  try {
    const files = await generateCode(
      payload,
      (file, { total }) => {
        const state = getBuildState(planId)
        setBuildState(planId, { ...state, files: [...state.files, file], total })
      },
      { signal: controller.signal },
    )
    const done: BuildState = { status: 'done', files, total: files.length, key, error: null }
    saveFinishedBuild(planId, done)
    setBuildState(planId, done)
  } catch (err) {
    if (controller.signal.aborted) return // reset (or a newer build) already took over
    setBuildState(planId, {
      ...IDLE,
      error: err instanceof Error ? err.message : 'Something went wrong. Try again.',
    })
  } finally {
    if (running.get(planId) === controller) running.delete(planId)
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useBuild(planId: string): BuildState {
  return useSyncExternalStore(subscribe, () => getBuildState(planId))
}
