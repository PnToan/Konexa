import { localToScreen, getLocalScale } from './viewport-transform'
import { projectBoxToCameraRect } from '../core/view/view-camera'

//=================
function drawLine(ctx, a, b, color = '#999', width = 1) {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
} // End drawLine

//=================
function drawRectLocal(ctx, viewport, rect, options = {}) {
  if (!rect) return

  const p1 = localToScreen(viewport, rect.x, rect.y)
  const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)

  const x = Math.min(p1.x, p2.x)
  const y = Math.min(p1.y, p2.y)
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)

  if (options.fill) {
    ctx.fillStyle = options.fill
    ctx.fillRect(x, y, w, h)
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke
    ctx.lineWidth = options.lineWidth || 1
    ctx.strokeRect(x, y, w, h)
  }
} // End drawRectLocal

//=================
function drawGrid(ctx, viewport, width, height) {
  const scale = getLocalScale(viewport)
  const stepLocal = 100
  const stepScreen = stepLocal * scale

  if (stepScreen < 8) return

  const originX = viewport.localOriginX + viewport.panX
  const originY = viewport.localOriginY + viewport.panY

  const startX = Math.floor((0 - originX) / scale / stepLocal) * stepLocal
  const endX = Math.ceil((width - originX) / scale / stepLocal) * stepLocal
  const startY = Math.floor((originY - height) / scale / stepLocal) * stepLocal
  const endY = Math.ceil(originY / scale / stepLocal) * stepLocal

  ctx.beginPath()
  ctx.strokeStyle = '#e1e1e1'
  ctx.lineWidth = 1

  for (let x = startX; x <= endX; x += stepLocal) {
    const sx = localToScreen(viewport, x, 0).x
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, height)
  }

  for (let y = startY; y <= endY; y += stepLocal) {
    const sy = localToScreen(viewport, 0, y).y
    ctx.moveTo(0, sy)
    ctx.lineTo(width, sy)
  }

  ctx.stroke()
} // End drawGrid

//=================
function drawRulers(ctx, viewport, width, height) {
  const topH = viewport.rulerTopHeight
  const leftW = viewport.rulerLeftWidth
  const scale = getLocalScale(viewport)
  const stepLocal = 500

  ctx.fillStyle = '#eeeeee'
  ctx.fillRect(0, 0, width, topH)
  ctx.fillRect(0, 0, leftW, height)

  ctx.strokeStyle = '#9a9a9a'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, width, topH)
  ctx.strokeRect(0, 0, leftW, height)

  ctx.fillStyle = '#333333'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const originX = viewport.localOriginX + viewport.panX
  const originY = viewport.localOriginY + viewport.panY

  const startX = Math.floor((0 - originX) / scale / stepLocal) * stepLocal
  const endX = Math.ceil((width - originX) / scale / stepLocal) * stepLocal
  const startY = Math.floor((originY - height) / scale / stepLocal) * stepLocal
  const endY = Math.ceil(originY / scale / stepLocal) * stepLocal

  for (let x = startX; x <= endX; x += stepLocal) {
    const sx = localToScreen(viewport, x, 0).x
    if (sx < leftW) continue

    drawLine(ctx, { x: sx, y: topH - 6 }, { x: sx, y: topH }, '#777')
    ctx.fillText(String(x), sx, 11)
  }

  ctx.textAlign = 'right'

  for (let y = startY; y <= endY; y += stepLocal) {
    const sy = localToScreen(viewport, 0, y).y
    if (sy < topH) continue

    drawLine(ctx, { x: leftW - 6, y: sy }, { x: leftW, y: sy }, '#777')
    ctx.fillText(String(y), leftW - 8, sy)
  }

  const origin = localToScreen(viewport, 0, 0)

  drawLine(ctx, { x: origin.x, y: 0 }, { x: origin.x, y: height }, '#3fa9f5', 1)
  drawLine(ctx, { x: 0, y: origin.y }, { x: width, y: origin.y }, '#3fa9f5', 1)
} // End drawRulers

//=================
function drawWallHatch(ctx, viewport, rect) {
  if (!rect) return

  const p1 = localToScreen(viewport, rect.x, rect.y)
  const p2 = localToScreen(viewport, rect.x + rect.width, rect.y + rect.height)

  const x = Math.min(p1.x, p2.x)
  const y = Math.min(p1.y, p2.y)
  const w = Math.abs(p2.x - p1.x)
  const h = Math.abs(p2.y - p1.y)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  ctx.strokeStyle = 'rgba(90, 90, 90, 0.35)'
  ctx.lineWidth = 1

  const step = 18

  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath()
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + h, y)
    ctx.stroke()
  }

  ctx.restore()
} // End drawWallHatch

