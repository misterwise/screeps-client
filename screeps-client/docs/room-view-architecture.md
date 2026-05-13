# Room View Architecture

This document describes how the room view is built, what each part is responsible for, and how the two UI layers — **SolidJS** (reactive UI) and **PixiJS** (WebGL canvas) — interact.

---

## High-Level Split: SolidJS vs PixiJS

The room view deliberately separates concerns along two axes:

| Concern | Handled by |
|---|---|
| Data fetching, subscriptions, reactive state | **SolidJS** (`RoomViewer.tsx`) |
| Rendering pixels, animation, user input on the canvas | **PixiJS** (`RoomRenderer`, layers) |
| Cross-cutting reactive state (selection) | **SolidJS signal** (`selectionStore`) |
| Keyboard / pointer events on the page | **SolidJS** (event listeners via `onCleanup`) |

SolidJS is the orchestrator. It owns all application state and reacts to changes in data, but never draws anything directly. PixiJS owns the canvas entirely — it knows nothing about SolidJS signals and is driven imperatively by method calls.

---

## Entry Points

### `Dashboard.tsx`

The top-level layout component. It renders the resizable sidebar (right), the bottom console, and the centre canvas area. It passes `room` and `shard` signals down to `RoomViewer`.

### `RoomViewer.tsx`

The SolidJS bridge between the data layer and the PixiJS canvas. Its responsibilities:

- Create and own the `RoomRenderer` (PixiJS app) on mount.
- React to `room`/`shard` prop changes: reset all state, tear down the old `ObjectLayer`, fetch fresh terrain and room objects.
- Feed terrain data into a `TerrainLayer` (one-off, static).
- Feed live object snapshots into `ObjectLayer.update()` on every game tick.
- Wire up tile-click handlers that compute the new selection and drive both `selectionStore` and `HoverHighlightLayer`.
- Register arrow-key navigation handlers on `window`, cleaned up automatically on room change or unmount.

---

## PixiJS Layer Stack

All layers live inside `RoomRenderer.world` (a `Container`). From bottom to top:

```
world (Container, transforms = camera pan/zoom)
├── TerrainLayer    (Graphics)           — static, drawn once
├── ObjectLayer     (Container)          — animated game objects
├── HoverHighlightLayer (Container)      — hover rect + selection overlays
└── NavOverlay      (Container)          — clickable navigation arrows
```

`bringNavOverlayToTop()` is called after adding new layers to ensure the nav arrows and the hover layer always stay on top.

---

## Renderer: `RoomRenderer.ts`

Owns the PixiJS `Application` and all camera logic. Key responsibilities:

- **Camera pan** — pointer drag moves `world.x/y`; clamped with elastic over-scroll.
- **Camera zoom** — wheel event scales `world` around the mouse pointer; rubber-band spring-back to min/max bounds.
- **Tile coordinate conversion** — `screenToTile(sx, sy)` converts a canvas-space point to a `[0..49]` tile coordinate, accounting for the current pan/zoom transform.
- **Click vs drag** — a pointer-up is treated as a *click* only if the pointer moved less than 4 px from where it went down.
- **Tile handlers** — `setTileHandlers(onHover, onClick)` lets `RoomViewer` register callbacks. `onHover` fires every `pointermove`, `onClick` fires on short taps with the tile coords and whether Ctrl/Cmd was held.
- **Resize** — a `ResizeObserver` keeps `app.renderer` sized to the container.
- **Spring animation** — positions and scale spring back to clamped bounds using a cubic-ease RAF loop after drag/zoom ends.

The `RoomRenderer` also owns the `HoverHighlightLayer` instance and wires `pointerleave` to clear the hover rect.

---

## Terrain: `TerrainLayer.ts`

A single `Graphics` object, drawn once when terrain data arrives. It iterates all 50×50 tiles, fills each with a terrain-type colour (`Plain` / `Wall` / `Swamp`), then strokes the room border. Because terrain never changes at runtime, it is never redrawn.

---

## Objects: `ObjectLayer.ts`

Manages the lifecycle of all visible game objects (creeps, structures, resources, etc.).

### Internal data structures

```
objects:    Map<id, Container>      — live PixiJS visual per object
rawObjects: Map<id, RoomObject>     — last known data snapshot per object
```

### Update cycle (`update(objects: RoomObjectMap)`)

Called every game tick with the full object snapshot:

1. **New objects** — `createObjectVisual(obj)` builds a `Container` with a `Graphics` shape (and a `Text` label for creeps) and adds it to the layer.
2. **Existing objects** — position is updated. Structures snap immediately; creeps set `__targetX/Y` on the container, which the ticker smoothly interpolates.
3. **Removed objects** — containers are destroyed and removed from both maps.

### Creep movement interpolation

A `Ticker` callback runs every frame and lerps each creep's visual position 15% of the way toward its target per frame, stopping when within 0.5 px. This gives the illusion of smooth movement even though game ticks arrive in discrete jumps.

### Tile queries (used by selection)

