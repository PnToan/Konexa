<template>
  <div class="mn-app" :class="{ 'mn-right-panel-hidden': isRightPanelHidden }">
    <TopBar />
    <LibraryBar />
    <LeftToolbar />
    <DrawingViewport />
    <BottomParams />

    <RightPanel />

    <button
      class="mn-right-panel-tab"
      type="button"
      @click="toggleRightPanel"
    >
      {{ isRightPanelHidden ? 'Mở' : 'Ẩn' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import LibraryBar from '../components/library/LibraryBar.vue'
import LeftToolbar from '../components/layout/LeftToolbar.vue'
import DrawingViewport from '../components/drawing/DrawingViewport.vue'
import BottomParams from '../components/layout/BottomParams.vue'
import RightPanel from '../components/panels/RightPanel.vue'
import { useDrawingStore } from '../stores/useDrawingStore'
import { useAppStore } from '../stores/useAppStore'

const drawingStore = useDrawingStore()
const app = useAppStore()
const isRightPanelHidden = ref(true)

//=================
function toggleRightPanel() {
  isRightPanelHidden.value = !isRightPanelHidden.value

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
} // End toggleRightPanel

//=================
function onGlobalKeyDown(event) {
  const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space'

  if (!isSpace) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  app.setTool('select')
  app.setStatus('Select')
} // End onGlobalKeyDown

onMounted(() => {
  drawingStore.rebuildZones()
  window.addEventListener('keydown', onGlobalKeyDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
})
</script>