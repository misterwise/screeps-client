# Performance harness

A small, **opt-in** toolkit for working on client performance. Two parts:

1. **Live perf HUD** — on-screen frame-time / FPS readout plus arbitrary counters, fed by lightweight instrumentation in the render and store hot paths.
2. **Vitest benchmarks** (`pnpm bench`) — deterministic micro-benchmarks that exercise real client logic on seeded synthetic data.

Both are off by default and add no behaviour to production.

## Live HUD

Enable any of:

- append `?perf=1` to the URL
- press **Alt+P**
- run `__perf.toggle()` in the devtools console

The HUD (top-right) shows FPS, frame-time p50/p95/p99, and any recorded sample series. `__perf.snapshot()` / `__perf.reset()` are also available from the console.

Instrumentation lives in `src/debug/perf.ts`:

- `perf.frame(deltaMS)` — called from the `RoomRenderer` / `MapRenderer` tickers.
- `perf.sample(name, value)` — named counters; currently the per-tick object count the `RoomViewer` effect walks (`roomViewer.*`) and the map size `HistoryPlayer.applyDiff` clones (`history.applyDiff.*`).

When the HUD is disabled, `frame()` / `sample()` return on a single boolean check, so the call sites are effectively free. Add `perf.sample('your.counter', n)` anywhere to surface a new metric.

## Benchmarks

```sh
pnpm bench                 # vitest bench --run
npx tsc -p tsconfig.bench.json   # typecheck the bench sources
```

`bench/history.bench.ts` drives the real `HistoryPlayer.getStateAtTick()` over a synthetic history chunk and contrasts it with a single-map variant that clones only changed entries. `bench/lib/synth.ts` holds seeded, deterministic data generators.

### Writing a new bench

- **Import the real code** (don't reimplement it) so the bench tracks the shipped implementation and doubles as a regression guard.
- Put the *current* and a *candidate* approach in the **same** `describe`, on identical data — the per-run A/B ratio is the signal.
- Use the seeded generators in `bench/lib/synth.ts` so runs are reproducible.

## What this measures — and what it doesn't

These are useful, but please read them as a **fast pre-flight signal and regression guard, not validated user-facing numbers**:

- They measure **JS-logic CPU cost**, not frame time, GPU/render cost, GC pauses, or input latency — which are usually what a user actually feels. A function that is "100× faster" can be invisible if it is a sliver of a real frame.
- Data is **synthetic** (assumed object-type mix, store complexity, diff sizes). Real rooms differ.
- They run in Node's V8 in a tight loop, so the JIT and artificially-uniform object shapes flatter both variants.
- Absolute ms/hz are **machine-relative**; only the within-run A/B ratio is portable.

For ground truth, profile the real client (DevTools) on a busy room and read the live HUD — the benches are for screening ideas and catching regressions cheaply.
