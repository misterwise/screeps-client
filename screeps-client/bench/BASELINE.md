# Performance baseline — 2026-06-24

Captured on a dev macOS machine with a 120 Hz display. **Absolute numbers are
machine-relative** — only within-run before/after ratios and the live snapshots
are meaningful for comparison. Regenerate the bench rows any time with
`pnpm bench` (seeded data → deterministic).

## Vitest benches — current approach vs proposed fix, identical data

### History scrub — real `HistoryPlayer.getStateAtTick()`, full clone/tick vs single map
| room size | current (mean) | proposed (mean) | speedup |
|---|---|---|---|
| 200 obj | 0.32 ms | 0.26 ms | 1.2× |
| 800 obj | 11.9 ms | 0.41 ms | 29× |
| 1500 obj | 36.5 ms | 0.31 ms | 117× |

> History playback is **not implemented on xxscreeps** — this path only runs on official Screeps servers, and was never validated live.

### Per-tick actionLog scan — scan-all vs scan-changed (models the RoomViewer effect)
| scenario | current (mean) | proposed (mean) | speedup |
|---|---|---|---|
| 200 obj / 10 acting | 0.0064 ms | 0.0002 ms | 38× |
| 800 obj / 20 acting | 0.028 ms | 0.0004 ms | 78× |
| 1500 obj / 30 acting | 0.053 ms | 0.0005 ms | 111× |

### Micro-costs
| finding | current (mean) | proposed (mean) | speedup |
|---|---|---|---|
| badge change-key (JSON×2 → cheap concat) | 0.0004 ms | 0.00002 ms | 18.7× (9.8× vs single JSON) |
| parseRoomName in redraw loop (200 rooms) | 0.0127 ms | 0.0014 ms (cached) | 9.2× |
| console append (1000 msgs, cap 200) | 0.23 ms | 0.0027 ms (ring buffer) | 87× |

## Live HUD — the reality check

Room W1S2, ~370 objects, normal activity (no combat), 120 Hz machine, live play.
Two snapshots minutes apart, consistent:

| metric | snapshot 1 | snapshot 2 |
|---|---|---|
| fps | 120 | 120 |
| frame ms (p50 / p95 / p99) | 8.3 / 9.3 / 9.3 | 8.3 / 9.2 / 9.2 |
| objsIterated (avg) | 376 | 371 |
| diffSize (avg / p99) | 20.5 / 27 | 19.7 / 34 |
| roomViewer.objLayerUpdate (avg / p99 / max) | 0.17 / 0.4 / 12.2* ms | 0.11 / 0.4 / 0.6 ms |
| roomViewer.actionLogScan (avg / p99) | 0.04 / 0.2 ms | 0.05 / 0.2 ms |
| objectLayer.tick (avg / p99) | 0.19 / 0.4 ms | 0.21 / 0.5 ms |
| actionAnim.animate (avg / p99) | 0.012 / 0.1 ms | 0.012 / 0.1 ms |

\* one-time full reconcile on room open; steady-state is 0.1–0.4 ms.

## Conclusions

- **At typical load (~370 obj) on capable hardware, the client is not perf-bound.** Frame is vsync-capped at 8.3 ms (full 120 fps) with every instrumented JS path sub-millisecond. The bench multipliers are real but act on quantities that don't matter at this scale.
- **Reactivity premise confirmed:** ~371 objects walked per tick to handle ~20 changed (~18×), but it costs 0.04 ms.
- **Untested stress cases:** combat (would stress `actionAnim.animate`) and large rooms (>800 obj). The history clone is the largest absolute bench cost but is N/A on xxscreeps and unverified live.
- **Use this as a same-machine, same-scenario before/after reference**, not as portable absolute targets.
