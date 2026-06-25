import { createSignal, onCleanup, onMount, For, Show } from 'solid-js'
import { perf, type PerfSnapshot } from '~/debug/perf.js'

const REFRESH_MS = 250

// On-screen overlay for the perf harness. Polls perf.snapshot() a few times a
// second and renders FPS, frame-time percentiles, and every recorded sample
// series. Hidden unless the harness is enabled (?perf=1 / Alt+P / __perf).
export function PerfHud() {
  const [snap, setSnap] = createSignal<PerfSnapshot>(perf.snapshot())
  const refresh = () => setSnap(perf.snapshot())

  onMount(() => {
    const timer = window.setInterval(refresh, REFRESH_MS)
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        perf.toggle()
        refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    const off = perf.onChange(refresh)
    onCleanup(() => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', onKey)
      off()
    })
  })

  const n1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1)
  const n0 = (v: number) => Math.round(v).toString()
  // Adaptive: keep precision for sub-unit values (ms, fractions like
  // stateDirty), round cleanly for large counts.
  const fmtVal = (v: number) => {
    const a = Math.abs(v)
    if (a === 0) return '0'
    if (a < 1) return v.toFixed(3)
    if (a < 10) return v.toFixed(2)
    return Math.round(v).toString()
  }

  const panel: Record<string, string> = {
    position: 'fixed',
    top: '8px',
    right: '8px',
    'z-index': '9999',
    'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
    'font-size': '11px',
    'line-height': '1.45',
    color: '#e6edf3',
    background: 'rgba(13, 17, 23, 0.85)',
    border: '1px solid #30363d',
    'border-radius': '6px',
    padding: '6px 8px',
    'min-width': '210px',
    'pointer-events': 'auto',
    'user-select': 'none',
  }
  const row: Record<string, string> = { display: 'flex', 'justify-content': 'space-between', gap: '12px' }
  const dim: Record<string, string> = { color: '#8b949e' }

  return (
    <Show when={snap().enabled}>
      <div style={panel}>
        <div style={{ ...row, 'margin-bottom': '4px' }}>
          <strong>perf</strong>
          <span style={dim}>Alt+P</span>
        </div>

        <div style={row}>
          <span>fps</span>
          <span>{n1(snap().fps)}</span>
        </div>
        <div style={row}>
          <span style={dim}>frame ms p50/95/99</span>
          <span>
            {n1(snap().frame.p50)}/{n1(snap().frame.p95)}/{n1(snap().frame.p99)}
          </span>
        </div>

        <For each={Object.entries(snap().series)}>
          {([name, s]) => (
            <div style={row} title={`min ${fmtVal(s.min)} · max ${fmtVal(s.max)} · n ${s.n}`}>
              <span style={dim}>{name}</span>
              <span>
                {fmtVal(s.last)} <span style={dim}>(avg {fmtVal(s.avg)})</span>
              </span>
            </div>
          )}
        </For>

        <div style={{ ...row, 'margin-top': '4px' }}>
          <button
            type="button"
            onClick={() => {
              perf.reset()
              refresh()
            }}
            style={{
              flex: '1',
              cursor: 'pointer',
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              'border-radius': '4px',
              padding: '2px 0',
              font: 'inherit',
            }}
          >
            reset
          </button>
        </div>
      </div>
    </Show>
  )
}
