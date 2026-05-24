<template>
  <main class="mn-canvas-area" ref="viewportRef" tabindex="0" @keydown="onKeyDown">
    <canvas
      ref="canvasRef"
      class="mn-draw-canvas"
      :class="canvasCursorClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    />
    <input
      v-if="dimInput.active"
      ref="dimInputRef"
      type="number"
      class="mn-dim-input"
      :style="dimInputStyle"
      v-model="dimInput.value"
      @keydown="onDimInputKeyDown"
      @blur="cancelDimInput"
    />

    <input
      v-if="boxHeightInput.active"
      ref="boxHeightInputRef"
      type="number"
      class="mn-dim-input"
      :style="boxHeightInputStyle"
      v-model="boxHeightInput.value"
      placeholder="Cao Box"
      @keydown="onBoxHeightInputKeyDown"
      @blur="cancelBoxHeightInput"
    />

    <Mini3DPreview v-if="app.state.mini3DVisible" />
    <div class="mn-quick-view-bar">
      <button v-for="view in views" :key="view.id" class="mn-quick-view-btn" :class="{ active: app.state.currentView === view.id }" @click="app.setView(view.id)">{{ view.label }}</button>
    </div>
    <button class="mn-preview-toggle" @click="app.toggleMini3D">{{ app.state.mini3DVisible ? 'Ẩn 3D' : 'Hiện 3D' }}</button>
    <div class="mn-axis-widget" title="3D Preview">
      <div class="mn-joystick-outer"><div class="mn-joystick-inner"><span class="mn-joystick-label">3D</span></div></div>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Mini3DPreview from '../preview/Mini3DPreview.vue'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useWallStore } from '../../stores/useWallStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useBoxStore } from '../../stores/useBoxStore'
import { renderCanvas2D, getWallDimHit, getBoxDimHit } from '../../renderers/canvas-2d-renderer'
import { screenToLocal, localToScreen } from '../../renderers/viewport-transform'
import { projectBoxToCameraRect, cameraLocalToWorldPoint } from '../../core/view/view-camera'
import { createMoveSnapResult, getPanelSnapPoints, hitTestPanel, hitTestZoneEdge } from '../../core/snap/snap-engine'
import { handleViewportKey } from '../../commands/keyboard-controller'

const app = useAppStore()
const cabinet = useCabinetStore()
const wall = useWallStore()
const drawing = useDrawingStore()
const box = useBoxStore()
const viewportRef = ref(null)
const canvasRef = ref(null)
const dimInputRef = ref(null)
const boxHeightInputRef = ref(null)

const dimInput = ref({
  active: false,
  key: null,
  x: 0,
  y: 0,
  value: ''
})

const boxHeightInput = ref({
  active: false,
  x: 0,
  y: 0,
  value: ''
})

const hoverDim = ref(null)
let ctx = null
let ratio = 1
let panning = false
let panStart = null
let panOriginal = null

const views = [
  { id: 'front', label: 'Trước' }, { id: 'back', label: 'Sau' }, { id: 'left', label: 'Trái' },
  { id: 'right', label: 'Phải' }, { id: 'top', label: 'Trên' }, { id: 'bottom', label: 'Dưới' }
]
const zoomLabel = computed(() => `${Math.round(app.state.viewport.zoom * 100)}%`)
const localX = computed(() => Math.round(app.state.mouse.localX))
const localY = computed(() => Math.round(app.state.mouse.localY))

//=================
function getWallBox3D() {
  return wall.getBox3D()
} // End getWallBox3D
const activeViewConfig = computed(() => app.getViewConfig(app.state.currentView))
const axisHorizontal = computed(() => activeViewConfig.value.axisA || 'X')
const axisVertical = computed(() => activeViewConfig.value.axisB || 'Y')

const dimInputStyle = computed(() => ({
  left: `${dimInput.value.x}px`,
  top: `${dimInput.value.y}px`
}))

const boxHeightInputStyle = computed(() => ({
  left: `${boxHeightInput.value.x}px`,
  top: `${boxHeightInput.value.y}px`
}))
const canvasCursorClass = computed(() => {
  if (hoverDim.value) return 'mn-cursor-pointer'
  if (app.state.currentTool === 'move') return 'mn-cursor-move'
  if (app.state.currentTool === 'box') return 'mn-cursor-box'
  if (app.state.currentTool === 'panel') return 'mn-cursor-crosshair'
  if (app.state.currentTool === 'select') return 'mn-cursor-select'
  return 'mn-cursor-default'
})
function resizeCanvas() {
  const canvas = canvasRef.value
  const host = viewportRef.value
  if (!canvas || !host) return
  const rect = host.getBoundingClientRect()
  ratio = window.devicePixelRatio || 1
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  app.setViewportSize(rect.width, rect.height)
  draw()
}

