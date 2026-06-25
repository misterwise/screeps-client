import { createSignal, onCleanup, onMount, For } from 'solid-js'
import { ChevronLeft } from 'lucide-solid'
import type { ApiUserOverviewTotals } from 'screeps-connectivity'
import { client, userInfo } from '~/stores/clientStore.js'
import { goToGame } from '~/stores/routeStore.js'
import { gclProgress, gplProgress, type LevelProgress } from '~/utils/levels.js'
import { formatStat } from '~/utils/formatStat.js'

// Vanilla refetches the overview (and re-reads the account record) on a 60s
// timer rather than via a socket subscription; mirror that cadence.
const REFRESH_MS = 60_000
// Stat interval in tick-buckets; 8 ≈ the vanilla "1 hour" default. statName only
// drives the (deferred) per-room punch-card, so any valid value works here.
const STAT_INTERVAL = 8

const GCL_RING = '#4DB6AC'
const GCL_TEXT = '#A7FFEB'
const GPL_RING = '#C54444'
const GPL_TEXT = '#FF9A9A'

const STAT_TILES: Array<{ key: keyof ApiUserOverviewTotals; l1: string; l2: string; color: string }> = [
  { key: 'energyControl', l1: 'Control', l2: 'points', color: '#A7FFEB' },
  { key: 'energyHarvested', l1: 'Energy', l2: 'harvested', color: '#ffe56d' },
  { key: 'energyConstruction', l1: 'Energy', l2: 'on construct', color: '#eeeeee' },
  { key: 'energyCreeps', l1: 'Energy', l2: 'on creeps', color: '#eeeeee' },
  { key: 'creepsProduced', l1: 'Creeps', l2: 'produced', color: '#65fd62' },
  { key: 'creepsLost', l1: 'Creeps', l2: 'lost', color: '#f96e76' },
  { key: 'powerProcessed', l1: 'Power', l2: 'processed', color: '#E04040' },
]

