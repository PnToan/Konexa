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
import { getCameraConfig, projectBoxToCameraRect } from '../core/view/view-camera'
import {
  cancelMove,
  commitMoveToTarget,
  createMoveState,
  previewMoveToTarget,
  startMoveFromHover,
  updateMoveHover
} from '../core/tools/moveTool'

let dimensionIdSeed = 1

//=================
function cloneDimensionPoint(point) {
  if (!point) return null

  return {
    x: Number(point.x || 0),
    y: Number(point.y || 0)
  }
} // End cloneDimensionPoint

//=================
function getDimensionDistance(start, end) {
  if (!start || !end) return 0

  const dx = Number(end.x || 0) - Number(start.x || 0)
  const dy = Number(end.y || 0) - Number(start.y || 0)

  return Math.sqrt(dx * dx + dy * dy)
} // End getDimensionDistance

//=================
function getDimensionAxis(start, end) {
  if (!start || !end) return 'horizontal'

  return Math.abs(Number(end.x || 0) - Number(start.x || 0)) >= Math.abs(Number(end.y || 0) - Number(start.y || 0))
    ? 'horizontal'
    : 'vertical'
} // End getDimensionAxis


//=================
function toNumber(value, fallback = 0) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toNumber

//=================
function getPanelFrameId(panel) {
  return panel?.linkedFrameId || panel?.frameId || panel?.sourceBoxId || panel?.baseObjectId || null
} // End getPanelFrameId

//=================
function getPanelAxisMin(panel, axis) {
  if (axis === 'x') return toNumber(panel.x3d ?? panel.x, 0)
  if (axis === 'y') return toNumber(panel.y3d ?? panel.worldY ?? panel.depthY ?? panel.y, 0)
  if (axis === 'z') return toNumber(panel.z3d ?? panel.z ?? panel.y, 0)

  return 0
} // End getPanelAxisMin

//=================
function getPanelAxisSize(panel, axis) {
  if (axis === 'x') return toNumber(panel.xSize ?? panel.width, 0)
  if (axis === 'y') return toNumber(panel.ySize ?? panel.depth, 0)
  if (axis === 'z') return toNumber(panel.zSize ?? panel.height ?? panel.thickness, 0)

  return 0
} // End getPanelAxisSize

//=================
function projectPanelAxisValue(value, size, reverse) {
  if (reverse) return -(value + size)

  return value
} // End projectPanelAxisValue

//=================
function getPanelViewRect(panel, currentView = 'front') {
  if (!panel) return null

  const camera = getCameraConfig(currentView)
  const uMin = getPanelAxisMin(panel, camera.axisU)
  const vMin = getPanelAxisMin(panel, camera.axisV)
  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)

  if (uSize <= 0 || vSize <= 0) return null

  return {
    x: projectPanelAxisValue(uMin, uSize, camera.reverseU),
    y: projectPanelAxisValue(vMin, vSize, camera.reverseV),
    width: uSize,
    height: vSize
  }
} // End getPanelViewRect

//=================
function getRectPointBySnapKey(rect, snapKey) {
  if (!rect) return null

  const left = toNumber(rect.x, 0)
  const right = left + toNumber(rect.width, 0)
  const bottom = toNumber(rect.y, 0)
  const top = bottom + toNumber(rect.height, 0)
  const midX = (left + right) / 2
  const midY = (bottom + top) / 2
  const key = String(snapKey || '')

  if (key === 'bottom-left') return { x: left, y: bottom }
  if (key === 'bottom-right') return { x: right, y: bottom }
  if (key === 'top-right') return { x: right, y: top }
  if (key === 'top-left') return { x: left, y: top }
  if (key === 'bottom-mid') return { x: midX, y: bottom }
  if (key === 'right-mid') return { x: right, y: midY }
  if (key === 'top-mid') return { x: midX, y: top }
  if (key === 'left-mid') return { x: left, y: midY }

  return { x: midX, y: midY }
} // End getRectPointBySnapKey

//=================
function getPanelAnchorSide(panel, localAxis) {
  const side = panel?.panelOffsetFrom || panel?.panelSide || panel?.edge || ''

  if (localAxis === 'x') {
    if (side === 'right') return 'right'
    return 'left'
  }

  if (localAxis === 'y') {
    if (side === 'top') return 'top'
    return 'bottom'
  }

  return null
} // End getPanelAnchorSide

