// Lightweight client-side performance instrumentation — a measurement harness
// for the efficiency work. It records render frame times and arbitrary named
// sample series (e.g. how many objects an effect iterates per tick), then
// exposes rolling stats for the on-screen PerfHud.
//
// Disabled by default. Enable with `?perf=1` in the URL, by calling
// `__perf.toggle()` from the devtools console, or with Alt+P (see PerfHud).
// When disabled, frame()/sample() return on a single boolean check, so leaving
// the calls in hot paths is effectively free.

const STORAGE_KEY = 'screeps:perf'
const FRAME_CAPACITY = 240 // ~4s of frames at 60fps
const SAMPLE_CAPACITY = 240

export interface SeriesStats {
  n: number
  last: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

export interface PerfSnapshot {
  enabled: boolean
  fps: number
  frame: SeriesStats
  series: Record<string, SeriesStats>
}

const EMPTY_STATS: SeriesStats = { n: 0, last: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 }

function percentile(sorted: Float64Array, q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[idx]
}

// Fixed-capacity ring buffer. push() is allocation-free; stats() allocates a
// scratch array and is only ever called from the HUD poll (a few times a sec).
class RingBuffer {
  private readonly buf: Float64Array
  private head = 0
  private count = 0

  constructor(private readonly capacity: number) {
    this.buf = new Float64Array(capacity)
  }

  push(value: number): void {
    this.buf[this.head] = value
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  clear(): void {
    this.head = 0
    this.count = 0
  }

  stats(): SeriesStats {
    if (this.count === 0) return EMPTY_STATS
    const sorted = new Float64Array(this.count)
    let sum = 0
    for (let i = 0; i < this.count; i++) {
      const v = this.buf[i]
      sorted[i] = v
      sum += v
    }
    sorted.sort()
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity
    return {
      n: this.count,
      last: this.buf[lastIndex],
      avg: sum / this.count,
      min: sorted[0],
      max: sorted[this.count - 1],
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
    }
  }
}

function readInitialEnabled(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('perf')
    if (q === '1') {
      window.localStorage.setItem(STORAGE_KEY, '1')
      return true
    }
    if (q === '0') {
      window.localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

class PerfMonitor {
  enabled = readInitialEnabled()
  private readonly frames = new RingBuffer(FRAME_CAPACITY)
  private readonly series = new Map<string, RingBuffer>()
  private readonly listeners = new Set<() => void>()

  // Record one rendered frame's duration (ms between ticker callbacks).
  frame(deltaMS: number): void {
    if (!this.enabled) return
    this.frames.push(deltaMS)
  }

  // Record one value of a named series (e.g. objects iterated this tick).
  sample(name: string, value: number): void {
    if (!this.enabled) return
    let s = this.series.get(name)
    if (!s) {
      s = new RingBuffer(SAMPLE_CAPACITY)
      this.series.set(name, s)
    }
    s.push(value)
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    try {
      if (on) window.localStorage.setItem(STORAGE_KEY, '1')
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    for (const fn of this.listeners) fn()
  }

  toggle(): void {
    this.setEnabled(!this.enabled)
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  reset(): void {
    this.frames.clear()
    for (const s of this.series.values()) s.clear()
  }

  snapshot(): PerfSnapshot {
    const frame = this.frames.stats()
    const series: Record<string, SeriesStats> = {}
    for (const [name, buf] of this.series) series[name] = buf.stats()
    return {
      enabled: this.enabled,
      fps: frame.avg > 0 ? 1000 / frame.avg : 0,
      frame,
      series,
    }
  }
}

export const perf = new PerfMonitor()

if (typeof window !== 'undefined') {
  // Expose for devtools console control: __perf.toggle() / .snapshot() / .reset()
  ;(globalThis as Record<string, unknown>).__perf = perf
}
