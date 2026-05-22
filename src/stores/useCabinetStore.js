import { createSimpleStore } from './createStore'
import { normalizePositiveNumber } from '../core/geometry/number-utils'

const store = createSimpleStore({
  width: 3000,
  depth: 580,
  height: 2650,
  panelThickness: 18,
  unit: 'mm'
}, (state) => ({
  setSize(key, value) {
    state[key] = normalizePositiveNumber(value, state[key] || 1)
  },
  setUnit(unit) {
    state.unit = unit
  },
  cabinetRect2D() {
    return { id: 'cabinet_frame', x: 0, y: 0, width: state.width, height: state.depth }
  }
}))

export function useCabinetStore() {
  return store
}
