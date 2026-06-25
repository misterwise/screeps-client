# Rendering architecture — efficiency analysis

Living doc tracking the *structural* rendering opportunities (distinct from the
per-call costs in `BASELINE.md`). Append dated measurements at the bottom.

## The core finding

The PixiJS app **renders the entire scene every vsync frame** (120 fps on the
test machine) **whether or not anything changed.** There is no render-on-demand:
no `autoStart: false`, no manual `app.render()`, no `ticker.stop()`, no
dirty/invalidate tracking anywhere in `src/renderer/`. Inside that loop several
layers *rebuild* geometry each frame:

- `ObjectLayer` holds ~53 `new Graphics()`; per-frame redraws (source pulse,
  spawn ring, controller tint, hover ring) `clear()` + re-tessellate every frame.
- `rampartGlowGraphics.filters = [BlurFilter(quality:3)]` stays attached, so a
  multi-pass blur runs **every rendered frame** (vs. terrain blur, which is baked
  once then `filters = null` — the correct pattern).
- Source pulse and controller glow are **continuous** time-based animations
  (`drawSourceVisual(g, size, performance.now())` every tick), so in any room
  with a source/controller the scene legitimately changes every frame.

So frame *rate* is fine (vsync-capped, sub-ms frames — see `BASELINE.md`); the
waste is **rendering 120 frames/s of a scene that changes ~once per tick (1–5 s)**.
The cost lands on idle CPU/GPU/power/thermals and on low-end hardware, none of
which the frame-time HUD reveals (it measures frame *interval*, not frame count).

## The metric (added 2026-06-24)

`perf.invalidate()` is called by real change sources — tick updates
(`RoomViewer` object effect) and camera pan/zoom (`RoomRenderer.recordFrame`).
Each frame, `perf.frame()` records **`render.stateDirty`** = was the scene
invalidated since the last frame (1/0).

- `render.stateDirty` **avg = fraction of rendered frames driven by real
  state/camera change.** `1 − avg` = frames driven only by animation/cosmetics.
- Idle room at 120 fps, tick ~2 s → expect avg ≈ 1/240 ≈ **0.004** (i.e. ~99.6%
  of renders had no game-state or camera change).
- Caveat: this counts tick + camera only. The remaining frames are
  *animation/cosmetic* — decomposing essential animation (creep interpolation,
  beams) from continuous cosmetic pulses is the next instrumentation step.
- `invalidate()` is also the **seed for render-on-demand**: the same signal can
  later gate whether a frame renders at all.

## Levers (ranked)

1. **Cap `app.ticker.maxFPS` (one-liner, do-first).** Screeps is tick-based with
   ~1.8 s interpolation and gentle pulses — 30–60 fps is perceptually identical.
   Capping 120 → 30 cuts renders ~4× immediately, no refactor, sidesteps the
   continuous-pulse problem. Measure: fps + idle CPU% before/after.
2. **Render-on-demand (refactor).** Render only when `invalidate()` fired or an
   animation/interpolation is active. Subsumes every per-frame redraw finding
   when idle. Biggest win for spectating/idle and the **map view** (static except
   when panning); **limited in rooms with continuous cosmetic pulses** unless (3).
3. **Throttle/cheapen continuous cosmetic animations** (source pulse, controller
   glow, rampart shimmer). They force "always dirty"; throttle to ~10–15 fps or
   bake, so render-on-demand can actually idle.
4. **Bake repeated/static Graphics → textures** (walls, roads, extensions).
   Better batching + no re-tessellation. (`StructureTextureCache`/`AtlasCache`
   exist — extend.) Less urgent once (2) lands.
5. **Rampart glow blur → bake (like terrain) or `quality: 3 → 2`.** Removes the
   one live per-frame filter pass.
6. **Text reuse** — create labels/levels once and reposition; `BitmapText` for
   high-churn text.

## How to measure (not via frame-time)

The frame-time HUD looks fine before *and* after these — the waste is frame
*count*, not frame cost. Track instead: `render.stateDirty` (this doc),
fps/renders-per-sec, and idle CPU%/power (DevTools Performance or Activity
Monitor) on an idle room. Capture idle vs. while-panning vs. (later) combat.

## Measurements log

| date | scenario | fps | render.stateDirty (avg) | notes |
|---|---|---|---|---|
| _pending_ | idle room, no camera move | | | first capture of the new metric |
| _pending_ | same room, panning | | | should jump toward ~1.0 while dragging |