//=================
function draw() {
  if (!ctx || !canvasRef.value) return

  const canvas = canvasRef.value
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  renderCanvas2D(ctx, {
    width,
    height,
    viewport: app.state.viewport,
    currentView: app.state.currentView,
    wallRect: projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    wallEditingDim: wall.state.editingDim,
    zones: drawing.state.zones,
    panels: drawing.state.panels,
    panelPreviewItems: drawing.getPanelPreviewItems(),
    panelInputBuffer: drawing.state.panelInputBuffer,
    boxes: box.state.boxes,
    boxDraftRect: box.getDraftRect(),
    boxEditingDim: box.state.editingDim,
    hover: drawing.state.hover,
    snapPreview: drawing.state.snapPreview,
    selectedPanelId: drawing.state.selectedPanelId,
    selectedBoxId: box.state.selectedBoxId,
    showGrid: app.state.showGrid
  })
} // End draw
//=================
function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max)
} // End clampValue

//=================
function getDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y

  return Math.sqrt(dx * dx + dy * dy)
} // End getDistance

//=================
function getWallSnapResult(local, wallRect, tolerance) {
  if (!local || !wallRect) {
    return {
      active: false,
      point: local,
      snap: null
    }
  }

  const left = wallRect.x
  const right = wallRect.x + wallRect.width
  const bottom = wallRect.y
  const top = wallRect.y + wallRect.height

  const corners = [
    { type: 'corner', key: 'bottom-left', x: left, y: bottom },
    { type: 'corner', key: 'bottom-right', x: right, y: bottom },
    { type: 'corner', key: 'top-right', x: right, y: top },
    { type: 'corner', key: 'top-left', x: left, y: top }
  ]

  let bestCorner = null

  corners.forEach((target) => {
    const distance = getDistance(local, target)

    if (distance > tolerance) return
    if (bestCorner && distance >= bestCorner.distance) return

    bestCorner = {
      ...target,
      distance
    }
  })

  if (bestCorner) {
    return {
      active: true,
      point: {
        x: bestCorner.x,
        y: bestCorner.y
      },
      snap: bestCorner
    }
  }

  const edges = [
    {
      type: 'edge',
      key: 'bottom',
      x: clampValue(local.x, left, right),
      y: bottom
    },
    {
      type: 'edge',
      key: 'top',
      x: clampValue(local.x, left, right),
      y: top
    },
    {
      type: 'edge',
      key: 'left',
      x: left,
      y: clampValue(local.y, bottom, top)
    },
    {
      type: 'edge',
      key: 'right',
      x: right,
      y: clampValue(local.y, bottom, top)
    }
  ]

  let bestEdge = null

  edges.forEach((target) => {
    const distance = getDistance(local, target)

    if (distance > tolerance) return
    if (bestEdge && distance >= bestEdge.distance) return

    bestEdge = {
      ...target,
      distance
    }
  })

  if (!bestEdge) {
    return {
      active: false,
      point: local,
      snap: null
    }
  }

  return {
    active: true,
    point: {
      x: bestEdge.x,
      y: bestEdge.y
    },
    snap: bestEdge
  }
} // End getWallSnapResult
//=================
function getExistingBoxSnapResult(local, tolerance = 18) {
  if (!local || app.state.currentView !== 'top') {
    return null
  }

  const boxes = box.state.boxes || []

  if (!boxes.length) {
    return null
  }

  const scale = app.state.viewport.localScale * app.state.viewport.zoom
  const toleranceLocal = tolerance / scale

  let best = null

  for (const item of boxes) {
    const rect = projectBoxToCameraRect(item, app.state.currentView)

    if (!rect) {
      continue
    }

    const left = rect.x
    const right = rect.x + rect.width
    const bottom = rect.y
    const top = rect.y + rect.height

    const points = [
      { type: 'box-corner', key: 'bottom-left', x: left, y: bottom },
      { type: 'box-corner', key: 'bottom-right', x: right, y: bottom },
      { type: 'box-corner', key: 'top-right', x: right, y: top },
      { type: 'box-corner', key: 'top-left', x: left, y: top }
    ]

    for (const target of points) {
      const distance = getDistance(local, target)

      if (distance > toleranceLocal) continue
      if (best && distance >= best.distance) continue

      best = {
        ...target,
        distance
      }
    }

    const edges = [
      {
        type: 'box-edge',
        key: 'bottom',
        x: clampValue(local.x, left, right),
        y: bottom
      },
      {
        type: 'box-edge',
        key: 'top',
        x: clampValue(local.x, left, right),
        y: top
      },
      {
        type: 'box-edge',
        key: 'left',
        x: left,
        y: clampValue(local.y, bottom, top)
      },
      {
        type: 'box-edge',
        key: 'right',
        x: right,
        y: clampValue(local.y, bottom, top)
      }
    ]

    for (const target of edges) {
      const distance = getDistance(local, target)

      if (distance > toleranceLocal) continue
      if (best && distance >= best.distance) continue

      best = {
        ...target,
        distance
      }
    }
  }

  if (!best) {
    return null
  }

  return {
    active: true,
    point: {
      x: best.x,
      y: best.y
    },
    snap: best
  }
} // End getExistingBoxSnapResult
//=================
function getBoxSnapLocal(local) {
  if (app.state.currentTool !== 'box') return local

  if (app.state.currentView !== 'top') {
    drawing.clearSnapPreview()
    return local
  }

  const wallRect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)
  const tolerance = 18 / (app.state.viewport.localScale * app.state.viewport.zoom)

  const boxSnapResult = getExistingBoxSnapResult(local, 18)

  if (boxSnapResult && boxSnapResult.active) {
    drawing.setSnapPreview(boxSnapResult.snap)
    return boxSnapResult.point
  }

  const wallSnapResult = getWallSnapResult(local, wallRect, tolerance)

  drawing.setSnapPreview(wallSnapResult.active ? wallSnapResult.snap : null)

  return wallSnapResult.point
} // End getBoxSnapLocal

