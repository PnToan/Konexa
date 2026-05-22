import { distancePointToSegment, rectEdges, rectContainsPoint, rectFromPanel } from '../geometry/rect'

const DEFAULT_SNAP_TOLERANCE = 28

//=================
export function hitTestZoneEdge(zones, point, toleranceLocal) {
  let best = null

  zones.forEach((zone) => {
    const edges = rectEdges(zone)

    Object.entries(edges).forEach(([edge, segment]) => {
      const distance = distancePointToSegment(point, segment)

      if (distance <= toleranceLocal && (!best || distance < best.distance)) {
        best = { type: 'zone-edge', zone, edge, segment, distance }
      }
    })
  })

  return best
} // End hitTestZoneEdge

//=================
export function hitTestPanel(panels, point) {
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const panel = panels[i]
    if (rectContainsPoint(rectFromPanel(panel), point)) return { type: 'panel', panel }
  }

  return null
} // End hitTestPanel

//=================
function normalizePanelRect(panel) {
  return {
    id: panel.id,
    x: Number(panel.x) || 0,
    y: Number(panel.y) || 0,
    width: Number(panel.width) || 0,
    height: Number(panel.height) || 0
  }
} // End normalizePanelRect

//=================
function distanceBetweenPoints(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y

  return Math.sqrt(dx * dx + dy * dy)
} // End distanceBetweenPoints

//=================
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
} // End clamp

//=================
export function getPanelSnapPoints(panel) {
  const rect = normalizePanelRect(panel)
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y + rect.height
  const bottom = rect.y
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  return [
    { type: 'corner', key: 'bottom-left', x: left, y: bottom, panelId: rect.id },
    { type: 'corner', key: 'bottom-right', x: right, y: bottom, panelId: rect.id },
    { type: 'corner', key: 'top-right', x: right, y: top, panelId: rect.id },
    { type: 'corner', key: 'top-left', x: left, y: top, panelId: rect.id },
    { type: 'center', key: 'center', x: centerX, y: centerY, panelId: rect.id },
    { type: 'midpoint', key: 'mid-bottom', x: centerX, y: bottom, panelId: rect.id },
    { type: 'midpoint', key: 'mid-top', x: centerX, y: top, panelId: rect.id },
    { type: 'midpoint', key: 'mid-left', x: left, y: centerY, panelId: rect.id },
    { type: 'midpoint', key: 'mid-right', x: right, y: centerY, panelId: rect.id }
  ]
} // End getPanelSnapPoints

//=================
export function getPanelSnapEdges(panel) {
  const rect = normalizePanelRect(panel)
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y + rect.height
  const bottom = rect.y

  return [
    {
      type: 'edge',
      key: 'bottom',
      orientation: 'horizontal',
      panelId: rect.id,
      x1: left,
      y1: bottom,
      x2: right,
      y2: bottom
    },
    {
      type: 'edge',
      key: 'top',
      orientation: 'horizontal',
      panelId: rect.id,
      x1: left,
      y1: top,
      x2: right,
      y2: top
    },
    {
      type: 'edge',
      key: 'left',
      orientation: 'vertical',
      panelId: rect.id,
      x1: left,
      y1: bottom,
      x2: left,
      y2: top
    },
    {
      type: 'edge',
      key: 'right',
      orientation: 'vertical',
      panelId: rect.id,
      x1: right,
      y1: bottom,
      x2: right,
      y2: top
    }
  ]
} // End getPanelSnapEdges

//=================
export function buildSnapTargets(panels, movingPanelId = null) {
  const sourcePanels = Array.isArray(panels) ? panels : []
  const targets = {
    points: [],
    edges: []
  }

  sourcePanels.forEach((panel) => {
    if (!panel || panel.id === movingPanelId) return

    targets.points.push(...getPanelSnapPoints(panel))
    targets.edges.push(...getPanelSnapEdges(panel))
  })

  return targets
} // End buildSnapTargets

//=================
export function findNearestPointSnap(localPoint, panels, movingPanelId = null, tolerance = DEFAULT_SNAP_TOLERANCE) {
  const targets = buildSnapTargets(panels, movingPanelId)
  let bestSnap = null

  targets.points.forEach((target) => {
    const distance = distanceBetweenPoints(localPoint, target)

    if (distance > tolerance) return
    if (bestSnap && distance >= bestSnap.distance) return

    bestSnap = {
      type: target.type,
      key: target.key,
      panelId: target.panelId,
      x: target.x,
      y: target.y,
      distance
    }
  })

  return bestSnap
} // End findNearestPointSnap

//=================
export function findNearestEdgeSnap(localPoint, panels, movingPanelId = null, tolerance = DEFAULT_SNAP_TOLERANCE) {
  const targets = buildSnapTargets(panels, movingPanelId)
  let bestSnap = null

  targets.edges.forEach((edge) => {
    let snapPoint = null

    if (edge.orientation === 'horizontal') {
      const projectedX = clamp(localPoint.x, edge.x1, edge.x2)
      snapPoint = { x: projectedX, y: edge.y1 }
    }

    if (edge.orientation === 'vertical') {
      const projectedY = clamp(localPoint.y, edge.y1, edge.y2)
      snapPoint = { x: edge.x1, y: projectedY }
    }

    if (!snapPoint) return

    const distance = distanceBetweenPoints(localPoint, snapPoint)

    if (distance > tolerance) return
    if (bestSnap && distance >= bestSnap.distance) return

    bestSnap = {
      type: 'edge',
      key: edge.key,
      orientation: edge.orientation,
      panelId: edge.panelId,
      x: snapPoint.x,
      y: snapPoint.y,
      distance
    }
  })

  return bestSnap
} // End findNearestEdgeSnap

//=================
export function findBestSnap(localPoint, panels, movingPanelId = null, tolerance = DEFAULT_SNAP_TOLERANCE) {
  const pointSnap = findNearestPointSnap(localPoint, panels, movingPanelId, tolerance)
  const edgeSnap = findNearestEdgeSnap(localPoint, panels, movingPanelId, tolerance)

  if (pointSnap && edgeSnap) {
    return pointSnap.distance <= edgeSnap.distance ? pointSnap : edgeSnap
  }

  return pointSnap || edgeSnap || null
} // End findBestSnap

//=================
export function createMoveSnapResult(localPoint, panels, movingPanelId = null, tolerance = DEFAULT_SNAP_TOLERANCE) {
  const snap = findBestSnap(localPoint, panels, movingPanelId, tolerance)

  if (!snap) {
    return {
      active: false,
      point: localPoint,
      snap: null
    }
  }

  return {
    active: true,
    point: {
      x: snap.x,
      y: snap.y
    },
    snap
  }
} // End createMoveSnapResult