import { localToScreen, getLocalScale } from './viewport-transform'
import { projectBoxToCameraRect, getCameraConfig } from '../core/view/view-camera'

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
    const isHoverZone = hover?.type === 'zone-edge' && hover.zone?.id === zone.id

    drawRectLocal(ctx, viewport, zone, {
      fill: isHoverZone ? 'rgba(255, 182, 193, 0.28)' : null,
      stroke: isHoverZone ? 'rgba(255, 105, 180, 0.65)' : 'rgba(63, 169, 245, 0.28)',
      lineWidth: isHoverZone ? 2 : 1
    })
  })

  if (hover && hover.type === 'zone-edge') {
    const a = localToScreen(viewport, hover.segment.x1, hover.segment.y1)
    const b = localToScreen(viewport, hover.segment.x2, hover.segment.y2)

    drawLine(ctx, a, b, '#ff2f92', 5)
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
function getPanelAxisMin(panel, axis) {
  if (axis === 'x') return Number(panel.x || 0)
  if (axis === 'y') return Number((panel.y3d ?? panel.worldY ?? panel.depthY ?? panel.y) || 0)
  if (axis === 'z') return Number(panel.z ?? panel.y ?? 0)

  return 0
} // End getPanelAxisMin

//=================
function getPanelAxisSize(panel, axis) {
  if (axis === 'x') return Number(panel.xSize ?? panel.width ?? 0)
  if (axis === 'y') return Number(panel.ySize ?? panel.depth ?? 0)
  if (axis === 'z') return Number(panel.zSize ?? panel.height ?? panel.thickness ?? 0)

  return 0
} // End getPanelAxisSize

//=================
function projectPanelAxisValue(value, size, reverse) {
  if (reverse) return -(value + size)

  return value
} // End projectPanelAxisValue

//=================
function getPanelRect(panel, currentView = 'front') {
  if (!panel) return null

  const camera = getCameraConfig(currentView)
  const uMin = getPanelAxisMin(panel, camera.axisU)
  const vMin = getPanelAxisMin(panel, camera.axisV)
  const uSize = getPanelAxisSize(panel, camera.axisU)
  const vSize = getPanelAxisSize(panel, camera.axisV)

  if (uSize <= 0 || vSize <= 0) return null

  return {
    x: projectPanelAxisValue(uMin, uSize, camera.reverseU),
    y: projectPanelAxisValue(vMin, vSize, camera.reverseV),
    width: uSize,
    height: vSize
  }
} // End getPanelRect

//=================
function drawPanels(ctx, viewport, panels = [], selectedPanelId, currentView = 'front') {
  panels.forEach((panel) => {
    const rect = getPanelRect(panel, currentView)

    if (!rect) return

    const selected = panel.id === selectedPanelId

    drawRectLocal(ctx, viewport, rect, {
      fill: 'rgba(0, 64, 160, 0.90)',
      stroke: selected ? '#ff9f1a' : '#002f78',
      lineWidth: selected ? 3 : 2
    })

    if (!selected) return

    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y })
    drawPanelGrip(ctx, viewport, { x: rect.x + rect.width, y: rect.y + rect.height })
    drawPanelGrip(ctx, viewport, { x: rect.x, y: rect.y + rect.height })
  })
} // End drawPanels


//=================
function drawMovePreviewTarget(ctx, viewport, movePreviewTarget, currentView = 'front') {
  if (!movePreviewTarget?.target) return

  const targetType = movePreviewTarget.type
  const target = movePreviewTarget.target

  ctx.save()
  ctx.setLineDash([8, 5])

  if (targetType === 'panel') {
    const rect = getPanelRect(target, currentView)

    if (rect) {
      drawRectLocal(ctx, viewport, rect, {
        fill: 'rgba(37, 99, 235, 0.22)',
        stroke: '#2563eb',
        lineWidth: 2
      })
    }
  }

  if (targetType === 'box') {
    const rect = projectBoxToCameraRect(target, currentView)

    if (rect) {
      drawRectLocal(ctx, viewport, rect, {
        fill: 'rgba(37, 99, 235, 0.18)',
        stroke: '#2563eb',
        lineWidth: 2
      })
    }
  }

  ctx.restore()
} // End drawMovePreviewTarget

