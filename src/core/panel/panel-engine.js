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
function getZoneMinZ(zone) {
  return Number(zone.minZ ?? zone.minY ?? zone.y ?? 0)
} // End getZoneMinZ

//=================
function getZoneMaxZ(zone) {
  if (Number.isFinite(Number(zone.maxZ))) return Number(zone.maxZ)
  if (Number.isFinite(Number(zone.maxY))) return Number(zone.maxY)

  return getZoneMinZ(zone) + Number(zone.height || 0)
} // End getZoneMaxZ

//=================
function getZoneWidth(zone) {
  return getZoneMaxX(zone) - getZoneMinX(zone)
} // End getZoneWidth

//=================
function getZoneHeight(zone) {
  return getZoneMaxZ(zone) - getZoneMinZ(zone)
} // End getZoneHeight

//=================
function getZoneDepth(zone) {
  const sourceBox = zone.sourceBox || zone.baseObject || zone.source

  return Number(
    zone.depth ??
    zone.ySize ??
    sourceBox?.depth ??
    sourceBox?.ySize ??
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
function isPanelInSameFrame(panel, frameId) {
  if (!panel || !frameId) return false

  return panel.linkedFrameId === frameId ||
    panel.frameId === frameId ||
    panel.sourceBoxId === frameId ||
    panel.baseObjectId === frameId
} // End isPanelInSameFrame

//=================
function hasBothSidePanels(zone, panels = []) {
  const frameId = getFrameId(zone)
  const sameFramePanels = panels.filter((panel) => isPanelInSameFrame(panel, frameId))

  const hasLeft = sameFramePanels.some((panel) => panel.panelSide === 'left' || panel.edge === 'left')
  const hasRight = sameFramePanels.some((panel) => panel.panelSide === 'right' || panel.edge === 'right')

  return hasLeft && hasRight
} // End hasBothSidePanels

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
function createVerticalPanel(zone, edge, thickness, offset) {
  const minX = getZoneMinX(zone)
  const maxX = getZoneMaxX(zone)
  const minZ = getZoneMinZ(zone)
  const zoneHeight = getZoneHeight(zone)
  const zoneWidth = getZoneWidth(zone)
  const zoneDepth = getZoneDepth(zone)

  const safeOffset = clampNumber(offset, 0, Math.max(0, zoneWidth - thickness))
  const x = edge === 'left'
    ? minX + safeOffset
    : maxX - thickness - safeOffset

  return {
    ...createPanelBase(zone, edge, thickness, safeOffset),

    orientation: 'vertical',
    panelKind: 'side',

    x,
    y: minZ,
    z: minZ,

    width: thickness,
    height: zoneHeight,
    depth: zoneDepth,

    xSize: thickness,
    ySize: zoneDepth,
    zSize: zoneHeight,

    color: '#e55353'
  }
} // End createVerticalPanel

//=================
function createHorizontalPanel(zone, edge, thickness, offset, panels = []) {
  const minX = getZoneMinX(zone)
  const maxX = getZoneMaxX(zone)
  const minZ = getZoneMinZ(zone)
  const maxZ = getZoneMaxZ(zone)
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)
  const zoneDepth = getZoneDepth(zone)

  const safeOffset = clampNumber(offset, 0, Math.max(0, zoneHeight - thickness))
  const hasTwoSidePanels = hasBothSidePanels(zone, panels)

  const x = hasTwoSidePanels ? minX + thickness : minX
  const width = hasTwoSidePanels
    ? Math.max(1, zoneWidth - thickness * 2)
    : zoneWidth

  const z = edge === 'bottom'
    ? minZ + safeOffset
    : maxZ - thickness - safeOffset

  return {
    ...createPanelBase(zone, edge, thickness, safeOffset),

    orientation: 'horizontal',
    panelKind: 'top_bottom',

    x,
    y: z,
    z,

    width,
    height: thickness,
    depth: zoneDepth,

    xSize: width,
    ySize: zoneDepth,
    zSize: thickness,

    color: '#3fa9f5'
  }
} // End createHorizontalPanel

//=================
export function createPanelOnZoneEdge(zone, edge, thickness = 18, offsetValue = 0, panels = []) {
  if (!zone || !edge) return null

  const t = Math.max(1, Number(thickness || 18))
  const offset = Math.max(0, Number(offsetValue || 0))
  const zoneWidth = getZoneWidth(zone)
  const zoneHeight = getZoneHeight(zone)

  if (zoneWidth <= 0 || zoneHeight <= 0) return null

  if (edge === 'left' || edge === 'right') {
    return createVerticalPanel(zone, edge, t, offset)
  }

  if (edge === 'top' || edge === 'bottom') {
    return createHorizontalPanel(zone, edge, t, offset, panels)
  }

  return null
} // End createPanelOnZoneEdge

//=================
export function createPanelPreview(zone, edge, thickness = 18, offsetValue = 0, panels = []) {
  const panel = createPanelOnZoneEdge(zone, edge, thickness, offsetValue, panels)

  if (!panel) return null

  return {
    ...panel,
    id: `${panel.id}_preview`,
    preview: true,
    name: panel.name
  }
} // End createPanelPreview

//=================
export function splitZoneByCount(zone, edgeOrCount, countOrThickness, thicknessOrPanels, panelsOrEmpty) {
  if (!zone) return []

  let edge = edgeOrCount
  let count = countOrThickness
  let thickness = thicknessOrPanels
  let panels = panelsOrEmpty || []

  if (typeof edgeOrCount === 'number') {
    edge = getZoneWidth(zone) >= getZoneHeight(zone) ? 'left' : 'bottom'
    count = edgeOrCount
    thickness = countOrThickness
    panels = []
  }

  const n = Math.max(2, Math.floor(Number(count || 2)))
  const t = Math.max(1, Number(thickness || 18))
  const result = []

  if (edge === 'left' || edge === 'right') {
    const clearEach = (getZoneWidth(zone) - (n - 1) * t) / n

    if (!Number.isFinite(clearEach) || clearEach <= 0) return []

    for (let i = 1; i <= n - 1; i += 1) {
      const offset = clearEach * i + t * (i - 1)
      const panel = createPanelOnZoneEdge(zone, 'left', t, offset, panels)

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
      const panel = createPanelOnZoneEdge(zone, 'bottom', t, offset, panels)

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
export function createSplitPreview(zone, edge, count, thickness = 18, panels = []) {
  return splitZoneByCount(zone, edge, count, thickness, panels).map((panel) => ({
    ...panel,
    id: `${panel.id}_preview`,
    preview: true
  }))
} // End createSplitPreview

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
  const nextZ = Number(panel.z ?? panel.y ?? 0) + moveY

  return {
    ...panel,
    x: Number(panel.x || 0) + moveX,
    y: nextY,
    z: nextZ
  }
} // End movePanelByDelta