//=================
function getDimensionLocalAxis(dimension) {
  return dimension?.axis === 'vertical' ? 'y' : 'x'
} // End getDimensionLocalAxis

//=================
function applyPanelWorldAxisDelta(panel, axis, delta) {
  const next = { ...panel }

  if (axis === 'x') {
    const x = getPanelAxisMin(panel, 'x') + delta

    next.x3d = x
    next.x = x

    return next
  }

  if (axis === 'y') {
    const y = getPanelAxisMin(panel, 'y') + delta

    next.y3d = y
    next.worldY = y
    next.depthY = y

    return next
  }

  if (axis === 'z') {
    const z = getPanelAxisMin(panel, 'z') + delta

    next.z3d = z
    next.z = z
    next.y = z

    return next
  }

  return next
} // End applyPanelWorldAxisDelta

//=================
function movePanelByLocalDelta(panel, currentView, localAxis, deltaLocal) {
  const camera = getCameraConfig(currentView)
  const worldAxis = localAxis === 'x' ? camera.axisU : camera.axisV
  const reverse = localAxis === 'x' ? camera.reverseU : camera.reverseV
  const worldDelta = reverse ? -deltaLocal : deltaLocal

  return applyPanelWorldAxisDelta(panel, worldAxis, worldDelta)
} // End movePanelByLocalDelta

//=================
function setPanelWorldAxisMinAndSize(panel, axis, minValue, sizeValue) {
  const next = { ...panel }
  const safeSize = Math.max(1, toNumber(sizeValue, 1))

  if (axis === 'x') {
    next.x3d = minValue
    next.x = minValue
    next.xSize = safeSize
    next.width = safeSize

    return next
  }

  if (axis === 'y') {
    next.y3d = minValue
    next.worldY = minValue
    next.depthY = minValue
    next.ySize = safeSize
    next.depth = safeSize

    return next
  }

  if (axis === 'z') {
    next.z3d = minValue
    next.z = minValue
    next.y = minValue
    next.zSize = safeSize
    next.height = safeSize

    return next
  }

  return next
} // End setPanelWorldAxisMinAndSize

//=================
function resizePanelByLocalAxis(panel, currentView, localAxis, numberValue) {
  const camera = getCameraConfig(currentView)
  const worldAxis = localAxis === 'x' ? camera.axisU : camera.axisV
  const reverse = localAxis === 'x' ? camera.reverseU : camera.reverseV
  const rect = getPanelViewRect(panel, currentView)

  if (!rect) return panel

  const safeValue = Math.min(
    Math.max(1, Number(numberValue || 1)),
    getPanelMaxSizeInsideFrame(panel, currentView, localAxis, Number(numberValue || 1))
  )
  const anchorSide = getPanelAnchorSide(panel, localAxis)
  const localMin = localAxis === 'x' ? rect.x : rect.y
  const localMax = localMin + (localAxis === 'x' ? rect.width : rect.height)
  let nextLocalMin = localMin

  if (anchorSide === 'right' || anchorSide === 'top') {
    nextLocalMin = localMax - safeValue
  }

  const worldMin = reverse ? -(nextLocalMin + safeValue) : nextLocalMin
  const next = setPanelWorldAxisMinAndSize(panel, worldAxis, worldMin, safeValue)

  return clampPanelInsideFrame(next, currentView)
} // End resizePanelByLocalAxis