//=================
function drawMoveHoverSnapPoints(ctx, viewport, moveHoverSnapPoints = []) {
  if (!Array.isArray(moveHoverSnapPoints) || moveHoverSnapPoints.length === 0) return

  ctx.save()

  moveHoverSnapPoints.forEach((snapPoint) => {
    const point = localToScreen(viewport, snapPoint.x, snapPoint.y)

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ff9f1a'
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  ctx.restore()
} // End drawMoveHoverSnapPoints

//=================
function drawPanelPreviewItems(ctx, viewport, previewItems = [], hover, currentView = 'front') {
  if (!Array.isArray(previewItems) || previewItems.length === 0) return

  const firstPreview = previewItems[0]
  const isDividePreview = firstPreview.panelDivideCount && hover?.zone

  ctx.save()
  ctx.setLineDash([8, 5])

  previewItems.forEach((panel) => {
    const rect = getPanelRect(panel, currentView)

    if (!rect) return

    drawRectLocal(ctx, viewport, rect, {
      fill: 'rgba(0, 64, 160, 0.55)',
      stroke: '#002f78',
      lineWidth: 2
    })
  })

  ctx.restore()

  if (isDividePreview) {
    drawDivideClearPreview(ctx, viewport, hover.zone, previewItems)
  }
} // End drawPanelPreviewItems
//=================
function drawDivideClearPreview(ctx, viewport, zone, previewItems = []) {
  if (!zone || !Array.isArray(previewItems) || previewItems.length === 0) return

  const firstPreview = previewItems[0]
  const divideCount = Number(firstPreview.panelDivideCount || 0)
  const thickness = Number(firstPreview.thickness || firstPreview.panelThickness || 18)

  if (!Number.isFinite(divideCount) || divideCount < 2) return

  const isVerticalDivide = firstPreview.panelSide === 'split_vertical'
  const zoneX = Number(zone.x || 0)
  const zoneY = Number(zone.y || 0)
  const zoneWidth = Number(zone.width || 0)
  const zoneHeight = Number(zone.height || 0)

  if (zoneWidth <= 0 || zoneHeight <= 0) return

  const clearSize = isVerticalDivide
    ? (zoneWidth - (divideCount - 1) * thickness) / divideCount
    : (zoneHeight - (divideCount - 1) * thickness) / divideCount

  if (!Number.isFinite(clearSize) || clearSize <= 0) return

  ctx.save()

  ctx.fillStyle = '#111111'
  ctx.font = '13px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < divideCount; i += 1) {
    let labelX = zoneX + zoneWidth / 2
    let labelY = zoneY + zoneHeight / 2

    if (isVerticalDivide) {
      labelX = zoneX + clearSize / 2 + i * (clearSize + thickness)
    } else {
      labelY = zoneY + clearSize / 2 + i * (clearSize + thickness)
    }

    const screen = localToScreen(viewport, labelX, labelY)

    ctx.fillText(String(Math.round(clearSize)), screen.x, screen.y)
  }

  ctx.restore()
} // End drawDivideClearPreview

//=================
function drawPanelInputBuffer(ctx, viewport, hover, panelInputBuffer) {
  if (!hover || hover.type !== 'zone-edge') return
  if (!panelInputBuffer) return

  const zone = hover.zone
  const point = localToScreen(viewport, zone.x + zone.width / 2, zone.y + zone.height / 2)

  ctx.save()

  const text = `Vẽ Tấm: ${panelInputBuffer}`
  const paddingX = 10
  const boxWidth = Math.max(96, text.length * 8)
  const boxHeight = 28
  const x = point.x - boxWidth / 2
  const y = point.y - 44

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.strokeStyle = '#ff2f92'
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.roundRect(x, y, boxWidth, boxHeight, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#b0005a'
  ctx.font = '13px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, point.x, y + boxHeight / 2)

  ctx.restore()
} // End drawPanelInputBuffer
//=================
function drawMoveCursorIcon(ctx, viewport, moveCursorLocal) {
  if (!moveCursorLocal) return

  const point = localToScreen(viewport, moveCursorLocal.x, moveCursorLocal.y)
  const x = point.x + 12
  const y = point.y + 16
  const size = 13
  const half = size / 2

  ctx.save()

  ctx.strokeStyle = '#111827'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - half, y)
  ctx.lineTo(x + half, y)
  ctx.moveTo(x, y - half)
  ctx.lineTo(x, y + half)
  ctx.moveTo(x + half, y)
  ctx.lineTo(x + half - 4, y - 4)
  ctx.moveTo(x + half, y)
  ctx.lineTo(x + half - 4, y + 4)
  ctx.moveTo(x - half, y)
  ctx.lineTo(x - half + 4, y - 4)
  ctx.moveTo(x - half, y)
  ctx.lineTo(x - half + 4, y + 4)
  ctx.moveTo(x, y - half)
  ctx.lineTo(x - 4, y - half + 4)
  ctx.moveTo(x, y - half)
  ctx.lineTo(x + 4, y - half + 4)
  ctx.moveTo(x, y + half)
  ctx.lineTo(x - 4, y + half - 4)
  ctx.moveTo(x, y + half)
  ctx.lineTo(x + 4, y + half - 4)
  ctx.stroke()

  ctx.restore()
} // End drawMoveCursorIcon

//=================
function drawMoveTargetSnap(ctx, viewport, moveTargetSnap) {
  if (!moveTargetSnap) return

  const point = localToScreen(viewport, moveTargetSnap.x, moveTargetSnap.y)
  const size = moveTargetSnap.type === 'edge' ? 10 : 9
  const half = size / 2

  ctx.save()

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.rect(point.x - half, point.y - half, size, size)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
} // End drawMoveTargetSnap
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
    movePreviewTarget,
    moveHoverSnapPoints,
    moveTargetSnap,
    moveCursorLocal,
    panelPreviewItems,
    panelInputBuffer,
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

  drawBoxes(ctx, viewport, boxes, selectedBoxId, boxEditingDim, currentView)
  drawBoxDraft(ctx, viewport, boxDraftRect, currentView)
  drawZoneOverlay(ctx, viewport, zones, hover)
  drawPanels(ctx, viewport, panels, selectedPanelId, currentView)
  drawMovePreviewTarget(ctx, viewport, movePreviewTarget, currentView)
  drawMoveHoverSnapPoints(ctx, viewport, moveHoverSnapPoints)
  drawMoveTargetSnap(ctx, viewport, moveTargetSnap)
  drawPanelPreviewItems(ctx, viewport, panelPreviewItems, hover, currentView)
  drawPanelInputBuffer(ctx, viewport, hover, panelInputBuffer)
  drawSnapPreview(ctx, viewport, snapPreview)
  drawMoveCursorIcon(ctx, viewport, moveCursorLocal)
  drawRulers(ctx, viewport, width, height)
} // End renderCanvas2D