//=================
function localFromEvent(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const cameraLocal = screenToLocal(app.state.viewport, x, y)
  const worldPoint = cameraLocalToWorldPoint(cameraLocal, app.state.currentView)

  app.setMouse({
    x,
    y,
    localX: cameraLocal.x,
    localY: cameraLocal.y,
    worldX: worldPoint.x,
    worldY: worldPoint.y,
    worldZ: worldPoint.z
  })

  return cameraLocal
} // End localFromEvent
function hitTestMoveGrip(local) {
  const tolerance = 14 / (app.state.viewport.localScale * app.state.viewport.zoom)
  const hoverPanel = drawing.state.hover?.type === 'panel' ? drawing.state.hover.panel : null

  if (!hoverPanel) return null

  const gripPoints = getPanelSnapPoints(hoverPanel).filter((snapPoint) => snapPoint.type === 'corner')

  for (const gripPoint of gripPoints) {
    const dx = local.x - gripPoint.x
    const dy = local.y - gripPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= tolerance) {
      return {
        panel: hoverPanel,
        gripPoint
      }
    }
  }

  return null
} // End hitTestMoveGrip
//=================
function updateHover(local) {
  const scale = app.state.viewport.localScale * app.state.viewport.zoom
  const toleranceLocal = 18 / scale

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      drawing.setHover(null)
      return
    }

    const zoneHit = hitTestZoneEdge(drawing.state.zones, local, toleranceLocal)

    drawing.setHover(zoneHit)
    draw()
    return
  }

  const panelHit = hitTestPanel(drawing.state.panels, local)

  if (panelHit) {
    drawing.setHover(panelHit)
    return
  }

  const zoneHit = hitTestZoneEdge(drawing.state.zones, local, toleranceLocal)

  drawing.setHover(zoneHit)
} // End updateHover
//=================
function getWallDimInputInfo(dimKey) {
  const rect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)
  const viewport = app.state.viewport

  const leftTop = localToScreen(viewport, rect.x, rect.y + rect.height)
  const rightTop = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)
  const leftBottom = localToScreen(viewport, rect.x, rect.y)

  const viewKey = app.state.currentView

  let wallKey = dimKey

  if (viewKey === 'top' || viewKey === 'bottom') {
    wallKey = dimKey === 'width' ? 'width' : 'depth'
  } else if (viewKey === 'front' || viewKey === 'back') {
    wallKey = dimKey === 'width' ? 'width' : 'height'
  } else if (viewKey === 'left' || viewKey === 'right') {
    wallKey = dimKey === 'width' ? 'depth' : 'height'
  }

  if (dimKey === 'width') {
    return {
      key: wallKey,
      editKey: 'width',
      value: String(Math.round(rect.width)),
      x: (leftTop.x + rightTop.x) / 2,
      y: leftTop.y - 46
    }
  }

  if (dimKey === 'height') {
    return {
      key: wallKey,
      editKey: 'height',
      value: String(Math.round(rect.height)),
      x: leftTop.x - 58,
      y: (leftTop.y + leftBottom.y) / 2
    }
  }

  return null
} // End getWallDimInputInfo
//=================
function getBoxViewDimKeys(currentView = 'top') {
  if (currentView === 'front' || currentView === 'back') {
    return {
      horizontal: 'width',
      vertical: 'height'
    }
  }

  if (currentView === 'left' || currentView === 'right') {
    return {
      horizontal: 'depth',
      vertical: 'height'
    }
  }

  return {
    horizontal: 'width',
    vertical: 'depth'
  }
} // End getBoxViewDimKeys
//=================
function getBoxDimInputInfo(dimHit) {
  if (!dimHit) return null

  const targetBox = box.state.boxes.find((item) => item.id === dimHit.boxId)
  if (!targetBox) return null

  const currentView = app.state.currentView
  const viewDim = getBoxViewDimKeys(currentView)
  const boxRect = projectBoxToCameraRect(targetBox, currentView)
  const viewport = app.state.viewport

  const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
  const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
  const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

  if (dimHit.key === viewDim.horizontal) {
    return {
      target: 'box',
      boxId: targetBox.id,
      key: viewDim.horizontal,
      value: String(Math.round(targetBox[viewDim.horizontal])),
      x: (leftTop.x + rightTop.x) / 2,
      y: leftTop.y - 42
    }
  }

  if (dimHit.key === viewDim.vertical) {
    return {
      target: 'box',
      boxId: targetBox.id,
      key: viewDim.vertical,
      value: String(Math.round(targetBox[viewDim.vertical])),
      x: leftTop.x - 52,
      y: (leftTop.y + leftBottom.y) / 2
    }
  }

  return null
} // End getBoxDimInputInfo
//=================
function openDimInput(dimHit) {
  const info = typeof dimHit === 'string'
    ? getWallDimInputInfo(dimHit)
    : getBoxDimInputInfo(dimHit)
  if (!info) return
  dimInput.value = {
    active: true,
    target: info.target || 'wall',
    boxId: info.boxId || null,
    key: info.key,
    x: info.x,
    y: info.y,
    value: info.value
  }
  if (dimInput.value.target === 'box') {
    box.selectBox(info.boxId)
    box.setEditingDim(info.key)
    wall.clearEditingDim()
    app.setStatus(`Nhập kích thước Box: ${info.key}`)
  } else {
    wall.setEditingDim(info.editKey)
    box.clearEditingDim()
    app.setStatus(`Nhập kích thước Wall: ${info.key}`)
  }
  app.clearCommand()
  nextTick(() => {
    dimInputRef.value?.focus()
    dimInputRef.value?.select()
  })
  draw()
} // End openDimInput
//=================
function cancelDimInput() {
  dimInput.value.active = false
  wall.clearEditingDim()
  box.clearEditingDim()
  draw()
} // End cancelDimInput
//=================
function openBoxHeightInput(event) {
  const rect = canvasRef.value.getBoundingClientRect()

  boxHeightInput.value.active = true
  boxHeightInput.value.x = event.clientX - rect.left + 12
  boxHeightInput.value.y = event.clientY - rect.top + 12
  boxHeightInput.value.value = String(wall.state.height || 600)

  nextTick(() => {
    boxHeightInputRef.value?.focus()
    boxHeightInputRef.value?.select()
  })
} // End openBoxHeightInput
//=================
function cancelBoxHeightInput() {
  boxHeightInput.value.active = false
  boxHeightInput.value.value = ''
  box.cancelDraft()
  draw()
}
// End cancelBoxHeightInput

