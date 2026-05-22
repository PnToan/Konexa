import { computed } from 'vue'
import { createSimpleStore } from './createStore'

const store = createSimpleStore({
  appName: 'MN_Solution',
  appVersion: '0.1.0',
  appMode: 'Vue Clean Build',
  currentTool: 'select',
  currentView: 'top',
  currentLibrary: 'frame',
  currentLibraryMain: 'library',
  status: 'Sẵn sàng',
  showGrid: true,
  mini3DVisible: true,
  commandBuffer: '',
  mouse: { x: 0, y: 0, localX: 0, localY: 0 },
  viewport: {
    width: 0,
    height: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    localScale: 0.5,
    localOriginRatioX: 0.2,
    localOriginRatioY: 0.8,
    localOriginX: 0,
    localOriginY: 0,
    rulerTopHeight: 28,
    rulerLeftWidth: 42
  }
}, (state) => ({
  setTool(tool) {
    state.currentTool = tool
    state.commandBuffer = ''
    state.status = `Tool: ${tool}`
  },
  setView(view) {
    state.currentView = view
    state.status = `View: ${view}`
  },
  setLibrary(library) {
    state.currentLibrary = library
  },
  setStatus(status) {
    state.status = status
  },
  setMouse(payload) {
    state.mouse.x = payload.x
    state.mouse.y = payload.y
    state.mouse.localX = payload.localX
    state.mouse.localY = payload.localY
  },
  setViewportSize(width, height) {
    state.viewport.width = width
    state.viewport.height = height
    state.viewport.localOriginX = Math.round(width * state.viewport.localOriginRatioX)
    state.viewport.localOriginY = Math.round(height * state.viewport.localOriginRatioY)
  },
  setPan(panX, panY) {
    state.viewport.panX = panX
    state.viewport.panY = panY
  },
  setZoom(zoom) {
    state.viewport.zoom = Math.min(6, Math.max(0.15, zoom))
  },
  appendCommand(char) {
    state.commandBuffer += char
  },
  clearCommand() {
    state.commandBuffer = ''
  },
  toggleMini3D() {
    state.mini3DVisible = !state.mini3DVisible
  },
  activeToolLabel: computed(() => ({
    select: 'Chọn', line: 'Line', rect: 'Khung', panel: 'Vẽ Tấm', move: 'Di chuyển', offset: 'Offset', measure: 'Đo'
  }[state.currentTool] || state.currentTool))
}))

export function useAppStore() {
  return store
}