//=================
function updatePanelLogicalOffset(panel, currentView) {
  const frameId = getPanelFrameId(panel)
  if (!frameId) return panel

  const boxStore = useBoxStore()
  const sourceBox = boxStore.state.boxes.find((item) => item.id === frameId)
  const panelRect = getPanelViewRect(panel, currentView)

  if (!sourceBox || !panelRect) return panel

  const boxRect = projectBoxToCameraRect(sourceBox, currentView)
  const side = panel.panelOffsetFrom || panel.panelSide || panel.edge || ''
  const panelLeft = panelRect.x
  const panelRight = panelRect.x + panelRect.width
  const panelBottom = panelRect.y
  const panelTop = panelRect.y + panelRect.height
  const boxLeft = boxRect.x
  const boxRight = boxRect.x + boxRect.width
  const boxBottom = boxRect.y
  const boxTop = boxRect.y + boxRect.height
  let panelOffset = panel.panelOffset

  if (side === 'left' || side === 'split_vertical') {
    panelOffset = Math.max(0, panelLeft - boxLeft)
  } else if (side === 'right') {
    panelOffset = Math.max(0, boxRight - panelRight)
  } else if (side === 'bottom' || side === 'split_horizontal') {
    panelOffset = Math.max(0, panelBottom - boxBottom)
  } else if (side === 'top') {
    panelOffset = Math.max(0, boxTop - panelTop)
  }

  return {
    ...panel,
    panelOffset
  }
} // End updatePanelLogicalOffset


//=================
function clampPanelInsideFrame(panel, currentView = 'front') {
  const frameId = getPanelFrameId(panel)

  if (!frameId) return panel

  const boxStore = useBoxStore()
  const sourceBox = boxStore.state.boxes.find((item) => item.id === frameId)
  const boxRect = sourceBox ? projectBoxToCameraRect(sourceBox, currentView) : null
  const panelRect = getPanelViewRect(panel, currentView)

  if (!boxRect || !panelRect) return panel

  let next = panel
  const panelRight = panelRect.x + panelRect.width
  const panelTop = panelRect.y + panelRect.height
  const boxRight = boxRect.x + boxRect.width
  const boxTop = boxRect.y + boxRect.height
  let dx = 0
  let dy = 0

  if (panelRect.x < boxRect.x) dx = boxRect.x - panelRect.x
  if (panelRight > boxRight) dx = boxRight - panelRight
  if (panelRect.y < boxRect.y) dy = boxRect.y - panelRect.y
  if (panelTop > boxTop) dy = boxTop - panelTop

  if (Math.abs(dx) > 0.0001) {
    next = movePanelByLocalDelta(next, currentView, 'x', dx)
  }

  if (Math.abs(dy) > 0.0001) {
    next = movePanelByLocalDelta(next, currentView, 'y', dy)
  }

  return next
} // End clampPanelInsideFrame

//=================
function getPanelMaxSizeInsideFrame(panel, currentView, localAxis, fallbackSize) {
  const frameId = getPanelFrameId(panel)

  if (!frameId) return fallbackSize

  const boxStore = useBoxStore()
  const sourceBox = boxStore.state.boxes.find((item) => item.id === frameId)
  const boxRect = sourceBox ? projectBoxToCameraRect(sourceBox, currentView) : null

  if (!boxRect) return fallbackSize

  return localAxis === 'x'
    ? Math.max(1, Number(boxRect.width || fallbackSize || 1))
    : Math.max(1, Number(boxRect.height || fallbackSize || 1))
} // End getPanelMaxSizeInsideFrame

//=================
function getDimensionRefLocalPoint(ref, fallback, panels, boxes, currentView) {
  if (!ref) return cloneDimensionPoint(fallback)

  if (ref.targetType === 'panel') {
    const panel = panels.find((item) => item.id === ref.targetId)
    const rect = getPanelViewRect(panel, currentView)
    const point = getRectPointBySnapKey(rect, ref.snapKey || ref.key)

    return point || cloneDimensionPoint(fallback)
  }

  if (ref.targetType === 'box') {
    const targetBox = boxes.find((item) => item.id === ref.targetId)
    const rect = targetBox ? projectBoxToCameraRect(targetBox, currentView) : null
    const point = getRectPointBySnapKey(rect, ref.snapKey || ref.key)

    return point || cloneDimensionPoint(fallback)
  }

  return cloneDimensionPoint(fallback)
} // End getDimensionRefLocalPoint

