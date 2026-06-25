// Benchmarks the Tier-1 history finding: HistoryPlayer.applyDiff clones the
// entire room object map every scrubbed tick. Drives the REAL getStateAtTick()
// (current behaviour) and contrasts it against a single-map variant that clones
// only the entries that actually changed — the shippable fix, on identical data.
import { bench, describe } from 'vitest'
import { HistoryPlayer } from '~/stores/HistoryPlayer.js'
import { makeHistoryChunk } from './lib/synth.js'
import type { RoomHistoryChunk, RoomObject, RoomObjectMap } from 'screeps-connectivity'

const CHUNK = 200
const CHANGES_PER_TICK = 12
const SIZES = [200, 800, 1500]

// Proposed: rebuild base once, then mutate a single map applying only the diff —
// changed entries still get fresh identity, but the whole map is never re-cloned.
function scrubProposed(chunk: RoomHistoryChunk, base: number, tick: number): RoomObjectMap {
  const objects: RoomObjectMap = {}
  const baseDiff = chunk.ticks[String(base)] ?? {}
  for (const id in baseDiff) {
    if (baseDiff[id] !== null) objects[id] = baseDiff[id] as RoomObject
  }
  for (let t = base + 1; t <= tick; t++) {
    const d = chunk.ticks[String(t)]
    if (!d) continue
    for (const id in d) {
      const val = d[id]
      if (val === null) delete objects[id]
      else if (objects[id]) objects[id] = { ...objects[id], ...val } as RoomObject
      else objects[id] = val as RoomObject
    }
  }
  return objects
}

for (const baseCount of SIZES) {
  const chunk = makeHistoryChunk('W7N7', 0, CHUNK, baseCount, CHANGES_PER_TICK)
  const http = { game: { roomHistory: async (): Promise<RoomHistoryChunk> => chunk } }
  const player = new HistoryPlayer('W7N7', null, http, CHUNK)
  const lastTick = CHUNK - 1

  describe(`history scrub to tick ${lastTick} — ${baseCount} objects, ${CHANGES_PER_TICK} changed/tick`, () => {
    bench('current: getStateAtTick (full clone per tick)', async () => {
      await player.getStateAtTick(lastTick)
    })
    bench('proposed: single map, clone changed entries only', () => {
      scrubProposed(chunk, 0, lastTick)
    })
  })
}
