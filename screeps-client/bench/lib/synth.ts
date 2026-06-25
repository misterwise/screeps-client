// Deterministic synthetic data for the efficiency benchmarks. Seeded PRNG so
// every run sees byte-identical input — the whole point of an automatable,
// comparable benchmark. No reliance on Math.random()/Date.
import type { RoomObject, RoomObjectMap, RoomObjectDiff, RoomHistoryChunk } from 'screeps-connectivity'

// mulberry32 — tiny seeded PRNG.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STRUCTURE_TYPES = ['extension', 'road', 'constructedWall', 'rampart', 'container', 'link', 'tower', 'lab', 'spawn']

// A room object map of `count` objects roughly resembling a busy room
// (~30% creeps, rest structures), deterministic for a given seed.
export function makeRoomObjectMap(count: number, seed = 1): RoomObjectMap {
  const rand = mulberry32(seed)
  const map: RoomObjectMap = {}
  for (let i = 0; i < count; i++) {
    const id = `obj_${i.toString(36)}`
    const isCreep = rand() < 0.3
    const type = isCreep ? 'creep' : STRUCTURE_TYPES[Math.floor(rand() * STRUCTURE_TYPES.length)]
    const obj: RoomObject = {
      _id: id,
      type,
      room: 'W7N7',
      x: Math.floor(rand() * 50),
      y: Math.floor(rand() * 50),
    }
    if (isCreep) {
      obj.hits = 100
      obj.hitsMax = 100
      obj.body = [{ type: 'move', hits: 100 }, { type: 'work', hits: 100 }, { type: 'carry', hits: 100 }]
      obj.store = { energy: Math.floor(rand() * 50) }
    } else {
      obj.store = { energy: Math.floor(rand() * 2000) }
    }
    map[id] = obj
  }
  return map
}

// A history chunk: tick `base` is the full room snapshot; each later tick is a
// diff moving `changesPerTick` random objects, matching the server's format.
export function makeHistoryChunk(
  room: string,
  base: number,
  chunkSize: number,
  baseCount: number,
  changesPerTick: number,
  seed = 4,
): RoomHistoryChunk {
  const baseMap = makeRoomObjectMap(baseCount, seed)
  const ids = Object.keys(baseMap)
  const ticks: Record<string, RoomObjectDiff> = {}

  const fullDiff: RoomObjectDiff = {}
  for (const id in baseMap) fullDiff[id] = baseMap[id]
  ticks[String(base)] = fullDiff

  const rand = mulberry32(seed + 7)
  for (let t = 1; t < chunkSize; t++) {
    const d: RoomObjectDiff = {}
    for (let c = 0; c < changesPerTick; c++) {
      const id = ids[Math.floor(rand() * ids.length)]
      d[id] = { x: Math.floor(rand() * 50), y: Math.floor(rand() * 50) }
    }
    ticks[String(base + t)] = d
  }
  return { timestamp: 0, room, base, ticks }
}
