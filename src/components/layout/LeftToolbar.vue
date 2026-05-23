<template>
  <aside class="mn-left-toolbar">
    <div class="mn-tool-group">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="mn-tool-btn"
        :class="{ active: app.state.currentTool === tool.id }"
        :title="tool.label"
        @click="app.setTool(tool.id)"
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
  { id: 'box', label: 'Box', icon: '/icons/toolbar/rect.svg' },
  { id: 'panel', label: 'Vẽ Tấm', icon: '/icons/toolbar/panel.svg' },
  { id: 'move', label: 'Di chuyển', icon: '/icons/toolbar/move.svg' }
]
</script>