//=================
function createDimensionFromDraft(draft, currentView = 'front') {
  if (!draft?.start || !draft?.end) return null

  const distance = getDimensionDistance(draft.start, draft.end)

  if (!Number.isFinite(distance) || distance <= 0.001) return null

  const id = `dim_${dimensionIdSeed++}`
  const axis = getDimensionAxis(draft.start, draft.end)
  const dx = Number(draft.end.x || 0) - Number(draft.start.x || 0)
  const dy = Number(draft.end.y || 0) - Number(draft.start.y || 0)
  const nx = -dy / distance
  const ny = dx / distance
  const mid = {
    x: (Number(draft.start.x || 0) + Number(draft.end.x || 0)) / 2,
    y: (Number(draft.start.y || 0) + Number(draft.end.y || 0)) / 2
  }
  const offsetPoint = cloneDimensionPoint(draft.offsetPoint || draft.end)
  const offsetDistance = offsetPoint
    ? ((Number(offsetPoint.x || 0) - mid.x) * nx) + ((Number(offsetPoint.y || 0) - mid.y) * ny)
    : 28

  return {
    id,
    name: `Dim ${dimensionIdSeed - 1}`,
    view: currentView,
    start: cloneDimensionPoint(draft.start),
    end: cloneDimensionPoint(draft.end),
    offsetPoint,
    offsetDistance: Math.abs(offsetDistance) > 0.001 ? offsetDistance : 28,
    startRef: draft.startRef || null,
    endRef: draft.endRef || null,
    axis,
    value: distance
  }
} // End createDimensionFromDraft

