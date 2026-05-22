import { localToScreen, getLocalScale } from './viewport-transform'

function drawLine(ctx, a, b, color = '#999', width = 1) {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function drawRectLocal(ctx, viewport, rect, options = {}) {
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
}

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
}

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
}

function drawZoneOverlay(ctx, viewport, zones, hover) {
  zones.forEach((zone) => {
    drawRectLocal(ctx, viewport, zone, { stroke: 'rgba(63, 169, 245, 0.32)', lineWidth: 1 })
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
}

function drawPanels(ctx, viewport, panels, selectedPanelId) {
  panels.forEach((panel) => {
    drawRectLocal(ctx, viewport, panel, {
      fill: panel.color || '#e55353',
      stroke: selectedPanelId === panel.id ? '#ffea00' : '#444444',
      lineWidth: selectedPanelId === panel.id ? 3 : 1
    })
    const center = localToScreen(viewport, panel.x + panel.width / 2, panel.y + panel.height / 2)
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(panel.name, center.x, center.y)
  })
}

export function renderCanvas2D(ctx, payload) {
  const { width, height, viewport, cabinetRect, zones, panels, hover, selectedPanelId, showGrid } = payload
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f4f4f4'
  ctx.fillRect(0, 0, width, height)

  if (showGrid) drawGrid(ctx, viewport, width, height)
  drawRectLocal(ctx, viewport, cabinetRect, { fill: 'rgba(255,255,255,0.62)', stroke: '#111111', lineWidth: 2 })
  drawZoneOverlay(ctx, viewport, zones, hover)
  drawPanels(ctx, viewport, panels, selectedPanelId)
  drawRulers(ctx, viewport, width, height)
}
