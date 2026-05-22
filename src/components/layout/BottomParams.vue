<template>
  <section class="mn-bottom-params">
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Rộng</label>
      <input class="mn-bottom-param-input" type="number" v-model.number="cabinet.state.width" @change="onCabinetChange" />
    </div>
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Sâu</label>
      <input class="mn-bottom-param-input" type="number" v-model.number="cabinet.state.depth" @change="onCabinetChange" />
    </div>
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Cao</label>
      <input class="mn-bottom-param-input" type="number" v-model.number="cabinet.state.height" @change="onCabinetChange" />
    </div>
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Dày tấm</label>
      <input class="mn-bottom-param-input" type="number" v-model.number="cabinet.state.panelThickness" @change="onCabinetChange" />
    </div>
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Đơn vị</label>
      <select class="mn-bottom-param-input" v-model="cabinet.state.unit">
        <option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option>
      </select>
    </div>
    <div class="mn-bottom-param-status">
      {{ app.state.status }} <span v-if="app.state.commandBuffer"> | Lệnh: {{ app.state.commandBuffer }}</span>
    </div>
  </section>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useDrawingStore } from '../../stores/useDrawingStore'

const app = useAppStore()
const cabinet = useCabinetStore()
const drawing = useDrawingStore()
function onCabinetChange() {
  drawing.rebuildZones()
  app.setStatus('Đã cập nhật kích thước tủ')
}
</script>
