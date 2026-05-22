<template>
  <aside class="mn-left-toolbar">
    <div class="mn-tool-group">
      <button v-for="tool in tools" :key="tool.id" class="mn-tool-btn" :class="{ active: app.state.currentTool === tool.id }" :title="tool.label" @click="app.setTool(tool.id)">
        <img :src="tool.icon" :alt="tool.label" class="mn-tool-icon" />
      </button>
    </div>
    <div class="mn-tool-separator"></div>
    <div class="mn-tool-group">
      <button class="mn-tool-btn" title="Copy"><img src="/icons/toolbar/copy.svg" alt="Copy" class="mn-tool-icon" /></button>
      <button class="mn-tool-btn" title="Xóa" @click="drawing.deleteSelected()"><img src="/icons/toolbar/delete.svg" alt="Xóa" class="mn-tool-icon" /></button>
      <button class="mn-tool-btn" title="Group"><img src="/icons/toolbar/group.svg" alt="Group" class="mn-tool-icon" /></button>
      <button class="mn-tool-btn" title="Rã Group"><img src="/icons/toolbar/ungroup.svg" alt="Rã Group" class="mn-tool-icon" /></button>
    </div>
  </aside>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'
import { useDrawingStore } from '../../stores/useDrawingStore'

const app = useAppStore()
const drawing = useDrawingStore()
const tools = [
  { id: 'select', label: 'Chọn', icon: '/icons/toolbar/select.svg' },
  { id: 'line', label: 'Line', icon: '/icons/toolbar/line.svg' },
  { id: 'rect', label: 'Khung', icon: '/icons/toolbar/rect.svg' },
  { id: 'panel', label: 'Vẽ Tấm', icon: '/icons/toolbar/panel.svg' },
  { id: 'move', label: 'Di chuyển', icon: '/icons/toolbar/move.svg' },
  { id: 'offset', label: 'Offset', icon: '/icons/toolbar/offset.svg' },
  { id: 'measure', label: 'Đo', icon: '/icons/toolbar/measure.svg' }
]
</script>
