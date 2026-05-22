<template>
  <div class="mn-mini-3d-preview">
    <div class="mn-mini-3d-title">3D PREVIEW</div>
    <div class="mn-mini-3d-box"><canvas ref="canvasRef" class="mn-mini-3d-canvas"></canvas></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { renderPreview3D } from '../../renderers/preview-3d-renderer'

const canvasRef = ref(null)
const cabinet = useCabinetStore()
const drawing = useDrawingStore()
let ctx = null
let ratio = 1

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const rect = canvas.getBoundingClientRect()
  renderPreview3D(ctx, {
    width: rect.width,
    height: rect.height,
    cabinet: cabinet.state,
    panels: drawing.state.panels
  })
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  ratio = window.devicePixelRatio || 1
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  draw()
}

watch(() => [cabinet.state.width, cabinet.state.depth, cabinet.state.height, drawing.state.panels.length], () => setTimeout(draw, 0))
onMounted(() => { resize(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => window.removeEventListener('resize', resize))
</script>
