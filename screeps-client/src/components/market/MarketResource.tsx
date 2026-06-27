import { createSignal, createEffect, createMemo, For, Show, type JSX } from 'solid-js'
import { ChevronLeft, RefreshCw } from 'lucide-solid'
import type { ApiMarketOrder, ApiMarketStat } from 'screeps-connectivity'
import { client } from '~/stores/clientStore.js'
import { goToMarket, goToRoom } from '~/stores/routeStore.js'
import { parseRoomName } from '~/utils/roomName.js'
import { resourceDisplayName } from '~/data/resources.js'
import { ResourceSwatch } from './ResourceSwatch.js'
import { PANEL, BORDER, TEXT, MUTED, ACCENT, fmtAmount, fmtPrice } from './theme.js'

type Row = ApiMarketOrder & { range?: number }
type Sort = `${'+' | '-'}${string}`

// Chebyshev room distance — the market's notion of "range" for shipping cost.
// Matches vanilla: invalid target rooms yield 0.
function roomDistance(a: string | undefined, target: string): number | undefined {
  if (!a) return undefined
  const pa = parseRoomName(a)
  const pb = parseRoomName(target)
  if (!pa || !pb) return undefined
  return Math.max(Math.abs(pa.x - pb.x), Math.abs(pa.y - pb.y))
}

function sortRows(rows: Row[], sort: Sort): Row[] {
  const desc = sort[0] === '-'
  const key = sort.slice(1) as keyof Row
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    let cmp: number
    if (typeof av === 'number' || typeof bv === 'number') cmp = (Number(av) || 0) - (Number(bv) || 0)
    else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
    return desc ? -cmp : cmp
  })
}

// A single resource's order book: sell and buy tables plus recent price history.
// Token (the CPU-subscription item) is roomless, so its room/range columns and the
// target-room control are hidden, matching vanilla.
export function MarketResource(props: { resourceType: string | null; shard: string | null }) {
  const [sell, setSell] = createSignal<ApiMarketOrder[]>([])
  const [buy, setBuy] = createSignal<ApiMarketOrder[]>([])
  const [stats, setStats] = createSignal<ApiMarketStat[]>([])
  const [targetRoom, setTargetRoom] = createSignal('')
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  const isToken = () => props.resourceType === 'token'

  const load = (): void => {
    const c = client()
    const rt = props.resourceType
    if (!c || !rt) return
    setLoading(true)
    Promise.all([c.http.game.market.orders(rt, props.shard), c.http.game.market.stats(rt, props.shard)])
      .then(([ordersRes, statsRes]) => {
        const list = ordersRes.list ?? []
        setSell(list.filter((o) => o.type === 'sell'))
        setBuy(list.filter((o) => o.type === 'buy'))
        setStats(statsRes.stats ?? [])
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }

  createEffect(() => {
    // Re-read on resource or shard change.
    void props.resourceType
    void props.shard
    load()
  })

  // Annotate orders with range relative to the chosen target room (when valid).
  const withRange = (orders: ApiMarketOrder[]): Row[] => {
    const target = targetRoom().trim().toUpperCase()
    const valid = /^[WE]\d+[NS]\d+$/.test(target)
    return orders.map((o) => ({ ...o, range: valid ? roomDistance(o.roomName, target) : undefined }))
  }

  const sellRows = createMemo(() => withRange(sell()))
  const buyRows = createMemo(() => withRange(buy()))

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '16px' }}>
        <button
          onClick={() => goToMarket(props.shard)}
          style={{ display: 'flex', 'align-items': 'center', gap: '4px', padding: '6px 10px', 'border-radius': '4px', border: `1px solid ${BORDER}`, background: '#21262d', color: TEXT, cursor: 'pointer' }}
        >
          <ChevronLeft size={14} /> Resources
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={load}
          title="Refresh"
          style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '6px 10px', 'border-radius': '4px', border: `1px solid ${BORDER}`, background: '#21262d', color: TEXT, cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Resource header */}
      <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'margin-bottom': '16px' }}>
        <ResourceSwatch resourceType={props.resourceType ?? ''} size={26} />
        <h2 style={{ margin: 0, 'font-size': '20px', 'font-weight': 600, color: TEXT }}>{resourceDisplayName(props.resourceType ?? '')}</h2>
      </div>

      <Show when={isToken()}>
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, 'border-radius': '6px', padding: '10px 14px', 'margin-bottom': '16px', color: MUTED, 'font-size': '13px' }}>
          A special item that activates 60 days of CPU subscription for its owner.
        </div>
      </Show>

      <Show
        when={!error()}
        fallback={
          <div style={{ background: PANEL, border: `1px solid ${BORDER}`, 'border-radius': '8px', padding: '32px', 'text-align': 'center', color: MUTED }}>
            Couldn't load orders for this resource.
          </div>
        }
      >
        <Show when={!isToken()}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'margin-bottom': '16px' }}>
            <label style={{ color: MUTED, 'font-size': '13px' }}>Target room</label>
            <input
              value={targetRoom()}
              onInput={(e) => setTargetRoom(e.currentTarget.value)}
              placeholder="e.g. W1N1"
              style={{ padding: '6px 8px', 'border-radius': '4px', border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, width: '120px' }}
            />
            <span style={{ color: MUTED, 'font-size': '12px' }}>shows shipping range to each order's room</span>
          </div>
        </Show>

        <div style={{ opacity: loading() ? 0.6 : 1 }}>
          <OrderBook title="Selling" rows={sellRows()} defaultSort="+price" showRoom={!isToken()} shard={props.shard} />
          <OrderBook title="Buying" rows={buyRows()} defaultSort="-price" showRoom={!isToken()} shard={props.shard} />
          <PriceHistory stats={stats()} />
        </div>
      </Show>
    </div>
  )
}

