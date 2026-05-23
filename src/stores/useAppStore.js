import { createSimpleStore } from './createStore'
import { getCameraConfig } from '../core/view/view-camera'

const AXIS_COLOR = {
  X: '#e53935',
  Y: '#2eaf5d',
  Z: '#1e88e5'
}

const VIEW_CONFIG = {
  front: {
    key: 'front',
    label: 'Trước',
    axesText: 'X0Z',
    axisA: 'X',
    axisB: 'Z',
    horizontalAxis: 'X',
    verticalAxis: 'Z',
    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Z,
    reverseHorizontal: false,
    reverseVertical: false,
    originCorner: 'bottom-left'
  },

  back: {
    key: 'back',
    label: 'Sau',
    axesText: 'X0Z đối diện',
    axisA: 'X',
    axisB: 'Z',
    horizontalAxis: 'X',
    verticalAxis: 'Z',
    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Z,
    reverseHorizontal: true,
    reverseVertical: false,
    originCorner: 'bottom-right'
  },

  left: {
    key: 'left',
    label: 'Trái',
    axesText: 'Y0Z',
    axisA: 'Y',
    axisB: 'Z',
    horizontalAxis: 'Y',
    verticalAxis: 'Z',
    horizontalColor: AXIS_COLOR.Y,
    verticalColor: AXIS_COLOR.Z,
    reverseHorizontal: false,
    reverseVertical: false,
    originCorner: 'bottom-left'
  },

  right: {
    key: 'right',
    label: 'Phải',
    axesText: 'Y0Z đối diện',
    axisA: 'Y',
    axisB: 'Z',
    horizontalAxis: 'Y',
    verticalAxis: 'Z',
    horizontalColor: AXIS_COLOR.Y,
    verticalColor: AXIS_COLOR.Z,
    reverseHorizontal: true,
    reverseVertical: false,
    originCorner: 'bottom-right'
  },

  top: {
    key: 'top',
    label: 'Trên',
    axesText: 'X0Y',
    axisA: 'X',
    axisB: 'Y',
    horizontalAxis: 'X',
    verticalAxis: 'Y',
    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Y,
    reverseHorizontal: false,
    reverseVertical: false,
    originCorner: 'bottom-left'
  },

  bottom: {
    key: 'bottom',
    label: 'Dưới',
    axesText: 'X0Y đối diện',
    axisA: 'X',
    axisB: 'Y',
    horizontalAxis: 'X',
    verticalAxis: 'Y',
    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Y,
    reverseHorizontal: true,
    reverseVertical: false,
    originCorner: 'bottom-right'
  }
}

const TOOL_LABEL = {
  select: 'Chọn',
  line: 'Line',
  rect: 'Khung',
  panel: 'Vẽ Tấm',
  move: 'Di chuyển',
  offset: 'Offset',
  measure: 'Đo'
}

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
  mini3DVisible: false,
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
    state.status = `Tool: ${TOOL_LABEL[tool] || tool}`
  },

  setView(view) {
    if (!VIEW_CONFIG[view]) return
    state.currentView = view
    state.status = `Mặt: ${VIEW_CONFIG[view].label}`
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
    state.mouse.worldX = payload.worldX || 0
    state.mouse.worldY = payload.worldY || 0
    state.mouse.worldZ = payload.worldZ || 0
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

  getViewConfig(view = state.currentView) {
    const camera = getCameraConfig(view)
    const axisA = camera.axisU.toUpperCase()
    const axisB = camera.axisV.toUpperCase()

    return {
      key: camera.key,
      label: camera.label,
      axesText: `${axisA}0${axisB}${camera.reverseU ? ' đối diện' : ''}`,
      axisA,
      axisB,
      horizontalAxis: axisA,
      verticalAxis: axisB,
      horizontalColor: AXIS_COLOR[axisA],
      verticalColor: AXIS_COLOR[axisB],
      reverseHorizontal: camera.reverseU,
      reverseVertical: camera.reverseV,
      originCorner: camera.reverseU ? 'bottom-right' : 'bottom-left'
    }
  },

  getActiveToolLabel() {
    return TOOL_LABEL[state.currentTool] || state.currentTool
  },

  getActiveViewLabel() {
    return getCameraConfig(state.currentView).label
  },

  getActiveViewAxesText() {
    const camera = getCameraConfig(state.currentView)
    const axisA = camera.axisU.toUpperCase()
    const axisB = camera.axisV.toUpperCase()

    return `${axisA}0${axisB}${camera.reverseU ? ' đối diện' : ''}`
  }
}))

export function useAppStore() {
  return store
}

export function getViewConfig(view) {
  const camera = getCameraConfig(view)
  const axisA = camera.axisU.toUpperCase()
  const axisB = camera.axisV.toUpperCase()

  return {
    key: camera.key,
    label: camera.label,
    axesText: `${axisA}0${axisB}${camera.reverseU ? ' đối diện' : ''}`,
    axisA,
    axisB,
    horizontalAxis: axisA,
    verticalAxis: axisB,
    horizontalColor: AXIS_COLOR[axisA],
    verticalColor: AXIS_COLOR[axisB],
    reverseHorizontal: camera.reverseU,
    reverseVertical: camera.reverseV,
    originCorner: camera.reverseU ? 'bottom-right' : 'bottom-left'
  }
}