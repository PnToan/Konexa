import { createSimpleStore } from './createStore'
import { normalizePositiveNumber } from '../core/geometry/number-utils'

const store = createSimpleStore({
  x: 100,
  y: 1000,
  z: 0,
  width: 3000,
  depth: 100,
  height: 2650,
  editingDim: null
}, (state) => ({
  setSize(key, value) {
    if (!['width', 'depth', 'height'].includes(key)) return
    state[key] = normalizePositiveNumber(value, state[key] || 1)
  },

  setEditingDim(dimKey) {
    state.editingDim = dimKey
  },

  clearEditingDim() {
    state.editingDim = null
  },

wallRect2D(viewKey = 'top') {
  if (viewKey === 'front') {
    return {
      id: 'wall_main',
      x: state.x,
      y: state.z,
      width: state.width,
      height: state.height
    }
  }

  if (viewKey === 'back') {
    return {
      id: 'wall_main',
      x: state.x,
      y: state.z,
      width: state.width,
      height: state.height
    }
  }

  if (viewKey === 'left') {
    return {
      id: 'wall_main',
      x: state.y,
      y: state.z,
      width: state.depth,
      height: state.height
    }
  }

  if (viewKey === 'right') {
    return {
      id: 'wall_main',
      x: state.y,
      y: state.z,
      width: state.depth,
      height: state.height
    }
  }

  return {
    id: 'wall_main',
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.depth
  }
}
}))

export function useWallStore() {
  return store
}