//=================
function drawWall(ctx, viewport, wallRect) {
  if (!wallRect) return

  drawRectLocal(ctx, viewport, wallRect, {
    fill: '#b8b8b8',
    stroke: '#666666',
    lineWidth: 2
  })

  drawWallHatch(ctx, viewport, wallRect)
} // End drawWall

//=================
function drawWallDims(ctx, viewport, wallRect, editingDim) {
  if (!wallRect) return

  const leftTop = localToScreen(viewport, wallRect.x, wallRect.y + wallRect.height)
  const rightTop = localToScreen(viewport, wallRect.x + wallRect.width, wallRect.y + wallRect.height)
  const leftBottom = localToScreen(viewport, wallRect.x, wallRect.y)

  const topDimY = leftTop.y - 34
  const leftDimX = leftTop.x - 42

  const widthColor = editingDim === 'width' ? '#ff9f1a' : '#333333'
  const heightColor = editingDim === 'height' ? '#ff9f1a' : '#333333'

  drawLine(ctx, { x: leftTop.x, y: topDimY }, { x: rightTop.x, y: topDimY }, widthColor, 2)
  drawLine(ctx, { x: leftDimX, y: leftTop.y }, { x: leftDimX, y: leftBottom.y }, heightColor, 2)

  drawLine(ctx, { x: leftTop.x, y: topDimY - 6 }, { x: leftTop.x, y: topDimY + 6 }, widthColor, 2)
  drawLine(ctx, { x: rightTop.x, y: topDimY - 6 }, { x: rightTop.x, y: topDimY + 6 }, widthColor, 2)
  drawLine(ctx, { x: leftDimX - 6, y: leftTop.y }, { x: leftDimX + 6, y: leftTop.y }, heightColor, 2)
  drawLine(ctx, { x: leftDimX - 6, y: leftBottom.y }, { x: leftDimX + 6, y: leftBottom.y }, heightColor, 2)

  ctx.fillStyle = '#111111'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (editingDim !== 'width') {
    ctx.fillText(String(Math.round(wallRect.width)), (leftTop.x + rightTop.x) / 2, topDimY - 12)
  }

  if (editingDim !== 'height') {
    ctx.save()
    ctx.translate(leftDimX - 16, (leftTop.y + leftBottom.y) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(String(Math.round(wallRect.height)), 0, 0)
    ctx.restore()
  }
} // End drawWallDims

//=================
function hitTestWallDim(viewport, wallRect, screenX, screenY) {
  if (!wallRect) return null

  const leftTop = localToScreen(viewport, wallRect.x, wallRect.y + wallRect.height)
  const rightTop = localToScreen(viewport, wallRect.x + wallRect.width, wallRect.y + wallRect.height)
  const leftBottom = localToScreen(viewport, wallRect.x, wallRect.y)

  const topDimY = leftTop.y - 34
  const leftDimX = leftTop.x - 42

  const widthTextX = (leftTop.x + rightTop.x) / 2
  const widthTextY = topDimY - 12
  const heightTextX = leftDimX - 16
  const heightTextY = (leftTop.y + leftBottom.y) / 2

  const widthTextHit =
    Math.abs(screenX - widthTextX) <= 48 &&
    Math.abs(screenY - widthTextY) <= 18

  if (widthTextHit) return 'width'

  const heightTextHit =
    Math.abs(screenX - heightTextX) <= 28 &&
    Math.abs(screenY - heightTextY) <= 48

  if (heightTextHit) return 'height'

  const widthLineHit =
    screenX >= Math.min(leftTop.x, rightTop.x) - 18 &&
    screenX <= Math.max(leftTop.x, rightTop.x) + 18 &&
    Math.abs(screenY - topDimY) <= 22

  if (widthLineHit) return 'width'

  const heightLineHit =
    Math.abs(screenX - leftDimX) <= 22 &&
    screenY >= Math.min(leftTop.y, leftBottom.y) - 18 &&
    screenY <= Math.max(leftTop.y, leftBottom.y) + 18

  if (heightLineHit) return 'height'

  return null
} // End hitTestWallDim

//=================
function drawZoneOverlay(ctx, viewport, zones = [], hover) {
  zones.forEach((zone) => {
    drawRectLocal(ctx, viewport, zone, {
      stroke: 'rgba(63, 169, 245, 0.32)',
      lineWidth: 1
    })

    const center = localToScreen(viewport, zone.x + zone.width / 2, zone.y + zone.height / 2)

    ctx.fillStyle = 'rgba(63, 169, 245, 0.65)'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(zone.name, center.x, center.y)
  })

  if (hover && hover.type === 'zone-edge') {
    const a = localToScreen(viewport, hover.segment.x1, hover.segment.y1)
    const b = localToScreen(viewport, hover.segment.x2, hover.segment.y2)

    drawLine(ctx, a, b, '#ff9f1a', 4)
  }
} // End drawZoneOverlay

//=================
function drawPanelGrip(ctx, viewport, point, active = false) {
  const screenPoint = localToScreen(viewport, point.x, point.y)

  ctx.save()
  ctx.fillStyle = active ? '#ff9f1a' : '#ffffff'
  ctx.strokeStyle = '#0077CC'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(screenPoint.x, screenPoint.y, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
} // End drawPanelGrip

//=================
function getPanelRect(panel) {
  if (!panel) return null

  return {
    x: panel.x,
    y: panel.y,
    width: panel.width,
    height: panel.height || panel.depth || panel.thickness || 18
  }
} // End getPanelRect

//=================
function drawPanels(ctx, viewport, panels = [], selectedPanelId) {
  panels.forEach((panel) => {
    const rect = getPanelRect(panel)

    if (!rect) return

    const selected = panel.id === selectedPanelId

    drawRectLocal(ctx, viewport, rect, {
      fill: selected ? 'rgba(0, 119, 204, 0.18)' : 'rgba(0, 119, 204, 0.10)',
      stroke: selected ? '#0077CC' : 'rgba(0, 119, 204, 0.65)',
      lineWidth: selected ? 2 : 1
    })

    const center = localToScreen(viewport, rect.x + rect.width / 2, rect.y + rect.height / 2)

    ctx.fillStyle = '#0077CC'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(panel.name || 'Tấm', center.x, center.y)

    if (!selected) return

    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y + rect.height })
    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y + rect.height })
  })
} // End drawPanels