//=================
function commitBoxHeightInput() {
  const height = Number(boxHeightInput.value.value)

  if (!Number.isFinite(height) || height <= 0) {
    cancelBoxHeightInput()
    return
  }

  box.commitDraft(height)
  boxHeightInput.value.active = false
  boxHeightInput.value.value = ''

  drawing.rebuildZones()
  draw()
}
// End commitBoxHeightInput

//=================
function onBoxHeightInputKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitBoxHeightInput()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    cancelBoxHeightInput()
  }
}
// End onBoxHeightInputKeyDown
//=================
function commitDimInput() {
  const numberValue = Number(dimInput.value.value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    cancelDimInput()
    return
  }
  if (dimInput.value.target === 'box') {
    box.setBoxSize(dimInput.value.boxId, dimInput.value.key, numberValue)
    app.setStatus(`Đã cập nhật Box ${dimInput.value.key}: ${numberValue}mm`)
  } else {
    wall.setSize(dimInput.value.key, numberValue)
    app.setStatus(`Đã cập nhật Wall ${dimInput.value.key}: ${numberValue}mm`)
  }
  dimInput.value.active = false
  wall.clearEditingDim()
  box.clearEditingDim()
  draw()
} // End commitDimInput
//=================
function onDimInputKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDimInput()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    cancelDimInput()
  }
} // End onDimInputKeyDown
//=================
function onPointerDown(event) {
  viewportRef.value.focus()

  const rawLocal = localFromEvent(event)
  const local = getBoxSnapLocal(rawLocal)

  if (app.state.currentTool === 'box') {
    event.preventDefault()
    event.stopPropagation()

    if (event.button !== 0) {
      return
    }

    if (app.state.currentView !== 'top') {
      app.setStatus('Box chỉ tạo ở mặt Trên')
      draw()
      return
    }

    if (boxHeightInput.value.active) {
      return
    }

    if (!box.state.draft.active) {
      box.startDraft(local)
      app.setStatus('Box: chọn điểm góc thứ hai')
      draw()
      return
    }

    box.updateDraft(local)
    openBoxHeightInput(event)
    app.setStatus('Nhập chiều cao Box rồi nhấn Enter')
    draw()
    return
  }

  const canvasRect = canvasRef.value.getBoundingClientRect()
  const screenX = event.clientX - canvasRect.left
  const screenY = event.clientY - canvasRect.top

  const wallDimHit = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    screenX,
    screenY
  )

  const boxDimHit = getBoxDimHit(
    app.state.viewport,
    box.state.boxes,
    screenX,
    screenY,
    app.state.currentView
  )

  const activeDimHit = boxDimHit || wallDimHit || hoverDim.value

  if (activeDimHit) {
    event.preventDefault()
    event.stopPropagation()
    openDimInput(activeDimHit)
    return
  }

  if (event.button === 1 || event.button === 2 || event.shiftKey) {
    panning = true
    panStart = { x: event.clientX, y: event.clientY }
    panOriginal = { x: app.state.viewport.panX, y: app.state.viewport.panY }
    return
  }

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      app.setStatus('Vẽ Tấm chỉ hoạt động ở mặt Trước')
      draw()
      return
    }

    updateHover(rawLocal)

    if (drawing.state.hover?.type === 'zone-edge') {
      drawing.addPanelFromHover()
      draw()
      return
    }

    draw()
    return
  }

  const gripHit = app.state.currentTool === 'move' ? hitTestMoveGrip(local) : null
  const panelHit = hitTestPanel(drawing.state.panels, local)

  if (app.state.currentTool === 'move' && gripHit) {
    drawing.selectPanel(gripHit.panel.id)
    drawing.startMove(gripHit.panel.id, gripHit.gripPoint)
    draw()
    return
  }

  if ((app.state.currentTool === 'select' || app.state.currentTool === 'move') && panelHit) {
    drawing.selectPanel(panelHit.panel.id)

    if (app.state.currentTool === 'move') {
      drawing.startMove(panelHit.panel.id, local)
    }

    draw()
    return
  }

  if (app.state.currentTool === 'select') {
    drawing.clearSelection()
    box.clearSelection()
  }

  draw()
} // End onPointerDown
//=================
function onPointerMove(event) {
  const rawLocal = localFromEvent(event)

  if (panning && panStart && panOriginal) {
    app.setPan(
      panOriginal.x + event.clientX - panStart.x,
      panOriginal.y + event.clientY - panStart.y
    )
    draw()
    return
  }

  if (app.state.currentTool === 'box') {
    const local = getBoxSnapLocal(rawLocal)

    hoverDim.value = null

    if (box.state.draft.active) {
      box.updateDraft(local)
    }

    draw()
    return
  }

  const local = rawLocal
  const canvasRect = canvasRef.value.getBoundingClientRect()
  const screenX = event.clientX - canvasRect.left
  const screenY = event.clientY - canvasRect.top

  const wallDimHit = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    screenX,
    screenY
  )

  const boxDimHit = getBoxDimHit(
    app.state.viewport,
    box.state.boxes,
    screenX,
    screenY,
    app.state.currentView
  )

  hoverDim.value = boxDimHit || wallDimHit

  if (drawing.state.drag.active) {
    const snapResult = createMoveSnapResult(
      local,
      drawing.state.panels,
      drawing.state.drag.panelId
    )

    const movePoint = snapResult.active ? snapResult.point : local

    drawing.setSnapPreview(snapResult.active ? snapResult.snap : null)
    drawing.updateMove(movePoint, event.shiftKey)
    draw()
    return
  }

  drawing.clearSnapPreview()
  updateHover(rawLocal)
  draw()
} // End onPointerMove
//=================
function onPointerUp() {
  if (drawing.state.drag.active) {
    drawing.endMove()
    drawing.clearSnapPreview()
  }

  panning = false
  panStart = null
  panOriginal = null
  drawing.clearSnapPreview()
  draw()
} // End onPointerUp
function onWheel(event) {
  const direction = event.deltaY < 0 ? 1 : -1
  const next = app.state.viewport.zoom * (direction > 0 ? 1.12 : 0.88)
  app.setZoom(next)
  draw()
}
//=================
function onKeyDown(event) {
  if (dimInput.value.active) return

  const key = event.key

  if (app.state.currentTool === 'panel') {
    if (app.state.currentView !== 'front') {
      if (key === 'Escape') {
        event.preventDefault()
        app.setTool('select')
        drawing.clearPanelInput()
        drawing.setHover(null)
        draw()
      }

      return
    }

    if (/^[0-9]$/.test(key)) {
      event.preventDefault()
      drawing.appendPanelInput(key)
      app.setStatus(`Vẽ Tấm: ${drawing.state.panelInputBuffer}`)
      draw()
      return
    }

    if (key === '/') {
      event.preventDefault()
      drawing.appendPanelInput(key)
      app.setStatus(`Vẽ Tấm: ${drawing.state.panelInputBuffer}`)
      draw()
      return
    }

    if (key === 'Backspace') {
      event.preventDefault()
      drawing.backspacePanelInput()
      app.setStatus(drawing.state.panelInputBuffer ? `Vẽ Tấm: ${drawing.state.panelInputBuffer}` : 'Vẽ Tấm')
      draw()
      return
    }

    if (key === 'Escape') {
      event.preventDefault()
      drawing.clearPanelInput()
      drawing.setHover(null)
      app.setStatus('Đã hủy nhập Vẽ Tấm')
      draw()
      return
    }

    if (key === 'Enter') {
      event.preventDefault()
      drawing.addPanelFromHover()
      draw()
      return
    }
  }

  if (key === 'm' || key === 'M') {
    app.setTool('move')
    draw()
    return
  }

  handleViewportKey(event)
  draw()
} // End onKeyDown

