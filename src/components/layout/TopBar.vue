<template>
  <header class="mn-topbar">
    <div class="mn-brand">
      <div class="mn-brand-title">MN_Solution</div>
      <div class="mn-brand-subtitle">Vue CAD / DAC Workspace</div>
    </div>
    <div class="mn-top-actions">
      <button class="mn-btn" @click="newProject">Tạo mới</button>
      <button class="mn-btn">Mở file</button>
      <button class="mn-btn" @click="saveJson">Lưu offline</button>
      <button class="mn-btn mn-btn-primary" @click="exportJson">Xuất file</button>
    </div>
  </header>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useCabinetStore } from '../../stores/useCabinetStore'

const app = useAppStore()
const drawing = useDrawingStore()
const cabinet = useCabinetStore()

function newProject() {
  drawing.state.panels = []
  drawing.clearSelection()
  drawing.rebuildZones()
  app.setStatus('Đã tạo project mới')
}

function projectPayload() {
  return JSON.stringify({ cabinet: cabinet.state, panels: drawing.state.panels }, null, 2)
}

function saveJson() {
  localStorage.setItem('MN_Solution_Project', projectPayload())
  app.setStatus('Đã lưu offline vào trình duyệt')
}

function exportJson() {
  const blob = new Blob([projectPayload()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mn-solution-project.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
