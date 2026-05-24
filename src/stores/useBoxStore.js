import { createSimpleStore } from './createStore'
import { normalizePositiveNumber } from '../core/geometry/number-utils'

let boxIdSeed = 1

//=================
function buildRectFromPoints(start, end) {
  if (!start || !end) return null

  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const depth = Math.abs(end.y - start.y)

  return {
    x,
    y,
    width,
    depth
  }
} // End buildRectFromPoints

//=================
function createBoxFromRect(rect, height) {
  if (!rect) return null
  if (rect.width <= 1 || rect.depth <= 1) return null

  const id = `box_${boxIdSeed++}`

  return {
    id,
    name: `Box ${boxIdSeed - 1}`,
    x: rect.x,
    y: rect.y,
    z: 0,
    width: rect.width,
    depth: rect.depth,
    height,
    color: 'rgba(0, 119, 204, 0.12)'
  }
} // End createBoxFromRect

const store = createSimpleStore({
  boxes: [],
  selectedBoxId: null,
  hoverDim: null,
  editingDim: null,
  draft: {
    active: false,
    start: null,
    end: null
  }
}, (state) => ({
  //=================
  startDraft(localPoint) {
    state.draft.active = true
    state.draft.start = { ...localPoint }
    state.draft.end = { ...localPoint }
  }, // End startDraft

  //=================
  updateDraft(localPoint) {
    if (!state.draft.active) return

    state.draft.end = { ...localPoint }
  }, // End updateDraft

  //=================
  clearDraft() {
    state.draft.active = false
    state.draft.start = null
    state.draft.end = null
  }, // End clearDraft

  //=================
  commitDraft(height) {
    const rect = buildRectFromPoints(state.draft.start, state.draft.end)
    const box = createBoxFromRect(rect, height)

    this.clearDraft()

    if (!box) return null

    state.boxes.push(box)
    state.selectedBoxId = box.id

    return box
  }, // End commitDraft

  //=================
  getDraftRect() {
    return buildRectFromPoints(state.draft.start, state.draft.end)
  }, // End getDraftRect

  //=================
  selectBox(boxId) {
    state.selectedBoxId = boxId
  }, // End selectBox

  //=================
  clearSelection() {
    state.selectedBoxId = null
  }, // End clearSelection

  //=================
  setEditingDim(dimKey) {
    state.editingDim = dimKey
  }, // End setEditingDim

  //=================
  clearEditingDim() {
    state.editingDim = null
  }, // End clearEditingDim

//=================
setBoxSize(boxId, key, value, wallBox = null) {
  if (!['width', 'depth', 'height'].includes(key)) return

  const box = state.boxes.find((item) => item.id === boxId)
  if (!box) return

  const nextValue = normalizePositiveNumber(value, box[key] || 1)

  if (key === 'depth') {
    const backY = box.y + box.depth
    const wallMinY = wallBox ? wallBox.y : -Infinity

    const maxDepth = backY - wallMinY
    const nextDepth = Math.min(nextValue, Math.max(1, maxDepth))

    box.y = backY - nextDepth
    box.depth = nextDepth
    return
  }

  box[key] = nextValue
}, // End setBoxSize

  //=================
  getSelectedBox() {
    return state.boxes.find((item) => item.id === state.selectedBoxId) || null
  } // End getSelectedBox
}))

//=================
export function useBoxStore() {
  return store
} // End useBoxStore