watch(() => [cabinet.state.width, cabinet.state.depth, cabinet.state.height, cabinet.state.panelThickness, app.state.currentView], () => {
  drawing.rebuildZones()
  draw()
})

watch(() => [
  drawing.state.panels.length,
  drawing.state.zones.length,
  drawing.state.selectedPanelId,
  drawing.state.panelInputBuffer,
  app.state.mini3DVisible
], draw)

watch(() => [box.state.boxes.length, box.state.selectedBoxId, box.state.editingDim, box.state.draft.active], () => {
  drawing.rebuildZones()
  draw()
})
onMounted(() => {
  resizeCanvas()
  drawing.rebuildZones()
  window.addEventListener('resize', resizeCanvas)
})
onBeforeUnmount(() => window.removeEventListener('resize', resizeCanvas))
</script>
<style scoped>
.mn-cursor-move {
  cursor: move;
}

.mn-cursor-box {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Crect x='13' y='21' width='14' height='8' rx='1.5' fill='%23dbefff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-select {
  cursor: default;
}

.mn-cursor-default {
  cursor: default;
}
.mn-cursor-pointer {
  cursor: pointer;
}
.mn-dim-input {
  position: absolute;
  width: 72px;
  height: 26px;
  transform: translate(-50%, -50%);
  z-index: 20;
  border: 1px solid #1a73e8;
  border-radius: 3px;
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  text-align: center;
  outline: none;
  box-shadow: none;
}
</style>