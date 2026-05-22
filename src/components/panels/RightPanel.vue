<template>
  <aside class="mn-right-panel">
    <section class="mn-panel-section compact">
      <div class="mn-panel-title">Module</div>
      <div class="mn-module-list">
        <button class="mn-module-item active">MN Drawing</button>
        <button class="mn-module-item">MN CAD</button>
        <button class="mn-module-item">MN Gcode</button>
      </div>
    </section>
    <section class="mn-panel-section compact">
      <div class="mn-panel-title">State</div>
      <div class="mn-status-box">
        Tool: {{ app.activeToolLabel }}<br />
        View: {{ app.state.currentView }}<br />
        Zone: {{ drawing.state.zones.length }}<br />
        Tấm: {{ drawing.state.panels.length }}<br />
        Chọn: {{ drawing.state.selectedPanelId || 'Không' }}
      </div>
    </section>
    <section class="mn-panel-section compact">
      <div class="mn-panel-title">Hướng dẫn</div>
      <div class="mn-status-box">
        Vẽ Tấm: chọn tool tấm, rê cạnh zone, click.<br />
        Chia zone: nhập /2, /3 rồi Enter khi đang hover zone.<br />
        Move: chọn tấm, kéo hoặc nhập số rồi Enter.
      </div>
    </section>
  </aside>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
const app = useAppStore()
const drawing = useDrawingStore()
</script>
