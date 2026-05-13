import { createSignal } from 'solid-js'
import type { RoomObject } from 'screeps-connectivity'

export interface SelectedObject {
  id: string
  type: string
  name?: string
  x: number
  y: number
  raw: RoomObject
}

const [selection, setSelection] = createSignal<SelectedObject[]>([])

export { selection, setSelection }

export function clearSelection(): void {
  setSelection([])
}