function RankRing(props: { value: number; label: string; ring: string; text: string; fraction: number; tooltip: string }) {
  const size = 84
  const stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = () => `${Math.max(0, Math.min(1, props.fraction)) * circ} ${circ}`
  return (
    <div title={props.tooltip} style={{ position: 'relative', width: `${size}px`, height: `${size}px`, 'flex-shrink': '0' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={props.ring} stroke-width={stroke} opacity={0.2} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={props.ring} stroke-width={stroke} stroke-linecap="round" stroke-dasharray={dash()} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', color: props.text }}>
        <div style={{ 'font-size': '26px', 'font-weight': 700, 'line-height': '1' }}>{props.value}</div>
        <div style={{ 'font-size': '10px', 'font-weight': 300, 'letter-spacing': '0.5px' }}>{props.label}</div>
      </div>
    </div>
  )
}

function StatTile(props: { l1: string; l2: string; color: string; value: number | undefined }) {
  return (
    <div style={{ flex: 1, 'min-width': '0', background: '#222', 'border-radius': '4px', padding: '15px 8px 12px', 'box-shadow': '0 2px 2px rgba(0,0,0,0.2)', 'text-align': 'center' }}>
      <div style={{ color: '#999', 'font-size': '11px', 'text-transform': 'uppercase', 'line-height': '1.3' }}>
        {props.l1}<br />{props.l2}
      </div>
      <div style={{ color: props.color, 'font-size': '30px', 'font-weight': 300, 'margin-top': '8px' }}>{formatStat(props.value)}</div>
    </div>
  )
}

export function Overview() {
  const [totals, setTotals] = createSignal<ApiUserOverviewTotals | null>(null)

  onMount(() => {
    const c = client()
    if (!c) return
    let timer: ReturnType<typeof setInterval> | null = null

    const fetchOverview = () =>
      c.http.user.overview(STAT_INTERVAL, 'energyHarvested').then((res) => setTotals(res.totals ?? null))

    // Only start the poll after the first fetch succeeds: on servers that don't
    // implement /api/user/overview the request errors (and surfaces a toast), so
    // we render zeros and avoid repeating it — and the toast — every minute.
    void fetchOverview()
      .then(() => {
        timer = setInterval(() => {
          void c.stores.user.refreshMe().catch(() => {})
          void fetchOverview().catch(() => {})
        }, REFRESH_MS)
      })
      .catch(() => {})

    onCleanup(() => {
      if (timer) clearInterval(timer)
    })
  })

  const gclProg = (): LevelProgress => gclProgress(userInfo()?.gcl ?? 0)
  const gplProg = (): LevelProgress => gplProgress(userInfo()?.power ?? 0)
  const fraction = (p: LevelProgress) => (p.total > 0 ? p.current / p.total : 0)
  const tooltip = (p: LevelProgress) => `Next level: ${Math.floor(p.current).toLocaleString()} / ${Math.floor(p.total).toLocaleString()}`

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'linear-gradient(#222, #111)', color: '#ccc', 'font-family': 'Roboto, system-ui, sans-serif' }}>
      <div style={{ 'max-width': '900px', margin: '0 auto', padding: '30px 10px 40px' }}>
        {/* Header */}
        <div style={{ display: 'flex', 'align-items': 'center', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', 'border-radius': '4px', 'margin-bottom': '20px' }}>
          <h1 style={{ margin: 0, flex: 1, 'font-size': '28px', 'font-weight': 400, color: '#ffd180' }}>Overview</h1>
          <button
            onClick={goToGame}
            title="Back to the world"
            style={{ display: 'flex', 'align-items': 'center', gap: '4px', padding: '7px 12px', 'border-radius': '4px', border: '1px solid #30363d', background: '#21262d', color: '#c9d1d9', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} /> World
          </button>
        </div>

        {/* GCL / GPL cards */}
        <div style={{ display: 'flex', gap: '20px', 'margin-bottom': '20px' }}>
          <div style={{ flex: 1, display: 'flex', 'align-items': 'center', gap: '15px', background: '#222', 'border-radius': '4px', padding: '15px', 'box-shadow': '0 2px 2px rgba(0,0,0,0.2)' }}>
            <RankRing value={gclProg().level} label="GCL" ring={GCL_RING} text={GCL_TEXT} fraction={fraction(gclProg())} tooltip={tooltip(gclProg())} />
            <div>
              <div style={{ 'font-size': '18px', color: GCL_TEXT, 'margin-bottom': '6px' }}>Global Control Level</div>
              {/* Vanilla labels this "Rooms" but renders the GCL level number; mirror it. */}
              <div style={{ color: '#999', 'font-size': '13px' }}>
                <span>Rooms: <strong style={{ color: '#ccc' }}>{gclProg().level}</strong></span>
                <span style={{ 'margin-left': '14px' }}>CPU: <strong style={{ color: '#ccc' }}>{userInfo()?.cpu ?? '—'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', 'align-items': 'center', gap: '15px', background: '#222', 'border-radius': '4px', padding: '15px', 'box-shadow': '0 2px 2px rgba(0,0,0,0.2)' }}>
            <RankRing value={gplProg().level} label="GPL" ring={GPL_RING} text={GPL_TEXT} fraction={fraction(gplProg())} tooltip={tooltip(gplProg())} />
            <div>
              <div style={{ 'font-size': '18px', color: GPL_TEXT, 'margin-bottom': '8px' }}>Global Power Level</div>
              <button
                disabled
                title="Not available yet"
                style={{ padding: '5px 10px', 'border-radius': '4px', border: `1px solid ${GPL_RING}`, background: 'transparent', color: '#ffb7ba', 'font-size': '11px', cursor: 'default', opacity: 0.6 }}
              >
                Manage Power Creeps
              </button>
            </div>
          </div>
        </div>

        {/* Lifetime stat tiles */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <For each={STAT_TILES}>
            {(t) => <StatTile l1={t.l1} l2={t.l2} color={t.color} value={totals()?.[t.key]} />}
          </For>
        </div>
      </div>
    </div>
  )
}
