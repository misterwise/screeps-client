import { createSignal } from 'solid-js'
import { basePath } from '~/utils/embedded.js'

// Top-level screen the connected app shows. The in-game Dashboard owns its own
// /room and /map sub-routing; this store only decides Overview vs. the game view.
export type Route = 'overview' | 'game'

function overviewPath(): string {
  return `${basePath()}/overview`
}

function currentPath(): string {
  return window.location.pathname + window.location.search + window.location.hash
}

function parseRoute(): Route {
  return window.location.pathname === overviewPath() ? 'overview' : 'game'
}

const [route, setRoute] = createSignal<Route>(parseRoute())
export { route }

// Remembered so returning from Overview restores the exact game view (room +
// shard + history tick) rather than dropping back to the default map.
let lastGamePath = parseRoute() === 'game' ? currentPath() : `${basePath()}/map`

export function goToOverview(): void {
  if (parseRoute() === 'game') lastGamePath = currentPath()
  history.pushState(null, '', overviewPath())
  setRoute('overview')
}

export function goToGame(): void {
  history.pushState(null, '', lastGamePath)
  setRoute('game')
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => setRoute(parseRoute()))
}
