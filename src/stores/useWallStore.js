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
  //=================
  setSize(key, value) {
    if (!['width', 'depth', 'height'].includes(key)) return

    state[key] = normalizePositiveNumber(value, state[key] || 1)
  }, // End setSize

  //=================
  setPosition(axis, value) {
    if (!['x', 'y', 'z'].includes(axis)) return

    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) return

    state[axis] = numberValue
  }, // End setPosition

  //=================
  setEditingDim(dimKey) {
    state.editingDim = dimKey
  }, // End setEditingDim

  //=================
  clearEditingDim() {
    state.editingDim = null
  }, // End clearEditingDim

  //=================
  getBox3D() {
    return {
      id: 'wall_main',
      x: state.x,
      y: state.y,
      z: state.z,
      width: state.width,
      depth: state.depth,
      height: state.height
    }
  } // End getBox3D
}))

export function useWallStore() {
  return store
}