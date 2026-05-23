import { createSimpleStore } from './createStore'
import { useCabinetStore } from './useCabinetStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { buildZones } from '../core/zone/zone-engine'
import {
  createPanelOnZoneEdge,
  createPanelPreview,
  createSplitPreview,
  splitZoneByCount,
  movePanelByDelta
} from '../core/panel/panel-engine'
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
  isPanelToolAllowed() {
    const app = useAppStore()

    return app.state.currentTool === 'panel' && app.state.currentView === 'front'
  }, // End isPanelToolAllowed

  //=================
  getPanelThickness() {
    const cabinet = useCabinetStore()

    return Number(cabinet.state.panelThickness || 18)
  }, // End getPanelThickness

  //=================
  rebuildZones() {
    const app = useAppStore()
    const box = useBoxStore()

    if (app.state.currentView !== 'front') {
      state.zones = []
      state.hover = null
      return
    }

    const allZones = []

    box.state.boxes.forEach((baseBox) => {
      const rect = projectBoxToCameraRect(baseBox, 'front')

      const baseRect = {
        ...rect,
        id: baseBox.id,
        name: baseBox.name,
        frameId: baseBox.id,
        linkedFrameId: baseBox.id,
        sourceBoxId: baseBox.id,
        baseObjectId: baseBox.id,
        depth: baseBox.depth,
        source: baseBox,
        sourceBox: baseBox,
        baseObject: baseBox
      }

      const panelsInBox = state.panels.filter((panel) => {
        return panel.linkedFrameId === baseBox.id ||
          panel.frameId === baseBox.id ||
          panel.sourceBoxId === baseBox.id ||
          panel.baseObjectId === baseBox.id
      })

      const zones = buildZones(baseRect, panelsInBox).map((zone) => ({
        ...zone,
        frameId: baseBox.id,
        linkedFrameId: baseBox.id,
        sourceBoxId: baseBox.id,
        baseObjectId: baseBox.id,
        depth: baseBox.depth,
        sourceBox: baseBox,
        baseObject: baseBox
      }))

      allZones.push(...zones)
    })

    state.zones = allZones
  }, // End rebuildZones

  //=================
  setHover(hit) {
    if (hit?.type === 'zone-edge' && !this.isPanelToolAllowed()) {
      state.hover = null
      return
    }

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
  getPanelPreviewItems() {
    if (!this.isPanelToolAllowed()) return []
    if (!state.hover || state.hover.type !== 'zone-edge') return []

    const input = this.getPanelInputMode()
    const thickness = this.getPanelThickness()

    if (input.mode === 'divide') {
      if (!input.value) return []

      return createSplitPreview(
        state.hover.zone,
        state.hover.edge,
        input.value,
        thickness,
        state.panels
      )
    }

    const panel = createPanelPreview(
      state.hover.zone,
      state.hover.edge,
      thickness,
      input.value,
      state.panels
    )

    return panel ? [panel] : []
  }, // End getPanelPreviewItems

  //=================
  addPanelFromHover() {
    if (!this.isPanelToolAllowed()) {
      useAppStore().setStatus('Vẽ Tấm chỉ hoạt động ở mặt Trước')
      return null
    }

    if (!state.hover || state.hover.type !== 'zone-edge') return null

    const input = this.getPanelInputMode()
    const thickness = this.getPanelThickness()

    if (input.mode === 'divide') {
      if (!input.value) return null

      const panels = splitZoneByCount(
        state.hover.zone,
        state.hover.edge,
        input.value,
        thickness,
        state.panels
      )

      state.panels.push(...panels)

      if (panels[0]) state.selectedPanelId = panels[0].id

      this.clearPanelInput()
      this.rebuildZones()
      useAppStore().setStatus(`Đã chia zone /${input.value}`)

      return panels[0] || null
    }

    const panel = createPanelOnZoneEdge(
      state.hover.zone,
      state.hover.edge,
      thickness,
      input.value,
      state.panels
    )

    if (!panel) return null

    state.panels.push(panel)
    state.selectedPanelId = panel.id

    this.clearPanelInput()
    this.rebuildZones()
    useAppStore().setStatus(`Đã tạo ${panel.name}`)

    return panel
  }, // End addPanelFromHover

  //=================
  splitHoveredZone(count) {
    if (!this.isPanelToolAllowed()) return []
    if (!state.hover || state.hover.type !== 'zone-edge') return []

    const panels = splitZoneByCount(
      state.hover.zone,
      state.hover.edge,
      count,
      this.getPanelThickness(),
      state.panels
    )

    state.panels.push(...panels)

    if (panels[0]) state.selectedPanelId = panels[0].id

    this.clearPanelInput()
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