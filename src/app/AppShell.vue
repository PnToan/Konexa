<template>
  <div class="mn-app">
    <TopBar />
    <LibraryBar />
    <LeftToolbar />
    <DrawingViewport />
    <BottomParams />
    <RightPanel />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import LibraryBar from '../components/library/LibraryBar.vue'
import LeftToolbar from '../components/layout/LeftToolbar.vue'
import DrawingViewport from '../components/drawing/DrawingViewport.vue'
import BottomParams from '../components/layout/BottomParams.vue'
import RightPanel from '../components/panels/RightPanel.vue'
import { useDrawingStore } from '../stores/useDrawingStore'

const drawingStore = useDrawingStore()

onMounted(() => {
  drawingStore.rebuildZones()
})
</script>
