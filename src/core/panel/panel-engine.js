let panelIndex = 1

//=================
function nextPanelId(edge = 'panel') {
  const id = `panel_${edge}_${String(panelIndex).padStart(3, '0')}`

  panelIndex += 1

  return id
} // End nextPanelId

//=================
function clampNumber(value, min, max) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return min

  return Math.max(min, Math.min(max, numberValue))
} // End clampNumber

//=================
function getZoneMinX(zone) {
  return Number(zone.minX ?? zone.x ?? 0)
} // End getZoneMinX

//=================
function getZoneMaxX(zone) {
  if (Number.isFinite(Number(zone.maxX))) return Number(zone.maxX)

  return getZoneMinX(zone) + Number(zone.width || 0)
} // End getZoneMaxX

//=================
function getZoneMinY(zone) {
  return Number(zone.minY ?? zone.minZ ?? zone.y ?? 0)
} // End getZoneMinY

//=================
function getZoneMaxY(zone) {
  if (Number.isFinite(Number(zone.maxY))) return Number(zone.maxY)
  if (Number.isFinite(Number(zone.maxZ))) return Number(zone.maxZ)

  return getZoneMinY(zone) + Number(zone.height || 0)
} // End getZoneMaxY

//=================
function getZoneWidth(zone) {
  return getZoneMaxX(zone) - getZoneMinX(zone)
} // End getZoneWidth

//=================
function getZoneHeight(zone) {
  return getZoneMaxY(zone) - getZoneMinY(zone)
} // End getZoneHeight

//=================
function createPanelBase(zone, edge, thickness, offset) {
  const id = nextPanelId(edge)
  const sideNameMap = {
    bottom: 'Tấm đáy',
    top: 'Tấm nóc',
    left: 'Hông trái',
    right: 'Hông phải'
  }

  return {
    id,
    name: sideNameMap[edge] || `Tấm ${String(panelIndex - 1).padStart(3, '0')}`,
    type: 'panel_box',
    zoneId: zone.id,
    panelBaseZone: zone.id,
    linkedFrameId: zone.frameId || zone.cabinetId || zone.baseObjectId || null,
    edge,
    panelSide: edge,
    panelThickness: thickness,
    thickness,
    material: 'Nhựa rỗng',
    panelOffset: offset,
    panelOffsetFrom: edge,
    dimEnabled: false
  }
} // End createPanelBase

//=================
export function createPanelOnZoneEdge(zone, edge, thickness = 18, offsetValue = 0) {
  if (!zone || !edge) return null

  const t = Math.max(1, Number(thickness || 18))
  const minX = getZoneMinX(zone)
  const maxX = getZoneMaxX(zone)
  const minY = getZoneMinY(zone)
  const maxY = getZoneMaxY(zone)
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)

  if (zoneWidth <= 0 || zoneHeight <= 0) return null

  let offset = Math.max(0, Number(offsetValue || 0))

  if (edge === 'bottom') {
    offset = clampNumber(offset, 0, Math.max(0, zoneHeight - t))

    return {
      ...createPanelBase(zone, edge, t, offset),
      orientation: 'horizontal',
      panelKind: 'horizontal',
      x: minX,
      y: minY + offset,
      z: minY + offset,
      width: zoneWidth,
      depth: zone.depth || zoneWidth,
      height: t,
      color: '#3fa9f5'
    }
  }

  if (edge === 'top') {
    offset = clampNumber(offset, 0, Math.max(0, zoneHeight - t))

    return {
      ...createPanelBase(zone, edge, t, offset),
      orientation: 'horizontal',
      panelKind: 'horizontal',
      x: minX,
      y: maxY - t - offset,
      z: maxY - t - offset,
      width: zoneWidth,
      depth: zone.depth || zoneWidth,
      height: t,
      color: '#3fa9f5'
    }
  }

  if (edge === 'left') {
    offset = clampNumber(offset, 0, Math.max(0, zoneWidth - t))

    return {
      ...createPanelBase(zone, edge, t, offset),
      orientation: 'vertical',
      panelKind: 'vertical',
      x: minX + offset,
      y: minY,
      z: minY,
      width: t,
      depth: zone.depth || t,
      height: zoneHeight,
      color: '#e55353'
    }
  }

  if (edge === 'right') {
    offset = clampNumber(offset, 0, Math.max(0, zoneWidth - t))

    return {
      ...createPanelBase(zone, edge, t, offset),
      orientation: 'vertical',
      panelKind: 'vertical',
      x: maxX - t - offset,
      y: minY,
      z: minY,
      width: t,
      depth: zone.depth || t,
      height: zoneHeight,
      color: '#e55353'
    }
  }

  return null
} // End createPanelOnZoneEdge

//=================
export function splitZoneByCount(zone, edgeOrCount, countOrThickness, thicknessOrEmpty) {
  if (!zone) return []

  let edge = edgeOrCount
  let count = countOrThickness
  let thickness = thicknessOrEmpty

  if (typeof edgeOrCount === 'number') {
    edge = getZoneWidth(zone) >= getZoneHeight(zone) ? 'left' : 'bottom'
    count = edgeOrCount
    thickness = countOrThickness
  }

  const n = Math.max(2, Math.floor(Number(count || 2)))
  const t = Math.max(1, Number(thickness || 18))
  const panels = []

  if (edge === 'bottom' || edge === 'top') {
    const clearEach = (getZoneHeight(zone) - (n - 1) * t) / n

    if (!Number.isFinite(clearEach) || clearEach <= 0) return []

    for (let i = 1; i <= n - 1; i += 1) {
      const offset = clearEach * i + t * (i - 1)
      const panel = createPanelOnZoneEdge(zone, 'bottom', t, offset)

      if (panel) {
        panel.name = 'Tấm chia ngang'
        panel.panelDivideCount = n
        panel.edge = 'split'
        panels.push(panel)
      }
    }

    return panels
  }

  if (edge === 'left' || edge === 'right') {
    const clearEach = (getZoneWidth(zone) - (n - 1) * t) / n

    if (!Number.isFinite(clearEach) || clearEach <= 0) return []

    for (let i = 1; i <= n - 1; i += 1) {
      const offset = clearEach * i + t * (i - 1)
      const panel = createPanelOnZoneEdge(zone, 'left', t, offset)

      if (panel) {
        panel.name = 'Tấm chia đứng'
        panel.panelDivideCount = n
        panel.edge = 'split'
        panels.push(panel)
      }
    }

    return panels
  }

  return panels
} // End splitZoneByCount

//=================
export function movePanelByDelta(panel, dx, dy, lockAxis = false) {
  let moveX = Number(dx || 0)
  let moveY = Number(dy || 0)

  if (lockAxis) {
    if (Math.abs(moveX) >= Math.abs(moveY)) {
      moveY = 0
    } else {
      moveX = 0
    }
  }

  const nextY = Number(panel.y || 0) + moveY

  return {
    ...panel,
    x: Number(panel.x || 0) + moveX,
    y: nextY,
    z: nextY
  }
} // End movePanelByDelta