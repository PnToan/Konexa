import { createSimpleStore } from './createStore'
import { useCabinetStore } from './useCabinetStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { buildZones } from '../core/zone/zone-engine'
import {
  createPanelOnZoneEdge,
  createPanelPreview,
  createSplitPreview,
  splitZoneByCount
} from '../core/panel/panel-engine'
import { projectBoxToCameraRect } from '../core/view/view-camera'
import {
  cancelMove,
  commitMoveToTarget,
  createMoveState,
  previewMoveToTarget,
  startMoveFromHover,
  updateMoveHover
} from '../core/tools/moveTool'

const store = createSimpleStore({
  panels: [],
  zones: [],
  hover: null,
  snapPreview: null,
  selectedPanelId: null,
  panelInputBuffer: '',
  move: createMoveState()
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
        return panel.linkedFrameId === baseBox.id
          || panel.frameId === baseBox.id
          || panel.sourceBoxId === baseBox.id
          || panel.baseObjectId === baseBox.id
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
  updatePanelsAfterBoxResize(oldBox, newBox) {
    if (!oldBox || !newBox || oldBox.id !== newBox.id) return

    const oldWidth = Number(oldBox.width || 0)
    const oldHeight = Number(oldBox.height || 0)
    const newWidth = Number(newBox.width || 0)
    const newHeight = Number(newBox.height || 0)

    if (oldWidth <= 0 || oldHeight <= 0 || newWidth <= 0 || newHeight <= 0) return

    const newX = Number(newBox.x || 0)
    const newZ = Number(newBox.z || 0)

    const panelsInBox = state.panels.filter((panel) => {
      return panel.linkedFrameId === newBox.id
        || panel.frameId === newBox.id
        || panel.sourceBoxId === newBox.id
        || panel.baseObjectId === newBox.id
    })

    const panelsOutsideBox = state.panels.filter((panel) => {
      return !(panel.linkedFrameId === newBox.id
        || panel.frameId === newBox.id
        || panel.sourceBoxId === newBox.id
        || panel.baseObjectId === newBox.id)
    })

    const nextPanelsInBox = []

    const baseRect = {
      x: newX,
      y: newZ,
      width: newWidth,
      height: newHeight,
      minX: newX,
      maxX: newX + newWidth,
      minY: newZ,
      maxY: newZ + newHeight,
      minZ: newZ,
      maxZ: newZ + newHeight,
      id: newBox.id,
      name: newBox.name,
      frameId: newBox.id,
      linkedFrameId: newBox.id,
      sourceBoxId: newBox.id,
      baseObjectId: newBox.id,
      depth: newBox.depth,
      source: newBox,
      sourceBox: newBox,
      baseObject: newBox
    }

    const getPanelEdge = (panel) => {
      if (panel.panelOffsetFrom === 'left' || panel.panelOffsetFrom === 'right' || panel.panelOffsetFrom === 'top' || panel.panelOffsetFrom === 'bottom') {
        return panel.panelOffsetFrom
      }

      if (panel.edge === 'left' || panel.edge === 'right' || panel.edge === 'top' || panel.edge === 'bottom') {
        return panel.edge
      }

      if (panel.panelSide === 'left' || panel.panelSide === 'right' || panel.panelSide === 'top' || panel.panelSide === 'bottom') {
        return panel.panelSide
      }

      if (panel.panelSide === 'split_vertical') return 'left'
      if (panel.panelSide === 'split_horizontal') return 'bottom'

      if (panel.orientation === 'vertical') return 'left'
      if (panel.orientation === 'horizontal') return 'bottom'

      return null
    }

    const getPanelThicknessValue = (panel) => {
      if (panel.orientation === 'vertical') {
        return Number(panel.panelThickness ?? panel.thickness ?? panel.xSize ?? panel.width ?? 18)
      }

      if (panel.orientation === 'horizontal') {
        return Number(panel.panelThickness ?? panel.thickness ?? panel.zSize ?? panel.height ?? 18)
      }

      return Number(panel.panelThickness ?? panel.thickness ?? 18)
    }

    const findZoneForOffsetPanel = (zones, edge, offset, oldPanel) => {
      if (!zones.length) return null

      const oldPanelX = Number(oldPanel.x3d ?? oldPanel.x ?? Number(oldBox.x || 0))
      const oldPanelZ = Number(oldPanel.z3d ?? oldPanel.z ?? oldPanel.y ?? Number(oldBox.z || 0))
      const oldPanelWidth = Number(oldPanel.xSize ?? oldPanel.width ?? 0)
      const oldPanelHeight = Number(oldPanel.zSize ?? oldPanel.height ?? 0)

      const oldCenterX = oldPanelX + (oldPanelWidth / 2)
      const oldCenterZ = oldPanelZ + (oldPanelHeight / 2)

      const ratioX = (oldCenterX - Number(oldBox.x || 0)) / oldWidth
      const ratioZ = (oldCenterZ - Number(oldBox.z || 0)) / oldHeight

      let targetX = newX + (ratioX * newWidth)
      let targetY = newZ + (ratioZ * newHeight)

      if (edge === 'left') {
        targetX = newX + offset
      } else if (edge === 'right') {
        targetX = newX + newWidth - offset
      } else if (edge === 'bottom') {
        targetY = newZ + offset
      } else if (edge === 'top') {
        targetY = newZ + newHeight - offset
      }

      return zones.find((zone) => {
        const minX = Number(zone.minX ?? zone.x ?? 0)
        const maxX = Number(zone.maxX ?? (minX + Number(zone.width || 0)))
        const minY = Number(zone.minY ?? zone.minZ ?? zone.y ?? 0)
        const maxY = Number(zone.maxY ?? zone.maxZ ?? (minY + Number(zone.height || 0)))

        return targetX >= minX - 0.001
          && targetX <= maxX + 0.001
          && targetY >= minY - 0.001
          && targetY <= maxY + 0.001
      }) || zones[0]
    }

    panelsInBox.forEach((oldPanel) => {
      const edge = getPanelEdge(oldPanel)
      if (!edge) return

      const thickness = getPanelThicknessValue(oldPanel)
      const isDividePanel = oldPanel.panelSide === 'split_vertical'
        || oldPanel.panelSide === 'split_horizontal'
        || Number(oldPanel.panelDivideCount || 0) >= 2

      const currentZones = buildZones(baseRect, nextPanelsInBox).map((zone) => ({
        ...zone,
        frameId: newBox.id,
        linkedFrameId: newBox.id,
        sourceBoxId: newBox.id,
        baseObjectId: newBox.id,
        depth: newBox.depth,
        sourceBox: newBox,
        baseObject: newBox
      }))

      if (!currentZones.length) return

      let targetZone = currentZones[0]
      let offset = Number(oldPanel.panelOffset ?? 0)

      if (!isDividePanel) {
        targetZone = findZoneForOffsetPanel(currentZones, edge, offset, oldPanel)
      } else {
        const oldPanelX = Number(oldPanel.x3d ?? oldPanel.x ?? newX)
        const oldPanelZ = Number(oldPanel.z3d ?? oldPanel.z ?? oldPanel.y ?? newZ)
        const oldPanelWidth = Number(oldPanel.xSize ?? oldPanel.width ?? 0)
        const oldPanelHeight = Number(oldPanel.zSize ?? oldPanel.height ?? 0)

        const oldCenterX = oldPanelX + (oldPanelWidth / 2)
        const oldCenterZ = oldPanelZ + (oldPanelHeight / 2)

        const ratioX = (oldCenterX - Number(oldBox.x || 0)) / oldWidth
        const ratioZ = (oldCenterZ - Number(oldBox.z || 0)) / oldHeight

        const nextCenterX = newX + (ratioX * newWidth)
        const nextCenterZ = newZ + (ratioZ * newHeight)

        targetZone = currentZones.find((zone) => {
          const minX = Number(zone.minX ?? zone.x ?? 0)
          const maxX = Number(zone.maxX ?? (minX + Number(zone.width || 0)))
          const minY = Number(zone.minY ?? zone.minZ ?? zone.y ?? 0)
          const maxY = Number(zone.maxY ?? zone.maxZ ?? (minY + Number(zone.height || 0)))

          return nextCenterX >= minX - 0.001
            && nextCenterX <= maxX + 0.001
            && nextCenterZ >= minY - 0.001
            && nextCenterZ <= maxY + 0.001
        }) || currentZones[0]

        if (edge === 'left') {
          offset = Math.max(0, nextCenterX - Number(targetZone.minX ?? targetZone.x ?? 0) - (thickness / 2))
        } else if (edge === 'right') {
          const zoneMaxX = Number(targetZone.maxX ?? ((targetZone.x || 0) + (targetZone.width || 0)))
          offset = Math.max(0, zoneMaxX - nextCenterX - (thickness / 2))
        } else if (edge === 'bottom') {
          offset = Math.max(0, nextCenterZ - Number(targetZone.minY ?? targetZone.minZ ?? targetZone.y ?? 0) - (thickness / 2))
        } else if (edge === 'top') {
          const zoneMaxY = Number(targetZone.maxY ?? targetZone.maxZ ?? ((targetZone.y || 0) + (targetZone.height || 0)))
          offset = Math.max(0, zoneMaxY - nextCenterZ - (thickness / 2))
        }
      }

      const nextPanel = createPanelOnZoneEdge(targetZone, edge, thickness, offset)
      if (!nextPanel) return

      nextPanelsInBox.push({
        ...oldPanel,
        ...nextPanel,
        id: oldPanel.id,
        name: oldPanel.name,
        zoneId: nextPanel.zoneId,
        panelBaseZone: nextPanel.panelBaseZone,
        linkedFrameId: newBox.id,
        frameId: newBox.id,
        sourceBoxId: newBox.id,
        baseObjectId: newBox.id,
        panelSide: oldPanel.panelSide || nextPanel.panelSide,
        panelDivideCount: oldPanel.panelDivideCount,
        panelOffsetFrom: oldPanel.panelOffsetFrom || nextPanel.panelOffsetFrom,
        panelOffset: offset,
        panelThickness: thickness,
        thickness,
        dimEnabled: oldPanel.dimEnabled ?? false
      })
    })

    state.panels = [
      ...panelsOutsideBox,
      ...nextPanelsInBox
    ]

    this.rebuildZones()
  }, // End updatePanelsAfterBoxResize
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
  resetMoveTool() {
    state.move = createMoveState()
    state.snapPreview = null
  }, // End resetMoveTool

  //=================
  updateMoveToolHover(localPoint, viewport, currentView = 'front') {
    const boxStore = useBoxStore()

    state.move = updateMoveHover(
      state.move,
      state.panels,
      boxStore.state.boxes,
      localPoint,
      viewport,
      currentView
    )

    state.snapPreview = null
  }, // End updateMoveToolHover

  //=================
  startCadMoveFromHover(localPoint, viewport, currentView = 'front') {
    const boxStore = useBoxStore()

    state.move = startMoveFromHover(
      state.move,
      state.panels,
      boxStore.state.boxes,
      localPoint,
      viewport,
      currentView
    )

    if (!state.move.active || !state.move.targetId) {
      useAppStore().setStatus('Move: hãy chọn đúng điểm snap')
      return null
    }

    // Quan trọng:
    // Không select panel / box ở click lần 1.
    // Chỉ commit xong mới select object vừa move.
    state.snapPreview = null
    useAppStore().setStatus('Move: đã chọn điểm gốc, rê chuột để di chuyển')

    return {
      type: state.move.targetType,
      id: state.move.targetId
    }
  }, // End startCadMoveFromHover

  //=================
  previewCadMove(localPoint, viewport, lockAxis = false, currentView = 'front') {
    const boxStore = useBoxStore()

    state.move = previewMoveToTarget(
      state.move,
      state.panels,
      boxStore.state.boxes,
      localPoint,
      viewport,
      lockAxis,
      currentView
    )

    // Không dùng snapPreview chung trong Move.
    // Move đã có moveTargetSnap riêng để renderer vẽ.
    state.snapPreview = null

    return state.move.previewTarget || null
  }, // End previewCadMove

  //=================
  commitCadMove(localPoint, viewport, lockAxis = false, currentView = 'front') {
    const boxStore = useBoxStore()

    const result = commitMoveToTarget(
      state.move,
      state.panels,
      boxStore.state.boxes,
      localPoint,
      viewport,
      lockAxis,
      currentView
    )

    state.move = result.moveState
    state.panels = result.panels
    boxStore.setBoxes(result.boxes)
    state.snapPreview = null

    if (result.movedTarget?.type === 'panel') {
      state.selectedPanelId = result.movedTarget.id
      boxStore.clearSelection()
      this.rebuildZones()
      useAppStore().setStatus('Đã di chuyển tấm')
    }

    if (result.movedTarget?.type === 'box') {
      state.selectedPanelId = null
      boxStore.selectBox(result.movedTarget.id)
      useAppStore().setStatus('Đã di chuyển Box')
    }

    return result.movedTarget
  }, // End commitCadMove

  //=================
  cancelCadMove() {
    state.move = cancelMove()
    state.snapPreview = null
    useAppStore().setStatus('Đã hủy Move')
  }, // End cancelCadMove

  //=================
  getMovePreviewTarget() {
    if (!state.move.active) return null
    if (state.move.phase !== 'pick-target') return null
    if (!state.move.previewTarget) return null

    return {
      type: state.move.targetType,
      target: state.move.previewTarget
    }
  }, // End getMovePreviewTarget

  //=================
  getMoveHoverSnapPoints() {
    if (!state.move) return []

    return state.move.hoverSnapPoints || []
  }, // End getMoveHoverSnapPoints
  //=================
  getMoveCursorLocal() {
    if (!state.move) return null

    return state.move.cursorLocal || null
  }, // End getMoveCursorLocal

  //=================
  getMoveTargetSnap() {
    if (!state.move) return null
    if (!state.move.active) return null
    if (state.move.phase !== 'pick-target') return null

    return state.move.targetSnap || null
  }, // End getMoveTargetSnap
  //=================
  isCadMovePickingTarget() {
    return state.move?.active === true && state.move?.phase === 'pick-target'
  } // End isCadMovePickingTarget
}))

//=================
export function useDrawingStore() {
  return store
} // End useDrawingStore