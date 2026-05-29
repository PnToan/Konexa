<template>
  <aside class="mn-left-toolbar">
    <div class="mn-tool-group">
      <button
        v-for="tool in tools"
        :key="tool.id"
        type="button"
        class="mn-tool-btn"
        :class="{ active: app.state.currentTool === tool.id }"
        :title="tool.label"
        @pointerdown.stop.prevent="selectTool(tool.id)"
        @click.stop.prevent="selectTool(tool.id)"
      >
        <img :src="tool.icon" :alt="tool.label" class="mn-tool-icon" />
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'

const app = useAppStore()

const tools = [
  { id: 'select', label: 'Chọn', icon: '/icons/toolbar/select.svg' },
  { id: 'box', label: 'Box', icon: '/icons/toolbar/rect.svg' },
  { id: 'panel', label: 'Vẽ Tấm', icon: '/icons/toolbar/panel.svg' },
  { id: 'move', label: 'Di chuyển', icon: '/icons/toolbar/move.svg' },
  { id: 'dimensions', label: 'Dimensions', icon: '/icons/toolbar/measure.svg' }
]

//=================
function selectTool(toolId) {
  app.setTool(toolId)

  if (toolId === 'select') {
    app.setStatus('Select')
  }
} // End selectTool
</script>