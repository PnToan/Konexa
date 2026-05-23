let panelIndex = 1

//=================
function nextPanelId(edge = 'panel') {
  const id = `panel_${edge}_${String(panelIndex).padStart(3, '0')}`

  panelIndex += 1

  return id
} // End nextPanelId

//=================
function toNumber(value, fallback = 0) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toNumber

//=================
function clampNumber(value, min, max) {
  const numberValue = toNumber(value, min)

  return Math.max(min, Math.min(max, numberValue))
} // End clampNumber

//=================
function getZoneMinX(zone) {
  return toNumber(zone.minX ?? zone.x, 0)
} // End getZoneMinX

//=================
function getZoneMaxX(zone) {
  if (Number.isFinite(Number(zone.maxX))) return Number(zone.maxX)

  return getZoneMinX(zone) + toNumber(zone.width, 0)
} // End getZoneMaxX

//=================
function getZoneMinZ(zone) {
  return toNumber(zone.minZ ?? zone.minY ?? zone.y, 0)
} // End getZoneMinZ

//=================
function getZoneMaxZ(zone) {
  if (Number.isFinite(Number(zone.maxZ))) return Number(zone.maxZ)
  if (Number.isFinite(Number(zone.maxY))) return Number(zone.maxY)

  return getZoneMinZ(zone) + toNumber(zone.height, 0)
} // End getZoneMaxZ

//=================
function getZoneWidth(zone) {
  return Math.max(0, getZoneMaxX(zone) - getZoneMinX(zone))
} // End getZoneWidth

//=================
function getZoneHeight(zone) {
  return Math.max(0, getZoneMaxZ(zone) - getZoneMinZ(zone))
} // End getZoneHeight

//=================
function getZoneDepth(zone) {
  const sourceBox = zone.sourceBox || zone.baseObject || zone.source

  return toNumber(
    zone.depth ??
    sourceBox?.depth ??
    sourceBox?.ySize,
    0
  )
} // End getZoneDepth

//=================
function getFrameId(zone) {
  return zone.linkedFrameId ||
    zone.frameId ||
    zone.sourceBoxId ||
    zone.baseObjectId ||
    zone.sourceBox?.id ||
    zone.baseObject?.id ||
    zone.source?.id ||
    null
} // End getFrameId

//=================
function getBoxY3d(zone) {
  const sourceBox = zone.sourceBox || zone.baseObject || zone.source

  return toNumber(
    sourceBox?.y3d ??
    sourceBox?.y ??
    sourceBox?.depthY,
    0
  )
} // End getBoxY3d

//=================
function createPanelBase(zone, edge, thickness, offset) {
  const id = nextPanelId(edge)
  const frameId = getFrameId(zone)

  const nameMap = {
    left: 'Hông trái',
    right: 'Hông phải',
    top: 'Tấm nóc',
    bottom: 'Tấm đáy'
  }

  return {
    id,
    name: nameMap[edge] || `Tấm ${String(panelIndex - 1).padStart(3, '0')}`,

    type: 'panel_box',
    material: 'Nhựa rỗng',

    zoneId: zone.id,
    panelBaseZone: zone.id,

    linkedFrameId: frameId,
    frameId,
    sourceBoxId: frameId,
    baseObjectId: frameId,

    edge,
    panelSide: edge,

    panelOffset: offset,
    panelOffsetFrom: edge,

    panelThickness: thickness,
    thickness,

    dimEnabled: false
  }
} // End createPanelBase

//=================
function withFrontRect(panel) {
  return {
    ...panel,

    x: panel.x3d,
    y: panel.z3d,
    z: panel.z3d,

    width: panel.xSize,
    height: panel.zSize,
    depth: panel.ySize
  }
} // End withFrontRect

//=================
function createSidePanel(zone, edge, thickness, offset) {
  const minX = getZoneMinX(zone)
  const maxX = getZoneMaxX(zone)
  const minZ = getZoneMinZ(zone)
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)
  const zoneDepth = getZoneDepth(zone)
  const y3d = getBoxY3d(zone)
  const safeOffset = clampNumber(offset, 0, Math.max(0, zoneWidth - thickness))

  const x3d = edge === 'left'
    ? minX + safeOffset
    : maxX - thickness - safeOffset

  return withFrontRect({
    ...createPanelBase(zone, edge, thickness, safeOffset),

    orientation: 'vertical',
    panelKind: 'side',

    x3d,
    y3d,
    z3d: minZ,

    xSize: thickness,
    ySize: zoneDepth,
    zSize: zoneHeight,

    color: '#0040a0'
  })
} // End createSidePanel

