<template>
  <nav class="mn-library-bar">
    <div class="mn-library-tabs">
      <button class="mn-library-tab active">Thư viện</button>
      <button v-for="item in categories" :key="item.id" class="mn-library-category" :class="{ active: app.state.currentLibrary === item.id }" @click="app.setLibrary(item.id)">
        {{ item.label }}
      </button>
    </div>
    <div class="mn-library-subtabs">
      <button v-for="item in visibleItems" :key="item.id" class="mn-library-item">
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../../stores/useAppStore'

const app = useAppStore()
const categories = [
  { id: 'frame', label: 'Khung' }, { id: 'door', label: 'Cánh' }, { id: 'box', label: 'Hộc' }, { id: 'panel', label: 'Tấm' }
]
const items = [
  { parent: 'frame', id: 'wardrobe', label: 'Quần áo' },
  { parent: 'frame', id: 'lower-kitchen', label: 'Bếp dưới' },
  { parent: 'frame', id: 'upper-kitchen', label: 'Bếp trên' },
  { parent: 'door', id: 'single-door', label: 'Đơn' },
  { parent: 'door', id: 'double-door', label: 'Đôi' },
  { parent: 'door', id: 'drawer-face', label: 'Mặt Hộc' },
  { parent: 'box', id: 'single-drawer', label: 'Hộc đơn' },
  { parent: 'box', id: 'double-drawer', label: 'Hộc đôi' },
  { parent: 'panel', id: 'vertical-panel', label: 'Tấm đứng' },
  { parent: 'panel', id: 'horizontal-panel', label: 'Tấm nằm' }
]
const visibleItems = computed(() => items.filter((item) => item.parent === app.state.currentLibrary))
</script>
