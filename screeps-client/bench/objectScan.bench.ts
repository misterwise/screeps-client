// Benchmarks the Tier-1 reactivity finding: the RoomViewer effect re-runs every
// tick and scans ALL room objects to find the handful with an actionLog. Because
// objectState() is replaced wholesale, a diff-driven scan (only the changed ids)
// would do the same useful work over a fraction of the objects.
import { bench, describe } from 'vitest'
import { makeScanScenario, processObjectActionLog } from './lib/synth.js'

// [total objects, objects actually acting this tick]
const SCENARIOS: Array<[number, number]> = [
  [200, 10],
  [800, 20],
  [1500, 30],
]

for (const [total, acting] of SCENARIOS) {
  const { objs, changedIds } = makeScanScenario(total, acting)

  describe(`per-tick actionLog scan — ${total} objects, ${acting} acting`, () => {
    bench('current: scan ALL objects', () => {
      let n = 0
      for (const id in objs) {
        const o = objs[id]
        if (o) n += processObjectActionLog(o)
      }
      if (n < 0) throw new Error('unreachable')
    })
    bench('proposed: scan changed (diff) ids only', () => {
      let n = 0
      for (const id of changedIds) {
        const o = objs[id]
        if (o) n += processObjectActionLog(o)
      }
      if (n < 0) throw new Error('unreachable')
    })
  })
}