function OrderBook(props: { title: string; rows: Row[]; defaultSort: Sort; showRoom: boolean; shard: string | null }) {
  const [sort, setSort] = createSignal<Sort>(props.defaultSort)
  const sorted = createMemo(() => sortRows(props.rows, sort()))
  const toggle = (key: string): void => { setSort((s) => (s === `+${key}` ? `-${key}` : `+${key}`)) }

  return (
    <div style={{ 'margin-bottom': '28px' }}>
      <div style={{ 'font-size': '13px', color: MUTED, 'text-transform': 'uppercase', 'margin-bottom': '8px' }}>{props.title}</div>
      <Show
        when={props.rows.length}
        fallback={<div style={{ color: MUTED, 'font-size': '13px', padding: '12px 0' }}>No orders</div>}
      >
        <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '13px' }}>
          <thead>
            <tr style={{ color: MUTED, 'text-align': 'right' }}>
              <Th label="Order ID" col="_id" sort={sort()} onClick={toggle} align="left" />
              <Th label="Price" col="price" sort={sort()} onClick={toggle} />
              <Th label="Available" col="amount" sort={sort()} onClick={toggle} />
              <Th label="Remaining" col="remainingAmount" sort={sort()} onClick={toggle} />
              <Show when={props.showRoom}>
                <Th label="Room" col="roomName" sort={sort()} onClick={toggle} />
                <Th label="Range" col="range" sort={sort()} onClick={toggle} />
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={sorted()}>
              {(o) => (
                <tr style={{ 'border-top': `1px solid ${BORDER}`, 'text-align': 'right' }}>
                  <td style={{ 'text-align': 'left', color: MUTED, 'font-family': 'monospace', padding: '6px 8px 6px 0' }}>{o._id}</td>
                  <td style={{ color: TEXT, padding: '6px 0' }}>{fmtPrice(o.price)}</td>
                  <td style={{ color: TEXT, padding: '6px 0' }}>{fmtAmount(o.amount)}</td>
                  <td style={{ color: MUTED, padding: '6px 0' }}>{fmtAmount(o.remainingAmount)}</td>
                  <Show when={props.showRoom}>
                    <td style={{ padding: '6px 0' }}>
                      <Show when={o.roomName} fallback={<span style={{ color: MUTED }}>—</span>}>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); goToRoom(o.roomName!, props.shard) }}
                          style={{ color: ACCENT, 'text-decoration': 'none' }}
                        >
                          {o.roomName}
                        </a>
                      </Show>
                    </td>
                    <td style={{ color: MUTED, padding: '6px 0' }}>{o.range ?? '—'}</td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  )
}

function Th(props: { label: string; col: string; sort: Sort; onClick: (col: string) => void; align?: 'left' | 'right' }): JSX.Element {
  const caret = () => (props.sort === `+${props.col}` ? ' ▲' : props.sort === `-${props.col}` ? ' ▼' : '')
  return (
    <th
      onClick={() => props.onClick(props.col)}
      style={{ 'text-align': props.align ?? 'right', 'font-weight': 400, cursor: 'pointer', padding: '0 0 6px', 'user-select': 'none', 'white-space': 'nowrap' }}
    >
      {props.label}{caret()}
    </th>
  )
}

function PriceHistory(props: { stats: ApiMarketStat[] }) {
  return (
    <div>
      <div style={{ 'font-size': '13px', color: MUTED, 'text-transform': 'uppercase', 'margin-bottom': '8px' }}>Price history</div>
      <Show when={props.stats.length} fallback={<div style={{ color: MUTED, 'font-size': '13px' }}>No history</div>}>
        <table style={{ width: '100%', 'border-collapse': 'collapse', 'font-size': '13px' }}>
          <thead>
            <tr style={{ color: MUTED, 'text-align': 'right' }}>
              <th style={{ 'text-align': 'left', 'font-weight': 400, padding: '0 0 6px' }}>Date</th>
              <th style={{ 'font-weight': 400, padding: '0 0 6px' }}>Transactions</th>
              <th style={{ 'font-weight': 400, padding: '0 0 6px' }}>Total volume</th>
              <th style={{ 'font-weight': 400, padding: '0 0 6px' }}>Price (avg ± stddev)</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.stats}>
              {(s) => (
                <tr style={{ 'border-top': `1px solid ${BORDER}`, 'text-align': 'right' }}>
                  <td style={{ 'text-align': 'left', color: MUTED, padding: '6px 0' }}>{s.date}</td>
                  <td style={{ color: TEXT, padding: '6px 0' }}>{fmtAmount(s.transactions)}</td>
                  <td style={{ color: TEXT, padding: '6px 0' }}>{fmtAmount(s.volume)}</td>
                  <td style={{ color: TEXT, padding: '6px 0' }}>
                    {fmtPrice(s.avgPrice)} <span style={{ color: MUTED }}>± {fmtPrice(s.stddevPrice)}</span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  )
}
