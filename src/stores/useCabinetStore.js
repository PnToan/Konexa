import { createSimpleStore } from './createStore'
import { useAppStore } from './useAppStore'
import { getCabinetViewRect, getCabinetViewSize } from '../core/view/view-engine'

function normalizePositiveNumber(value, fallback = 1) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  if (numberValue <= 0) {
    return fallback
  }

  return numberValue
}

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

  cabinetRect2D(viewKey = null) {
    const app = useAppStore()
    const activeView = viewKey || app.state.currentView

    return getCabinetViewRect(state, activeView)
  },

  cabinetViewSize(viewKey = null) {
    const app = useAppStore()
    const activeView = viewKey || app.state.currentView

    return getCabinetViewSize(state, activeView)
  }
}))

export function useCabinetStore() {
  return store
}