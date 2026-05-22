import { createSimpleStore } from './createStore'
import { useCabinetStore } from './useCabinetStore'
import { useAppStore } from './useAppStore'
import { buildZones } from '../core/zone/zone-engine'
import { createPanelOnZoneEdge, splitZoneByCount, movePanelByDelta } from '../core/panel/panel-engine'

const store = createSimpleStore({
  panels: [],
  zones: [],
  hover: null,
  snapPreview: null,
  selectedPanelId: null,
  drag: {
    active: false,
    panelId: null,
    startLocal: null,
    originalPanel: null
  }
}, (state) => ({
  rebuildZones() {
    const cabinet = useCabinetStore()
    state.zones = buildZones(cabinet.cabinetRect2D(), state.panels)
  },
  setHover(hit) {
    state.hover = hit
  },
  //=================
  setSnapPreview(snapPreview) {
    state.snapPreview = snapPreview
  }, // End setSnapPreview

  //=================
  clearSnapPreview() {
    state.snapPreview = null
  }, // End clearSnapPreview
  selectPanel(panelId) {
    state.selectedPanelId = panelId
  },
  clearSelection() {
    state.selectedPanelId = null
  },
  addPanelFromHover() {
    if (!state.hover || state.hover.type !== 'zone-edge') return null
    const cabinet = useCabinetStore()
    const panel = createPanelOnZoneEdge(state.hover.zone, state.hover.edge, cabinet.state.panelThickness)
    state.panels.push(panel)
    state.selectedPanelId = panel.id
    this.rebuildZones()
    useAppStore().setStatus(`Đã tạo tấm ${panel.name}`)
    return panel
  },
  splitHoveredZone(count) {
    if (!state.hover || state.hover.type !== 'zone-edge') return []
    const cabinet = useCabinetStore()
    const panels = splitZoneByCount(state.hover.zone, count, cabinet.state.panelThickness)
    state.panels.push(...panels)
    if (panels[0]) state.selectedPanelId = panels[0].id
    this.rebuildZones()
    useAppStore().setStatus(`Đã chia zone /${count}`)
    return panels
  },
  deleteSelected() {
    if (!state.selectedPanelId) return
    state.panels = state.panels.filter((panel) => panel.id !== state.selectedPanelId)
    state.selectedPanelId = null
    this.rebuildZones()
    useAppStore().setStatus('Đã xóa tấm đang chọn')
  },
  startMove(panelId, localPoint) {
    const panel = state.panels.find((item) => item.id === panelId)
    if (!panel) return
    state.drag.active = true
    state.drag.panelId = panelId
    state.drag.startLocal = { ...localPoint }
    state.drag.originalPanel = { ...panel }
    state.selectedPanelId = panelId
  },
  updateMove(localPoint, lockAxis = false) {
    if (!state.drag.active || !state.drag.originalPanel || !state.drag.startLocal) return
    const dx = localPoint.x - state.drag.startLocal.x
    const dy = localPoint.y - state.drag.startLocal.y
    const moved = movePanelByDelta(state.drag.originalPanel, dx, dy, lockAxis)
    const index = state.panels.findIndex((panel) => panel.id === state.drag.panelId)
    if (index >= 0) state.panels[index] = moved
    this.rebuildZones()
  },
  endMove() {
    state.drag.active = false
    state.drag.panelId = null
    state.drag.startLocal = null
    state.drag.originalPanel = null
  },
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
  }
}))

export function useDrawingStore() {
  return store
}
