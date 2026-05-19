import { createSignal } from 'solid-js'

export type MapOverlayMode = 'owner' | 'mineral' | 'none'

const [mapOverlayMode, setMapOverlayMode] = createSignal<MapOverlayMode>('owner')

export { mapOverlayMode, setMapOverlayMode }
