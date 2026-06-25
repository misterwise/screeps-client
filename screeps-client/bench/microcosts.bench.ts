// Benchmarks the cheap-but-frequent findings, each contrasting the current
// approach with the proposed fix on identical data:
//  - badge change-detection (double JSON.stringify per stat update)
//  - parseRoomName regex re-run inside redraw loops
//  - console-entry append via spread+slice vs ring buffer
import { bench, describe } from 'vitest'
import { parseRoomName } from '~/utils/roomName.js'

// --- badge change-detection key (MapViewer + BadgeTextureCache) ---
const badge = { type: 12, color1: '#112233', color2: '#445566', color3: '#778899', flip: false, param: 42 }

describe('badge change-detection key', () => {
  bench('current: JSON.stringify x2 (MapViewer change-check + cache key)', () => {
    const a = JSON.stringify(badge)
    const b = JSON.stringify(badge)
    if (a.length + b.length === 0) throw new Error('unreachable')
  })
  bench('proposed: stringify once, reuse key', () => {
    const a = JSON.stringify(badge)
    const b = a
    if (a.length + b.length === 0) throw new Error('unreachable')
  })
  bench('proposed: cheap concatenated key (no JSON)', () => {
    const a = `${badge.type}|${badge.color1}|${badge.color2}|${badge.color3}|${badge.flip}|${badge.param}`
    if (a.length === 0) throw new Error('unreachable')
  })
})

// --- parseRoomName in a redraw loop (e.g. MapRenderer.redrawSafeMode) ---
const NAMES: string[] = []
for (let x = 0; NAMES.length < 200; x++) {
  for (let y = 0; y < 14 && NAMES.length < 200; y++) NAMES.push(`W${x}N${y}`)
}
const coordCache = new Map<string, { x: number; y: number }>()
for (const n of NAMES) {
  const c = parseRoomName(n)
  if (c) coordCache.set(n, c)
}

describe(`parseRoomName in redraw loop — ${NAMES.length} rooms`, () => {
  bench('current: regex parse every redraw', () => {
    let acc = 0
    for (const n of NAMES) {
      const c = parseRoomName(n)
      if (c) acc += c.x + c.y
    }
    if (acc === Number.MIN_SAFE_INTEGER) throw new Error('unreachable')
  })
  bench('proposed: cached coord lookup', () => {
    let acc = 0
    for (const n of NAMES) {
      const c = coordCache.get(n)
      if (c) acc += c.x + c.y
    }
    if (acc === Number.MIN_SAFE_INTEGER) throw new Error('unreachable')
  })
})

// --- console entry append (ConsolePanel) ---
const CAP = 200
const MESSAGES = 1000

describe(`console entries append — ${MESSAGES} messages, cap ${CAP}`, () => {
  bench('current: [...prev, e].slice(-cap)', () => {
    let entries: number[] = []
    for (let i = 0; i < MESSAGES; i++) {
      const next = [...entries, i]
      entries = next.length > CAP ? next.slice(next.length - CAP) : next
    }
    if (entries.length !== CAP) throw new Error('unreachable')
  })
  bench('proposed: fixed ring buffer push', () => {
    const buf = new Array<number>(CAP)
    let head = 0
    let count = 0
    for (let i = 0; i < MESSAGES; i++) {
      buf[head] = i
      head = (head + 1) % CAP
      if (count < CAP) count++
    }
    if (count !== CAP) throw new Error('unreachable')
  })
})
