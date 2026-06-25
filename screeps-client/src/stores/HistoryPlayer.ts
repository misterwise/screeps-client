import type { RoomObjectMap, RoomObjectDiff, RoomObject, RoomHistoryChunk } from 'screeps-connectivity'
import { perf } from '~/debug/perf.js'

interface GameHttpClient {
  game: {
    roomHistory(room: string, time: number, shard?: string | null): Promise<RoomHistoryChunk>
  }
}

export class HistoryPlayer {
  private readonly chunkCache = new Map<number, RoomHistoryChunk>()
  private readonly inflight = new Map<number, Promise<RoomHistoryChunk>>()

  constructor(
    private readonly room: string,
    private readonly shard: string | null,
    private readonly http: GameHttpClient,
    private readonly chunkSize: number,
  ) {}

  chunkBase(tick: number): number {
    return tick - (tick % this.chunkSize)
  }

  private loadChunk(base: number): Promise<RoomHistoryChunk> {
    const cached = this.chunkCache.get(base)
    if (cached) return Promise.resolve(cached)

    const existing = this.inflight.get(base)
    if (existing) return existing

    const promise = this.http.game.roomHistory(this.room, base, this.shard)
      .then((chunk) => {
        this.chunkCache.set(base, chunk)
        this.inflight.delete(base)
        return chunk
      })
      .catch((err: Error) => {
        this.inflight.delete(base)
        throw err
      })

    this.inflight.set(base, promise)
    return promise
  }

  private applyDiff(base: RoomObjectMap, diff: RoomObjectDiff): RoomObjectMap {
    // Perf harness: the `{ ...base }` clone copies every object in the room just
    // to apply a handful of changes. Sample cloned-count vs. changed-count so the
    // waste is visible during history scrubbing.
    const baseCount = perf.enabled ? Object.keys(base).length : 0
    const result = { ...base }
    let changed = 0
    for (const id in diff) {
      changed++
      const val = diff[id]
      if (val === null) {
        delete result[id]
      } else if (result[id]) {
        result[id] = { ...result[id], ...val } as RoomObject
      } else {
        result[id] = val as RoomObject
      }
    }
    if (perf.enabled) {
      perf.sample('history.applyDiff.cloned', baseCount)
      perf.sample('history.applyDiff.changed', changed)
    }
    return result
  }

  async getStateAtTick(tick: number): Promise<{ objects: RoomObjectMap; diff: RoomObjectDiff; gameTime: number; clampedTo?: number }> {
    let base = this.chunkBase(tick)
    let chunk: RoomHistoryChunk
    let clampedTo: number | undefined

    try {
      chunk = await this.loadChunk(base)
    } catch {
      // Chunk not yet written — fall back to the previous one
      const prevBase = base - this.chunkSize
      if (prevBase < 0) throw new Error(`No history data available before tick ${base}`)
      chunk = await this.loadChunk(prevBase)
      base = prevBase
      // Clamp tick to the highest available tick in the previous chunk
      const available = Object.keys(chunk.ticks).map(Number).filter(t => t >= base)
      const clamped = available.length > 0 ? Math.max(...available) : base
      clampedTo = clamped
      tick = clamped
    }

    // The base tick entry is the full room state (all objects present, no nulls)
    const baseDiff = chunk.ticks[String(base)] ?? {}
    let objects: RoomObjectMap = {}
    for (const id in baseDiff) {
      if (baseDiff[id] !== null) objects[id] = baseDiff[id] as RoomObject
    }

    // Apply diffs forward from base+1 to the requested tick
    for (let t = base + 1; t <= tick; t++) {
      const d = chunk.ticks[String(t)]
      if (d && Object.keys(d).length > 0) {
        objects = this.applyDiff(objects, d)
      }
    }

    return { objects, diff: chunk.ticks[String(tick)] ?? {}, gameTime: tick, clampedTo }
  }
}
