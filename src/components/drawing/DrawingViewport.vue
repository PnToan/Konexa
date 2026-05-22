<template>
  <main class="mn-canvas-area" ref="viewportRef" tabindex="0" @keydown="onKeyDown">
    <canvas ref="canvasRef" class="mn-draw-canvas"
      @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointerleave="onPointerUp" @wheel.prevent="onWheel" @contextmenu.prevent />
    <Mini3DPreview v-if="app.state.mini3DVisible" />
    <div class="mn-quick-view-bar">
      <button v-for="view in views" :key="view.id" class="mn-quick-view-btn" :class="{ active: app.state.currentView === view.id }" @click="app.setView(view.id)">{{ view.label }}</button>
    </div>
    <button class="mn-preview-toggle" @click="app.toggleMini3D">{{ app.state.mini3DVisible ? 'Ẩn 3D' : 'Hiện 3D' }}</button>
    <div class="mn-axis-widget" title="3D Preview">
      <div class="mn-joystick-outer"><div class="mn-joystick-inner"><span class="mn-joystick-label">3D</span></div></div>
    </div>
    <div class="mn-viewport-info">
      Tool: {{ app.activeToolLabel }} | X: {{ localX }} | Y: {{ localY }} | Zoom: {{ zoomLabel }}
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Mini3DPreview from '../preview/Mini3DPreview.vue'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { renderCanvas2D } from '../../renderers/canvas-2d-renderer'
import { screenToLocal } from '../../renderers/viewport-transform'
import { hitTestPanel, hitTestZoneEdge } from '../../core/snap/snap-engine'
import { handleViewportKey } from '../../commands/keyboard-controller'

const app = useAppStore()
const cabinet = useCabinetStore()
const drawing = useDrawingStore()
const viewportRef = ref(null)
const canvasRef = ref(null)
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

function draw() {
  if (!ctx || !canvasRef.value) return
  const viewport = app.state.viewport
  renderCanvas2D(ctx, {
    width: viewport.width,
    height: viewport.height,
    viewport,
    cabinetRect: cabinet.cabinetRect2D(),
    zones: drawing.state.zones,
    panels: drawing.state.panels,
    hover: drawing.state.hover,
    selectedPanelId: drawing.state.selectedPanelId,
    showGrid: app.state.showGrid
  })
}

function localFromEvent(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const local = screenToLocal(app.state.viewport, x, y)
  app.setMouse({ x, y, localX: local.x, localY: local.y })
  return local
}

function updateHover(local) {
  const tolerance = 12 / (app.state.viewport.localScale * app.state.viewport.zoom)
  const panelHit = hitTestPanel(drawing.state.panels, local)
  const edgeHit = hitTestZoneEdge(drawing.state.zones, local, tolerance)
  if (app.state.currentTool === 'panel') drawing.setHover(edgeHit)
  else drawing.setHover(panelHit || edgeHit)
}

function onPointerDown(event) {
  viewportRef.value.focus()
  const local = localFromEvent(event)

  if (event.button === 1 || event.button === 2 || event.shiftKey) {
    panning = true
    panStart = { x: event.clientX, y: event.clientY }
    panOriginal = { x: app.state.viewport.panX, y: app.state.viewport.panY }
    return
  }

  const panelHit = hitTestPanel(drawing.state.panels, local)
  if (app.state.currentTool === 'panel' && drawing.state.hover?.type === 'zone-edge') {
    drawing.addPanelFromHover()
    draw()
    return
  }

  if ((app.state.currentTool === 'select' || app.state.currentTool === 'move') && panelHit) {
    drawing.selectPanel(panelHit.panel.id)
    if (app.state.currentTool === 'move') drawing.startMove(panelHit.panel.id, local)
  } else if (app.state.currentTool === 'select') {
    drawing.clearSelection()
  }
  draw()
}

function onPointerMove(event) {
  const local = localFromEvent(event)
  if (panning && panStart && panOriginal) {
    app.setPan(panOriginal.x + event.clientX - panStart.x, panOriginal.y + event.clientY - panStart.y)
    draw()
    return
  }
  if (drawing.state.drag.active) {
    drawing.updateMove(local, event.altKey)
    draw()
    return
  }
  updateHover(local)
  draw()
}

function onPointerUp() {
  panning = false
  drawing.endMove()
}

function onWheel(event) {
  const direction = event.deltaY < 0 ? 1 : -1
  const next = app.state.viewport.zoom * (direction > 0 ? 1.12 : 0.88)
  app.setZoom(next)
  draw()
}

function onKeyDown(event) {
  handleViewportKey(event)
  nextTick(draw)
}

watch(() => [cabinet.state.width, cabinet.state.depth, cabinet.state.height, cabinet.state.panelThickness, app.state.currentView], () => {
  drawing.rebuildZones()
  draw()
})
watch(() => [drawing.state.panels.length, drawing.state.zones.length, drawing.state.selectedPanelId, app.state.mini3DVisible], draw)

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})
onBeforeUnmount(() => window.removeEventListener('resize', resizeCanvas))
</script>