const store = createSimpleStore({
  panels: [],
  zones: [],
  hover: null,
  snapPreview: null,
  selectedPanelId: null,
  selectedPanelIds: [],
  selectedDimensionIds: [],
  panelInputBuffer: '',
  move: createMoveState(),
  dimensions: [],
  dimensionDraft: {
    active: false,
    phase: 'idle',
    start: null,
    end: null,
    offsetPoint: null,
    startRef: null,
    endRef: null,
    hoverSnap: null
  },
  history: {
    undoStack: [],
    redoStack: [],
    max: 80,
    applying: false
  }
}, (state) => ({
  //=================
  cloneHistoryData(value) {
    return JSON.parse(JSON.stringify(value || []))
  }, // End cloneHistoryData

  //=================
  createHistorySnapshot() {
    const boxStore = useBoxStore()

    return {
      panels: this.cloneHistoryData(state.panels),
      boxes: this.cloneHistoryData(boxStore.state.boxes),
      dimensions: this.cloneHistoryData(state.dimensions),
      selectedPanelId: state.selectedPanelId,
      selectedPanelIds: this.cloneHistoryData(state.selectedPanelIds),
      selectedDimensionIds: this.cloneHistoryData(state.selectedDimensionIds),
      selectedBoxId: boxStore.state.selectedBoxId,
      selectedBoxIds: this.cloneHistoryData(boxStore.state.selectedBoxIds)
    }
  }, // End createHistorySnapshot

  //=================
  restoreHistorySnapshot(snapshot) {
    if (!snapshot) return

    const boxStore = useBoxStore()

    state.panels = this.cloneHistoryData(snapshot.panels)
    state.dimensions = this.cloneHistoryData(snapshot.dimensions)
    state.selectedPanelId = snapshot.selectedPanelId || null
    state.selectedPanelIds = this.cloneHistoryData(snapshot.selectedPanelIds)
    state.selectedDimensionIds = this.cloneHistoryData(snapshot.selectedDimensionIds)
    boxStore.setBoxes(this.cloneHistoryData(snapshot.boxes))
    boxStore.selectBoxes(this.cloneHistoryData(snapshot.selectedBoxIds))
    boxStore.state.selectedBoxId = snapshot.selectedBoxId || boxStore.state.selectedBoxIds[0] || null
    state.move = createMoveState()
    state.snapPreview = null
    state.hover = null
    this.rebuildZones()
  }, // End restoreHistorySnapshot

  //=================
  pushHistorySnapshot(label = '') {
    if (state.history.applying) return

    state.history.undoStack.push({
      label,
      snapshot: this.createHistorySnapshot()
    })

    if (state.history.undoStack.length > state.history.max) {
      state.history.undoStack.shift()
    }

    state.history.redoStack = []
  }, // End pushHistorySnapshot

  //=================
  undo() {
    const item = state.history.undoStack.pop()

    if (!item) {
      useAppStore().setStatus('Undo: không còn thao tác')
      return false
    }

    state.history.applying = true
    state.history.redoStack.push({
      label: item.label,
      snapshot: this.createHistorySnapshot()
    })
    this.restoreHistorySnapshot(item.snapshot)
    state.history.applying = false
    useAppStore().setStatus(`Undo: ${item.label || 'đã phục hồi'}`)

    return true
  }, // End undo

  //=================
  redo() {
    const item = state.history.redoStack.pop()

    if (!item) {
      useAppStore().setStatus('Redo: không còn thao tác')
      return false
    }

    state.history.applying = true
    state.history.undoStack.push({
      label: item.label,
      snapshot: this.createHistorySnapshot()
    })
    this.restoreHistorySnapshot(item.snapshot)
    state.history.applying = false
    useAppStore().setStatus(`Redo: ${item.label || 'đã phục hồi'}`)

    return true
  }, // End redo

  //=================
  hideSelected() {
    const boxStore = useBoxStore()
    const panelIds = Array.isArray(state.selectedPanelIds) ? state.selectedPanelIds : []
    const boxIds = Array.isArray(boxStore.state.selectedBoxIds) ? boxStore.state.selectedBoxIds : []
    const dimensionIds = Array.isArray(state.selectedDimensionIds) ? state.selectedDimensionIds : []

    if (!panelIds.length && !boxIds.length && !dimensionIds.length) {
      useAppStore().setStatus('Hide: chưa chọn chi tiết')
      return false
    }

    this.pushHistorySnapshot('Hide')

    state.panels = state.panels.map((panel) => {
      if (!panelIds.includes(panel.id)) return panel

      return {
        ...panel,
        hidden: true
      }
    })

    boxStore.setBoxes(boxStore.state.boxes.map((targetBox) => {
      if (!boxIds.includes(targetBox.id)) return targetBox

      return {
        ...targetBox,
        hidden: true
      }
    }))

    state.dimensions = state.dimensions.map((dimension) => {
      if (!dimensionIds.includes(dimension.id)) return dimension

      return {
        ...dimension,
        hidden: true
      }
    })

    state.selectedPanelId = null
    state.selectedPanelIds = []
    state.selectedDimensionIds = []
    boxStore.clearSelection()
    state.move = createMoveState()
    state.snapPreview = null
    state.hover = null
    this.rebuildZones()
    useAppStore().setStatus('Đã ẩn chi tiết đang chọn')

    return true
  }, // End hideSelected

  //=================
  unhideAll() {
    const boxStore = useBoxStore()
    const hasHiddenPanel = state.panels.some((panel) => panel.hidden === true)
    const hasHiddenBox = boxStore.state.boxes.some((targetBox) => targetBox.hidden === true)
    const hasHiddenDimension = state.dimensions.some((dimension) => dimension.hidden === true)

    if (!hasHiddenPanel && !hasHiddenBox && !hasHiddenDimension) {
      useAppStore().setStatus('Unhide: không có chi tiết đang ẩn')
      return false
    }

    this.pushHistorySnapshot('Unhide')

    state.panels = state.panels.map((panel) => ({
      ...panel,
      hidden: false
    }))

    boxStore.setBoxes(boxStore.state.boxes.map((targetBox) => ({
      ...targetBox,
      hidden: false
    })))

    state.dimensions = state.dimensions.map((dimension) => ({
      ...dimension,
      hidden: false
    }))

    this.rebuildZones()
    useAppStore().setStatus('Đã hiện lại toàn bộ chi tiết')

    return true
  }, // End unhideAll

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
      if (baseBox.hidden === true) return

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
        if (panel.hidden === true) return false

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
    state.selectedPanelIds = panelId ? [panelId] : []
  }, // End selectPanel

  //=================
  selectPanels(panelIds) {
    const ids = Array.isArray(panelIds) ? panelIds.filter(Boolean) : []

    state.selectedPanelIds = ids
    state.selectedPanelId = ids[0] || null
  }, // End selectPanels

  //=================
  selectDimensions(dimensionIds) {
    state.selectedDimensionIds = Array.isArray(dimensionIds) ? dimensionIds.filter(Boolean) : []
  }, // End selectDimensions
  //=================
  deleteSelectedPanels() {
    const selectedIds = Array.isArray(state.selectedPanelIds) ? state.selectedPanelIds : []

    if (!selectedIds.length) return

    state.panels = state.panels.filter((panel) => !selectedIds.includes(panel.id))
    state.selectedPanelId = null
    state.selectedPanelIds = []
  }, // End deleteSelectedPanels

  //=================
  deleteSelectedDimensions() {
    const selectedIds = Array.isArray(state.selectedDimensionIds) ? state.selectedDimensionIds : []

    if (!selectedIds.length) return

    state.dimensions = state.dimensions.filter((dimension) => !selectedIds.includes(dimension.id))
    state.selectedDimensionIds = []
  }, // End deleteSelectedDimensions

  //=================
  clearSelection() {
    state.selectedPanelId = null
    state.selectedPanelIds = []
    state.selectedDimensionIds = []
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

      if (!panels.length) return null

      this.pushHistorySnapshot('Tạo tấm')
      state.panels.push(...panels)

      if (panels[0]) state.selectedPanelId = panels[0].id
      state.selectedPanelIds = panels[0] ? [panels[0].id] : []

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

    this.pushHistorySnapshot('Tạo tấm')
    state.panels.push(panel)
    state.selectedPanelId = panel.id
    state.selectedPanelIds = [panel.id]

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

    if (!panels.length) return []

    this.pushHistorySnapshot('Chia zone')
    state.panels.push(...panels)

    if (panels[0]) state.selectedPanelId = panels[0].id
    state.selectedPanelIds = panels[0] ? [panels[0].id] : []

    this.clearPanelInput()
    this.rebuildZones()
    useAppStore().setStatus(`Đã chia zone /${count}`)

    return panels
  }, // End splitHoveredZone

  //=================
  deleteSelected() {
    if (!state.selectedPanelId) return

    this.pushHistorySnapshot('Xóa tấm')
    state.panels = state.panels.filter((panel) => panel.id !== state.selectedPanelId)
    state.selectedPanelId = null
    state.selectedPanelIds = []

    this.rebuildZones()
    useAppStore().setStatus('Đã xóa tấm đang chọn')
  }, // End deleteSelected


  //=================
  resetDimensionTool() {
    state.dimensionDraft = {
      active: false,
      phase: 'idle',
      start: null,
      end: null,
      offsetPoint: null,
      startRef: null,
      endRef: null,
      hoverSnap: null
    }
  }, // End resetDimensionTool

  //=================
  setDimensionHoverSnap(snapPoint) {
    state.dimensionDraft.hoverSnap = snapPoint || null
  }, // End setDimensionHoverSnap

  //=================
  startOrContinueDimension(localPoint, snapRef = null, currentView = 'front') {
    if (!localPoint) return null

    if (!state.dimensionDraft.active || state.dimensionDraft.phase === 'idle') {
      state.dimensionDraft = {
        active: true,
        phase: 'pick-end',
        start: cloneDimensionPoint(localPoint),
        end: null,
        offsetPoint: null,
        startRef: snapRef || null,
        endRef: null,
        hoverSnap: snapRef ? { ...localPoint, ...snapRef } : null
      }
      useAppStore().setStatus('Dimensions: chọn điểm cuối')
      return state.dimensionDraft
    }

    if (state.dimensionDraft.phase === 'pick-end') {
      const distance = getDimensionDistance(state.dimensionDraft.start, localPoint)

      if (distance <= 0.001) {
        useAppStore().setStatus('Dimensions: điểm cuối trùng điểm đầu')
        return state.dimensionDraft
      }

      state.dimensionDraft.end = cloneDimensionPoint(localPoint)
      state.dimensionDraft.endRef = snapRef || null
      state.dimensionDraft.offsetPoint = cloneDimensionPoint(localPoint)
      state.dimensionDraft.phase = 'place'
      useAppStore().setStatus('Dimensions: kéo ra vị trí đặt dim rồi click')
      return state.dimensionDraft
    }

    if (state.dimensionDraft.phase === 'place') {
      state.dimensionDraft.offsetPoint = cloneDimensionPoint(localPoint)
      const dimension = createDimensionFromDraft(state.dimensionDraft, currentView)

      if (!dimension) {
        this.resetDimensionTool()
        useAppStore().setStatus('Dimensions: dim không hợp lệ')
        return null
      }

      this.pushHistorySnapshot('Tạo Dimensions')
      state.dimensions.push(dimension)
      this.resetDimensionTool()
      useAppStore().setStatus(`Đã tạo ${dimension.name}`)
      return dimension
    }

    return state.dimensionDraft
  }, // End startOrContinueDimension

  //=================
  previewDimension(localPoint, snapRef = null) {
    if (!localPoint) return

    state.dimensionDraft.hoverSnap = snapRef ? { ...localPoint, ...snapRef } : null

    if (!state.dimensionDraft.active) return

    if (state.dimensionDraft.phase === 'pick-end') {
      state.dimensionDraft.end = cloneDimensionPoint(localPoint)
      state.dimensionDraft.endRef = snapRef || null
    }

    if (state.dimensionDraft.phase === 'place') {
      state.dimensionDraft.offsetPoint = cloneDimensionPoint(localPoint)
    }
  }, // End previewDimension

  //=================
  getDimensionDraft() {
    return state.dimensionDraft || null
  }, // End getDimensionDraft

  //=================
  getDimensionById(dimensionId) {
    return state.dimensions.find((dimension) => dimension.id === dimensionId) || null
  }, // End getDimensionById

  //=================
  setDimensionValue(dimensionId, value) {
    const dimension = this.getDimensionById(dimensionId)
    const numberValue = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)

    if (!dimension || !Number.isFinite(numberValue) || numberValue <= 0) return false

    const boxStore = useBoxStore()
    const currentView = dimension.view || useAppStore().state.currentView || 'front'
    const localAxis = getDimensionLocalAxis(dimension)
    const axisKey = localAxis === 'x' ? 'x' : 'y'
    const startRef = dimension.startRef || null
    const endRef = dimension.endRef || null
    const startPanelId = startRef?.targetType === 'panel' ? startRef.targetId : null
    const endPanelId = endRef?.targetType === 'panel' ? endRef.targetId : null
    const samePanelResize = startPanelId && endPanelId && startPanelId === endPanelId
    const startPoint = getDimensionRefLocalPoint(startRef, dimension.start, state.panels, boxStore.state.boxes, currentView)
    const endPoint = getDimensionRefLocalPoint(endRef, dimension.end, state.panels, boxStore.state.boxes, currentView)
    const oldValue = getDimensionDistance(startPoint, endPoint)

    if (!Number.isFinite(oldValue) || oldValue <= 0.001) return false

    this.pushHistorySnapshot('Sửa Dimensions')

    if (samePanelResize) {
      state.panels = state.panels.map((panel) => {
        if (panel.id !== startPanelId) return panel

        return updatePanelLogicalOffset(
          resizePanelByLocalAxis(panel, currentView, localAxis, numberValue),
          currentView
        )
      })
    } else {
      const movingRef = endPanelId ? endRef : startPanelId ? startRef : null
      const fixedPoint = endPanelId ? startPoint : startPanelId ? endPoint : startPoint
      const movingPoint = endPanelId ? endPoint : startPanelId ? startPoint : endPoint
      const movingPanelId = movingRef?.targetId || null

      if (movingPanelId) {
        const currentDistance = toNumber(movingPoint?.[axisKey], 0) - toNumber(fixedPoint?.[axisKey], 0)
        const sign = currentDistance < 0 ? -1 : 1
        const targetCoordinate = toNumber(fixedPoint?.[axisKey], 0) + sign * numberValue
        const deltaLocal = targetCoordinate - toNumber(movingPoint?.[axisKey], 0)

        state.panels = state.panels.map((panel) => {
          if (panel.id !== movingPanelId) return panel

          return updatePanelLogicalOffset(
            clampPanelInsideFrame(movePanelByLocalDelta(panel, currentView, localAxis, deltaLocal), currentView),
            currentView
          )
        })
      } else {
        const dx = toNumber(endPoint.x, 0) - toNumber(startPoint.x, 0)
        const dy = toNumber(endPoint.y, 0) - toNumber(startPoint.y, 0)
        const scale = numberValue / oldValue

        dimension.end = {
          x: toNumber(startPoint.x, 0) + dx * scale,
          y: toNumber(startPoint.y, 0) + dy * scale
        }
      }
    }

    const refreshedStart = getDimensionRefLocalPoint(startRef, dimension.start, state.panels, boxStore.state.boxes, currentView)
    const refreshedEnd = getDimensionRefLocalPoint(endRef, dimension.end, state.panels, boxStore.state.boxes, currentView)

    dimension.start = refreshedStart
    dimension.end = refreshedEnd
    dimension.axis = getDimensionAxis(refreshedStart, refreshedEnd)
    dimension.value = numberValue

    this.rebuildZones()
    useAppStore().setStatus(`Dimensions: ${Math.round(numberValue)}`)

    return true
  }, // End setDimensionValue

  //=================
  getRenderableDimensions(currentView = 'front') {
    const boxStore = useBoxStore()

    return state.dimensions
      .filter((dimension) => dimension.hidden !== true)
      .map((dimension) => {
        const start = getDimensionRefLocalPoint(dimension.startRef, dimension.start, state.panels, boxStore.state.boxes, currentView)
        const end = getDimensionRefLocalPoint(dimension.endRef, dimension.end, state.panels, boxStore.state.boxes, currentView)

        return {
          ...dimension,
          start,
          end,
          axis: getDimensionAxis(start, end),
          value: getDimensionDistance(start, end)
        }
      })
  }, // End getRenderableDimensions

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
      state.panels.filter((panel) => panel.hidden !== true),
      boxStore.state.boxes.filter((targetBox) => targetBox.hidden !== true),
      localPoint,
      viewport,
      currentView,
      state.selectedPanelIds,
      boxStore.state.selectedBoxIds
    )

    state.snapPreview = null
  }, // End updateMoveToolHover

  //=================
  startCadMoveFromHover(localPoint, viewport, currentView = 'front') {
    const boxStore = useBoxStore()

    state.move = startMoveFromHover(
      state.move,
      state.panels.filter((panel) => panel.hidden !== true),
      boxStore.state.boxes.filter((targetBox) => targetBox.hidden !== true),
      localPoint,
      viewport,
      currentView,
      state.selectedPanelIds,
      boxStore.state.selectedBoxIds
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
  commitCadMove(localPoint, viewport, lockAxis = false, copyMode = false, currentView = 'front') {
    const boxStore = useBoxStore()

    const result = commitMoveToTarget(
      state.move,
      state.panels,
      boxStore.state.boxes,
      localPoint,
      viewport,
      lockAxis,
      currentView,
      copyMode
    )

    if (result.movedTarget) {
      this.pushHistorySnapshot(result.movedTarget.copyMode ? 'Copy' : 'Move')
    }

    state.move = result.moveState
    state.panels = result.panels
    boxStore.setBoxes(result.boxes)
    state.snapPreview = null

    if (result.movedTarget?.type === 'panel') {
      state.selectedPanelId = result.movedTarget.id
      state.selectedPanelIds = [result.movedTarget.id]
      boxStore.clearSelection()
      this.rebuildZones()
      useAppStore().setStatus(result.movedTarget.copyMode ? 'Đã copy tấm' : 'Đã di chuyển tấm')
    }

    if (result.movedTarget?.type === 'box') {
      state.selectedPanelId = null
      state.selectedPanelIds = []
      boxStore.selectBox(result.movedTarget.id)
      useAppStore().setStatus(result.movedTarget.copyMode ? 'Đã copy Box' : 'Đã di chuyển Box')
    }

    if (result.movedTarget?.type === 'selection') {
      state.selectedPanelIds = result.movedTarget.panelIds || []
      state.selectedPanelId = state.selectedPanelIds[0] || null
      boxStore.selectBoxes(result.movedTarget.boxIds || [])
      this.rebuildZones()
      useAppStore().setStatus(result.movedTarget.copyMode ? 'Đã copy nhóm chi tiết' : 'Đã di chuyển nhóm chi tiết')
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

    if (state.move.targetType === 'box' && state.move.previewTargets) {
      return {
        type: 'selection',
        target: {
          panels: state.move.previewTargets.panels || [],
          boxes: [state.move.previewTarget]
        }
      }
    }

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