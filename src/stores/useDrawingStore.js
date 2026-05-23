import { createSimpleStore } from './createStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { buildZones } from '../core/zone/zone-engine'
import { createPanelOnZoneEdge, splitZoneByCount, movePanelByDelta } from '../core/panel/panel-engine'
import { projectBoxToCameraRect } from '../core/view/view-camera'

const store = createSimpleStore({
  panels: [],
  zones: [],
  hover: null,
  snapPreview: null,
  selectedPanelId: null,
  panelInputBuffer: '',
  drag: {
    active: false,
    panelId: null,
    startLocal: null,
    originalPanel: null
  }
}, (state) => ({
  //=================
  rebuildZones() {
    const app = useAppStore()
    const box = useBoxStore()
    const currentView = app.state.currentView

    const allZones = []

    box.state.boxes.forEach((baseBox) => {
      const rect = projectBoxToCameraRect(baseBox, currentView)

      const baseRect = {
        ...rect,
        id: baseBox.id,
        name: baseBox.name,
        frameId: baseBox.id,
        linkedFrameId: baseBox.id,
        baseObjectId: baseBox.id,
        sourceBoxId: baseBox.id,
        depth: baseBox.depth,
        source: baseBox
      }

      const panelsInBox = state.panels.filter((panel) => {
        return panel.linkedFrameId === baseBox.id ||
          panel.sourceBoxId === baseBox.id ||
          panel.baseObjectId === baseBox.id
      })

      const zones = buildZones(baseRect, panelsInBox).map((zone) => ({
        ...zone,
        frameId: baseBox.id,
        linkedFrameId: baseBox.id,
        baseObjectId: baseBox.id,
        sourceBoxId: baseBox.id,
        baseObject: baseBox,
        depth: baseBox.depth
      }))

      allZones.push(...zones)
    })

    state.zones = allZones
  }, // End rebuildZones

  //=================
  setHover(hit) {
    state.hover = hit
  }, // End setHover

  //=================
  setSnapPreview(snapPreview) {
    state.snapPreview = snapPreview
  }, // End setSnapPreview

  //=================
  clearSnapPreview() {
    state.snapPreview = null
  }, // End clearSnapPreview

  //=================
  selectPanel(panelId) {
    state.selectedPanelId = panelId
  }, // End selectPanel

  //=================
  clearSelection() {
    state.selectedPanelId = null
  }, // End clearSelection

  //=================
  clearPanelInput() {
    state.panelInputBuffer = ''
  }, // End clearPanelInput

  //=================
  appendPanelInput(key) {
    if (key === '/') {
      if (state.panelInputBuffer.startsWith('/')) return
      state.panelInputBuffer = `/${state.panelInputBuffer}`
      return
    }

    if (/^[0-9]$/.test(key)) {
      state.panelInputBuffer += key
    }
  }, // End appendPanelInput

  //=================
  backspacePanelInput() {
    state.panelInputBuffer = state.panelInputBuffer.slice(0, -1)
  }, // End backspacePanelInput

  //=================
  getPanelInputMode() {
    const buffer = String(state.panelInputBuffer || '').trim()

    if (buffer === '') {
      return {
        mode: 'offset',
        value: 0
      }
    }

    if (buffer.startsWith('/')) {
      const count = Number(buffer.slice(1))

      return {
        mode: 'divide',
        value: Number.isInteger(count) && count >= 2 ? count : null
      }
    }

    const offset = Number(buffer)

    return {
      mode: 'offset',
      value: Number.isFinite(offset) && offset >= 0 ? offset : 0
    }
  }, // End getPanelInputMode

  //=================
  getPanelPreview() {
    if (!state.hover || state.hover.type !== 'zone-edge') return null

    const input = this.getPanelInputMode()

    if (input.mode !== 'offset') return null

    return createPanelOnZoneEdge(
      state.hover.zone,
      state.hover.edge,
      useBoxStore().state.panelThickness || 18,
      input.value
    )
  }, // End getPanelPreview

  //=================
  addPanelFromHover() {
    if (!state.hover || state.hover.type !== 'zone-edge') return null

    const input = this.getPanelInputMode()
    const thickness = 18

    if (input.mode === 'divide') {
      if (!input.value) return null

      const panels = splitZoneByCount(
        state.hover.zone,
        state.hover.edge,
        input.value,
        thickness
      )

      state.panels.push(...panels)

      if (panels[0]) state.selectedPanelId = panels[0].id

      state.panelInputBuffer = ''
      this.rebuildZones()
      useAppStore().setStatus(`Đã chia zone /${input.value}`)

      return panels[0] || null
    }

    const panel = createPanelOnZoneEdge(
      state.hover.zone,
      state.hover.edge,
      thickness,
      input.value
    )

    if (!panel) return null

    state.panels.push(panel)
    state.selectedPanelId = panel.id
    state.panelInputBuffer = ''

    this.rebuildZones()
    useAppStore().setStatus(`Đã tạo ${panel.name}`)

    return panel
  }, // End addPanelFromHover

  //=================
  splitHoveredZone(count) {
    if (!state.hover || state.hover.type !== 'zone-edge') return []

    const panels = splitZoneByCount(state.hover.zone, state.hover.edge, count, 18)

    state.panels.push(...panels)

    if (panels[0]) state.selectedPanelId = panels[0].id

    this.rebuildZones()
    useAppStore().setStatus(`Đã chia zone /${count}`)

    return panels
  }, // End splitHoveredZone

  //=================
  deleteSelected() {
    if (!state.selectedPanelId) return

    state.panels = state.panels.filter((panel) => panel.id !== state.selectedPanelId)
    state.selectedPanelId = null

    this.rebuildZones()
    useAppStore().setStatus('Đã xóa tấm đang chọn')
  }, // End deleteSelected

  //=================
  startMove(panelId, localPoint) {
    const panel = state.panels.find((item) => item.id === panelId)

    if (!panel) return

    state.drag.active = true
    state.drag.panelId = panelId
    state.drag.startLocal = { ...localPoint }
    state.drag.originalPanel = { ...panel }
    state.selectedPanelId = panelId
  }, // End startMove

  //=================
  updateMove(localPoint, lockAxis = false) {
    if (!state.drag.active || !state.drag.originalPanel || !state.drag.startLocal) return

    const dx = localPoint.x - state.drag.startLocal.x
    const dy = localPoint.y - state.drag.startLocal.y
    const moved = movePanelByDelta(state.drag.originalPanel, dx, dy, lockAxis)
    const index = state.panels.findIndex((panel) => panel.id === state.drag.panelId)

    if (index >= 0) state.panels[index] = moved

    this.rebuildZones()
  }, // End updateMove

  //=================
  endMove() {
    state.drag.active = false
    state.drag.panelId = null
    state.drag.startLocal = null
    state.drag.originalPanel = null
  }, // End endMove

  //=================
  moveSelectedByNumber(distance) {
    const id = state.selectedPanelId

    if (!id) return

    const index = state.panels.findIndex((panel) => panel.id === id)

    if (index < 0) return

    const panel = state.panels[index]
    const dx = panel.orientation === 'vertical' ? distance : 0
    const dy = panel.orientation === 'horizontal' ? distance : 0

    state.panels[index] = movePanelByDelta(panel, dx, dy, false)

    this.rebuildZones()
    useAppStore().setStatus(`Đã di chuyển ${distance}mm`)
  } // End moveSelectedByNumber
}))

//=================
export function useDrawingStore() {
  return store
} // End useDrawingStore