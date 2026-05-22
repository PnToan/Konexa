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
    <Mini3DPreview v-if="app.state.mini3DVisible" />
    <div class="mn-quick-view-bar">
      <button v-for="view in views" :key="view.id" class="mn-quick-view-btn" :class="{ active: app.state.currentView === view.id }" @click="app.setView(view.id)">{{ view.label }}</button>
    </div>
    <button class="mn-preview-toggle" @click="app.toggleMini3D">{{ app.state.mini3DVisible ? 'Ẩn 3D' : 'Hiện 3D' }}</button>
    <div class="mn-axis-widget" title="3D Preview">
      <div class="mn-joystick-outer"><div class="mn-joystick-inner"><span class="mn-joystick-label">3D</span></div></div>
    </div>
    <div class="mn-viewport-info">
      Tool: {{ app.getActiveToolLabel() }} | Mặt: {{ app.getActiveViewLabel() }} ({{ app.getActiveViewAxesText() }}) | {{ axisHorizontal }}: {{ localX }} | {{ axisVertical }}: {{ localY }} | Zoom: {{ zoomLabel }}
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
import { renderCanvas2D, getWallDimHit } from '../../renderers/canvas-2d-renderer'
import { screenToLocal, localToScreen } from '../../renderers/viewport-transform'
import { projectBoxToCameraRect, cameraLocalToWorldPoint } from '../../core/view/view-camera'
import { createMoveSnapResult, getPanelSnapPoints, hitTestPanel, hitTestZoneEdge } from '../../core/snap/snap-engine'
import { handleViewportKey } from '../../commands/keyboard-controller'

const app = useAppStore()
const cabinet = useCabinetStore()
const wall = useWallStore()
const drawing = useDrawingStore()
const viewportRef = ref(null)
const canvasRef = ref(null)
const dimInputRef = ref(null)
const dimInput = ref({
  active: false,
  key: null,
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
const canvasCursorClass = computed(() => {
  if (hoverDim.value) return 'mn-cursor-pointer'
  if (app.state.currentTool === 'move') return 'mn-cursor-move'
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

  const viewport = app.state.viewport
  const wallRect = projectBoxToCameraRect(getWallBox3D(), app.state.currentView)

  renderCanvas2D(ctx, {
    width: viewport.width,
    height: viewport.height,
    viewport,
    wallRect,
    wallEditingDim: wall.state.editingDim,
    zones: drawing.state.zones,
    panels: drawing.state.panels,
    hover: drawing.state.hover,
    selectedPanelId: drawing.state.selectedPanelId,
    showGrid: app.state.showGrid
  })
} // End draw

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
    const zoneHit = hitTestZoneEdge(drawing.state.zones, local, toleranceLocal)
    drawing.setHover(zoneHit)
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
function openDimInput(dimKey) {
  const info = getWallDimInputInfo(dimKey)

  if (!info) return

  dimInput.value = {
    active: true,
    key: info.key,
    x: info.x,
    y: info.y,
    value: info.value
  }

  wall.setEditingDim(info.editKey)
  app.clearCommand()
  app.setStatus(`Nhập kích thước Wall: ${info.key}`)

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
  draw()
} // End cancelDimInput

//=================
function commitDimInput() {
  const numberValue = Number(dimInput.value.value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    cancelDimInput()
    return
  }

  wall.setSize(dimInput.value.key, numberValue)
  app.setStatus(`Đã cập nhật Wall ${dimInput.value.key}: ${numberValue}mm`)
  dimInput.value.active = false
  wall.clearEditingDim()
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

  const local = localFromEvent(event)
  
  const canvasRect = canvasRef.value.getBoundingClientRect()

  const dimHit = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    event.clientX - canvasRect.left,
    event.clientY - canvasRect.top
  )

  const activeDimHit = dimHit || hoverDim.value

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

  const gripHit = app.state.currentTool === 'move' ? hitTestMoveGrip(local) : null
  const panelHit = hitTestPanel(drawing.state.panels, local)

  if (app.state.currentTool === 'panel' && drawing.state.hover?.type === 'zone-edge') {
    drawing.addPanelFromHover()
    draw()
    return
  }

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
  }

  draw()
} // End onPointerDown
function onPointerMove(event) {
  const local = localFromEvent(event)
  const canvasRect = canvasRef.value.getBoundingClientRect()
  hoverDim.value = getWallDimHit(
    app.state.viewport,
    projectBoxToCameraRect(getWallBox3D(), app.state.currentView),
    event.clientX - canvasRect.left,
    event.clientY - canvasRect.top
  )
  if (panning && panStart && panOriginal) {
    app.setPan(panOriginal.x + event.clientX - panStart.x, panOriginal.y + event.clientY - panStart.y)
    draw()
    return
  }

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
  updateHover(local)
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

  if (key === 'm' || key === 'M') {
    app.setTool('move')
    draw()
    return
  }

  handleViewportKey(event)
  draw()
} // End onKeyDown

watch(() => [cabinet.state.width, cabinet.state.depth, cabinet.state.height, cabinet.state.panelThickness, app.state.currentView], () => {
  draw()
})
watch(() => [drawing.state.panels.length, drawing.state.zones.length, drawing.state.selectedPanelId, app.state.mini3DVisible], draw)
watch(() => [wall.state.width, wall.state.depth, wall.state.height, wall.state.editingDim], draw)
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})
onBeforeUnmount(() => window.removeEventListener('resize', resizeCanvas))
</script>
<style scoped>
.mn-cursor-move {
  cursor: move;
}

.mn-cursor-crosshair {
  cursor: crosshair;
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