- `getObjectsAtTile(tx, ty)` — returns all `{id, obj, visual}` entries whose data position matches the given tile. Uses `rawObjects` (data-space coords), not the interpolated visual position.
- `getVisualById(id)` — returns the live `Container` for a given id, so the highlight layer can track it.

### Visual shapes

| Object type | Shape |
|---|---|
| `creep` | Filled circle + name label above |
| `source`, `mineral`, `deposit` | Filled square (slightly inset) |
| `controller` | Filled circle + inner stroke ring |
| `energy` | Small filled circle |
| Everything else | Filled square (structures) |

Colours come from `OBJECT_COLORS`, a flat map keyed by type.

---

## Hover & Selection: `HoverHighlightLayer.ts`

A transparent `Container` that draws two categories of overlay:

### Hover rect

A single `Graphics` object redrawn on every `pointermove` (via `RoomRenderer`). Shows a white-bordered, slightly-filled rectangle at the tile under the mouse.

### Selection overlays

Stored as `Map<id, Graphics>`. Drawn when `setSelectedObjects(items)` is called:

- **Creep** — a circle ring centred on the creep's visual container. A ticker callback re-draws the ring every frame so it tracks the interpolated position.
- **Structure / other** — a white-bordered box at the tile's data position (no interpolation needed).

`clearSelection()` destroys all overlay `Graphics` and clears the maps.

---

## Selection State: `selectionStore.ts`

A lightweight SolidJS signal:

```ts
interface SelectedObject {
  id: string
  type: string
  name?: string     // creep name or undefined
  x: number
  y: number
  raw: RoomObject   // full data for property display
}

const [selection, setSelection] = createSignal<SelectedObject[]>([])
```

It is the single source of truth for what is selected. Both the PixiJS side (highlight overlays) and the SolidJS side (sidebar panel) read from it — no prop-drilling required.

---

## Selection Logic (in `RoomViewer.tsx`)

### Normal click
Replaces the entire selection with all objects on the clicked tile. Empty tile → no-op.

### Ctrl+Click (or Cmd+Click on Mac)
- If **any** object on the tile is already in the selection → deselect those objects only.
- If **no** object on the tile is selected → add all objects on the tile to the existing selection.

After computing the new `SelectedObject[]` array, `RoomViewer`:
1. Calls `setSelection(nextSelection)` to update the store.
2. Calls `r.hoverLayer.setSelectedObjects(visuals)` with the full updated visual list (not just the delta) so the layer rebuilds its overlay set from scratch.

Selection is cleared automatically on room change (`r.clear()` → `clearSelection()`).

---

## Sidebar: `SelectionList.tsx`

A SolidJS component that reads `selection()` reactively and renders one `SelectionItem` card per entry. Each card shows:

- A colour dot (matching `OBJECT_COLORS`)
- Type label (human-readable) and name/id
- `(x, y)` position
- Flat numeric/string properties from `raw` in a two-column grid, with numeric fields (`hits`, `energy`, etc.) sorted first

When the selection is empty, a placeholder hint is shown instead.

---

## Navigation

### Clickable nav arrows (`setupNavigationZones`)

Four transparent PixiJS `Graphics` zones sit in the `NavOverlay`, just outside each edge of the room. They have pointer-hover highlighting and fire a direction callback on `pointerdown`. `RoomViewer` passes closures that compute the adjacent room name and call `props.onNavigate`.

### Arrow-key navigation

A `keydown` listener on `window` is registered in the same SolidJS effect as `setupNavigationZones`. It shares the same direction handlers. The listener is a no-op when an `<input>`, `<textarea>`, or `contenteditable` element is focused, and it is removed via `onCleanup` when the room changes or the component unmounts.

---

## Data Flow Summary

```
screeps-connectivity (WebSocket)
        │  room:update event
        ▼
RoomViewer (SolidJS createEffect)
        │  setObjects(snapshot)
        ▼
ObjectLayer.update(snapshot)          selectionStore (signal)
        │                                    │
        │ per-frame ticker                   │ reactive read
        ▼                                    ▼
HoverHighlightLayer            SelectionList (SolidJS component)
(ring tracks creep visuals)    (sidebar property panel)
```

---

## File Map

```
screeps-client/src/
├── app/
│   ├── App.tsx               — root, login gate
│   └── Dashboard.tsx         — layout, resizable panes
├── components/
│   ├── RoomViewer.tsx         — SolidJS ↔ PixiJS bridge, data wiring
│   ├── SelectionList.tsx      — sidebar selection panel
│   └── Sidebar.tsx            — right-hand property pane shell
├── renderer/
│   ├── RoomRenderer.ts        — PixiJS app, camera, tile coords, click/hover
│   ├── TerrainLayer.ts        — static 50×50 terrain Graphics
│   ├── ObjectLayer.ts         — object lifecycle, animation, tile queries
│   └── HoverHighlightLayer.ts — hover rect + selection overlays
└── stores/
    ├── clientStore.ts         — ScreepsClient instance + connection state
    └── selectionStore.ts      — selected objects signal
```