//=================
function drawSnapPreview(ctx, viewport, snapPreview) {
  if (!snapPreview) return

  const point = localToScreen(viewport, snapPreview.x, snapPreview.y)

  ctx.save()
  ctx.strokeStyle = '#0077CC'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2

  if (snapPreview.type === 'corner') {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  if (snapPreview.type === 'edge') {
    ctx.beginPath()
    ctx.rect(point.x - 5, point.y - 5, 10, 10)
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
} // End drawSnapPreview

//=================
function getBoxViewDimKeys(currentView = 'top') {
  if (currentView === 'front' || currentView === 'back') {
    return {
      horizontal: 'width',
      vertical: 'height'
    }
  }

  if (currentView === 'left' || currentView === 'right') {
    return {
      horizontal: 'depth',
      vertical: 'height'
    }
  }

  return {
    horizontal: 'width',
    vertical: 'depth'
  }
} // End getBoxViewDimKeys

//=================
function drawBoxDims(ctx, viewport, box, editingDim, currentView = 'top') {
  if (!box) return

  const boxRect = projectBoxToCameraRect(box, currentView)
  const viewDim = getBoxViewDimKeys(currentView)

  const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
  const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
  const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

  const topDimY = leftTop.y - 30
  const leftDimX = leftTop.x - 36

  const widthColor = editingDim === viewDim.horizontal ? '#ff9f1a' : '#0077CC'
  const heightColor = editingDim === viewDim.vertical ? '#ff9f1a' : '#0077CC'

  drawLine(ctx, { x: leftTop.x, y: topDimY }, { x: rightTop.x, y: topDimY }, widthColor, 2)
  drawLine(ctx, { x: leftDimX, y: leftTop.y }, { x: leftDimX, y: leftBottom.y }, heightColor, 2)

  drawLine(ctx, { x: leftTop.x, y: topDimY - 5 }, { x: leftTop.x, y: topDimY + 5 }, widthColor, 2)
  drawLine(ctx, { x: rightTop.x, y: topDimY - 5 }, { x: rightTop.x, y: topDimY + 5 }, widthColor, 2)
  drawLine(ctx, { x: leftDimX - 5, y: leftTop.y }, { x: leftDimX + 5, y: leftTop.y }, heightColor, 2)
  drawLine(ctx, { x: leftDimX - 5, y: leftBottom.y }, { x: leftDimX + 5, y: leftBottom.y }, heightColor, 2)

  ctx.fillStyle = '#0077CC'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (editingDim !== viewDim.horizontal) {
    ctx.fillText(String(Math.round(box[viewDim.horizontal])), (leftTop.x + rightTop.x) / 2, topDimY - 12)
  }

  if (editingDim !== viewDim.vertical) {
    ctx.save()
    ctx.translate(leftDimX - 16, (leftTop.y + leftBottom.y) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(String(Math.round(box[viewDim.vertical])), 0, 0)
    ctx.restore()
  }
} // End drawBoxDims

//=================
function drawBoxes(ctx, viewport, boxes = [], selectedBoxId, editingDim, currentView = 'top') {
  boxes.forEach((box) => {
    const boxRect = projectBoxToCameraRect(box, currentView)

    drawRectLocal(ctx, viewport, boxRect, {
      fill: box.color || 'rgba(0, 119, 204, 0.12)',
      stroke: '#0077CC',
      lineWidth: selectedBoxId === box.id ? 3 : 2
    })

    const center = localToScreen(
      viewport,
      boxRect.x + boxRect.width / 2,
      boxRect.y + boxRect.height / 2
    )

    ctx.fillStyle = '#0077CC'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(box.name || 'Box', center.x, center.y)

    drawBoxDims(ctx, viewport, box, editingDim, currentView)
  })
} // End drawBoxes

//=================
function drawBoxDraft(ctx, viewport, draftRect, currentView = 'top') {
  if (!draftRect) return
  if (currentView !== 'top') return
  if (draftRect.width <= 1 || draftRect.depth <= 1) return

  drawRectLocal(ctx, viewport, {
    x: draftRect.x,
    y: draftRect.y,
    width: draftRect.width,
    height: draftRect.depth
  }, {
    fill: 'rgba(0, 119, 204, 0.12)',
    stroke: '#0077CC',
    lineWidth: 2
  })
} // End drawBoxDraft

//=================
function hitTestBoxDim(viewport, boxes = [], screenX, screenY, currentView = 'top') {
  const viewDim = getBoxViewDimKeys(currentView)

  for (let i = boxes.length - 1; i >= 0; i -= 1) {
    const box = boxes[i]
    const boxRect = projectBoxToCameraRect(box, currentView)

    const leftTop = localToScreen(viewport, boxRect.x, boxRect.y + boxRect.height)
    const rightTop = localToScreen(viewport, boxRect.x + boxRect.width, boxRect.y + boxRect.height)
    const leftBottom = localToScreen(viewport, boxRect.x, boxRect.y)

    const topDimY = leftTop.y - 30
    const leftDimX = leftTop.x - 36

    const horizontalTextX = (leftTop.x + rightTop.x) / 2
    const horizontalTextY = topDimY - 12
    const verticalTextX = leftDimX - 16
    const verticalTextY = (leftTop.y + leftBottom.y) / 2

    const horizontalTextHit =
      Math.abs(screenX - horizontalTextX) <= 48 &&
      Math.abs(screenY - horizontalTextY) <= 18

    if (horizontalTextHit) {
      return {
        boxId: box.id,
        key: viewDim.horizontal
      }
    }

    const verticalTextHit =
      Math.abs(screenX - verticalTextX) <= 28 &&
      Math.abs(screenY - verticalTextY) <= 48

    if (verticalTextHit) {
      return {
        boxId: box.id,
        key: viewDim.vertical
      }
    }

    const horizontalLineHit =
      screenX >= Math.min(leftTop.x, rightTop.x) - 18 &&
      screenX <= Math.max(leftTop.x, rightTop.x) + 18 &&
      Math.abs(screenY - topDimY) <= 22

    if (horizontalLineHit) {
      return {
        boxId: box.id,
        key: viewDim.horizontal
      }
    }

    const verticalLineHit =
      Math.abs(screenX - leftDimX) <= 22 &&
      screenY >= Math.min(leftTop.y, leftBottom.y) - 18 &&
      screenY <= Math.max(leftTop.y, leftBottom.y) + 18

    if (verticalLineHit) {
      return {
        boxId: box.id,
        key: viewDim.vertical
      }
    }
  }

  return null
} // End hitTestBoxDim

//=================
export function getWallDimHit(viewport, wallRect, screenX, screenY) {
  return hitTestWallDim(viewport, wallRect, screenX, screenY)
} // End getWallDimHit

//=================
export function getBoxDimHit(viewport, boxes, screenX, screenY, currentView = 'top') {
  return hitTestBoxDim(viewport, boxes, screenX, screenY, currentView)
} // End getBoxDimHit

//=================
export function renderCanvas2D(ctx, payload) {
  const {
    width,
    height,
    viewport,
    currentView,
    wallRect,
    wallEditingDim,
    zones,
    panels,
    boxes,
    boxDraftRect,
    boxEditingDim,
    hover,
    snapPreview,
    selectedPanelId,
    selectedBoxId,
    showGrid
  } = payload

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(0, 0, width, height)

  if (showGrid) drawGrid(ctx, viewport, width, height)

  if (wallRect) {
    drawWall(ctx, viewport, wallRect)
    drawWallDims(ctx, viewport, wallRect, wallEditingDim)
  }

  drawZoneOverlay(ctx, viewport, zones, hover)
  drawBoxes(ctx, viewport, boxes, selectedBoxId, boxEditingDim, currentView)
  drawBoxDraft(ctx, viewport, boxDraftRect, currentView)
  drawPanels(ctx, viewport, panels, selectedPanelId)
  drawSnapPreview(ctx, viewport, snapPreview)
  drawRulers(ctx, viewport, width, height)
} // End renderCanvas2D