//=================
function createTopBottomPanel(zone, edge, thickness, offset) {
  const minX = getZoneMinX(zone)
  const minZ = getZoneMinZ(zone)
  const maxZ = getZoneMaxZ(zone)
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)
  const zoneDepth = getZoneDepth(zone)
  const y3d = getBoxY3d(zone)
  const safeOffset = clampNumber(offset, 0, Math.max(0, zoneHeight - thickness))

  const z3d = edge === 'bottom'
    ? minZ + safeOffset
    : maxZ - thickness - safeOffset

  return withFrontRect({
    ...createPanelBase(zone, edge, thickness, safeOffset),

    orientation: 'horizontal',
    panelKind: 'top_bottom',

    x3d: minX,
    y3d,
    z3d,

    xSize: zoneWidth,
    ySize: zoneDepth,
    zSize: thickness,

    color: '#0040a0'
  })
} // End createTopBottomPanel

//=================
export function createPanelOnZoneEdge(zone, edge, thickness = 18, offsetValue = 0) {
  if (!zone || !edge) return null

  const t = Math.max(1, toNumber(thickness, 18))
  const offset = Math.max(0, toNumber(offsetValue, 0))
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)

  if (zoneWidth <= 0 || zoneHeight <= 0) return null

  if (edge === 'left' || edge === 'right') {
    return createSidePanel(zone, edge, t, offset)
  }

  if (edge === 'top' || edge === 'bottom') {
    return createTopBottomPanel(zone, edge, t, offset)
  }

  return null
} // End createPanelOnZoneEdge

//=================
export function createPanelPreview(zone, edge, thickness = 18, offsetValue = 0) {
  const panel = createPanelOnZoneEdge(zone, edge, thickness, offsetValue)

  if (!panel) return null

  return {
    ...panel,
    id: `${panel.id}_preview`,
    preview: true
  }
} // End createPanelPreview

//=================
export function splitZoneByCount(zone, edgeOrCount, countOrThickness, thicknessOrPanels) {
  if (!zone) return []

  let edge = edgeOrCount
  let count = countOrThickness
  let thickness = thicknessOrPanels

  if (typeof edgeOrCount === 'number') {
    edge = getZoneWidth(zone) >= getZoneHeight(zone) ? 'left' : 'bottom'
    count = edgeOrCount
    thickness = countOrThickness
  }

  const n = Math.max(2, Math.floor(toNumber(count, 2)))
  const t = Math.max(1, toNumber(thickness, 18))
  const result = []

  if (edge === 'left' || edge === 'right') {
    const clearEach = (getZoneWidth(zone) - (n - 1) * t) / n

    if (!Number.isFinite(clearEach) || clearEach <= 0) return []

    for (let i = 1; i <= n - 1; i += 1) {
      const offset = clearEach * i + t * (i - 1)
      const panel = createPanelOnZoneEdge(zone, 'left', t, offset)

      if (!panel) continue

      result.push({
        ...panel,
        name: 'Tấm chia đứng',
        edge: 'split',
        panelSide: 'split_vertical',
        panelDivideCount: n
      })
    }

    return result
  }

  if (edge === 'top' || edge === 'bottom') {
    const clearEach = (getZoneHeight(zone) - (n - 1) * t) / n

    if (!Number.isFinite(clearEach) || clearEach <= 0) return []

    for (let i = 1; i <= n - 1; i += 1) {
      const offset = clearEach * i + t * (i - 1)
      const panel = createPanelOnZoneEdge(zone, 'bottom', t, offset)

      if (!panel) continue

      result.push({
        ...panel,
        name: 'Tấm chia ngang',
        edge: 'split',
        panelSide: 'split_horizontal',
        panelDivideCount: n
      })
    }

    return result
  }

  return result
} // End splitZoneByCount

//=================
export function createSplitPreview(zone, edge, count, thickness = 18) {
  return splitZoneByCount(zone, edge, count, thickness).map((panel) => ({
    ...panel,
    id: `${panel.id}_preview`,
    preview: true
  }))
} // End createSplitPreview

//=================
export function movePanelByDelta(panel, dx, dy, lockAxis = false) {
  let moveX = toNumber(dx, 0)
  let moveY = toNumber(dy, 0)

  if (lockAxis) {
    if (Math.abs(moveX) >= Math.abs(moveY)) {
      moveY = 0
    } else {
      moveX = 0
    }
  }

  return withFrontRect({
    ...panel,
    x3d: toNumber(panel.x3d, panel.x) + moveX,
    z3d: toNumber(panel.z3d, panel.z ?? panel.y) + moveY
  })
} // End movePanelByDelta