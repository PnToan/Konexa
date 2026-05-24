import { movePanelByDelta } from '../panel/panel-engine'
import { createMoveSnapResult, getPanelSnapPoints, hitTestPanel } from '../snap/snap-engine'

//=================
export function createMoveState() {
  return {
    active: false,
    phase: 'pick-base',
    panelId: null,
    basePoint: null,
    targetPoint: null,
    originalPanel: null,
    previewPanel: null,
    hoverPanelId: null,
    hoverSnapPoints: [],
    hoverBasePoint: null,
    snapPreview: null,
    lockAxis: null
  }
} // End createMoveState

//=================
export function resetMoveState() {
  return createMoveState()
} // End resetMoveState

//=================
export function getMoveTolerance(viewport) {
  const scale = Number(viewport.localScale || 1) * Number(viewport.zoom || 1)
  return 14 / Math.max(scale, 0.0001)
} // End getMoveTolerance

//=================
export function getPanelCornerSnapPoints(panel) {
  if (!panel) return []

  return getPanelSnapPoints(panel)
    .filter((snapPoint) => snapPoint.type === 'corner')
    .map((snapPoint, index) => ({
      ...snapPoint,
      id: `${panel.id}_corner_${index}`,
      panelId: panel.id
    }))
} // End getPanelCornerSnapPoints

//=================
export function getNearestMoveSnapPoint(panel, localPoint, viewport) {
  if (!panel || !localPoint) return null

  const tolerance = getMoveTolerance(viewport)
  const snapPoints = getPanelCornerSnapPoints(panel)

  let best = null

  for (const snapPoint of snapPoints) {
    const dx = Number(localPoint.x) - Number(snapPoint.x)
    const dy = Number(localPoint.y) - Number(snapPoint.y)
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > tolerance) continue
    if (best && distance >= best.distance) continue

    best = {
      ...snapPoint,
      distance
    }
  }

  return best
} // End getNearestMoveSnapPoint

//=================
export function getMoveHoverResult(panels, localPoint, viewport) {
  const panelHit = hitTestPanel(panels, localPoint)

  if (!panelHit?.panel) {
    return {
      panel: null,
      basePoint: null,
      snapPoints: []
    }
  }

  const panel = panelHit.panel
  const snapPoints = getPanelCornerSnapPoints(panel)
  const snapPoint = getNearestMoveSnapPoint(panel, localPoint, viewport)

  return {
    panel,
    basePoint: snapPoint || {
      type: 'free',
      panelId: panel.id,
      x: localPoint.x,
      y: localPoint.y
    },
    snapPoints
  }
} // End getMoveHoverResult

//=================
export function updateMoveHover(moveState, panels, localPoint, viewport) {
  const hover = getMoveHoverResult(panels, localPoint, viewport)

  return {
    ...moveState,
    hoverPanelId: hover.panel?.id || null,
    hoverSnapPoints: hover.snapPoints,
    hoverBasePoint: hover.basePoint
  }
} // End updateMoveHover

//=================
export function startMoveFromBasePoint(moveState, panel, basePoint) {
  if (!panel || !basePoint) return moveState

  return {
    ...moveState,
    active: true,
    phase: 'pick-target',
    panelId: panel.id,
    basePoint: {
      x: Number(basePoint.x),
      y: Number(basePoint.y)
    },
    targetPoint: {
      x: Number(basePoint.x),
      y: Number(basePoint.y)
    },
    originalPanel: { ...panel },
    previewPanel: { ...panel },
    hoverPanelId: panel.id,
    hoverSnapPoints: [],
    hoverBasePoint: null,
    snapPreview: null,
    lockAxis: null
  }
} // End startMoveFromBasePoint

//=================
export function resolveMoveTargetPoint(localPoint, panels, movingPanelId) {
  const snapResult = createMoveSnapResult(localPoint, panels, movingPanelId)

  if (snapResult?.active) {
    return {
      point: snapResult.point,
      snapPreview: snapResult.snap
    }
  }

  return {
    point: {
      x: Number(localPoint.x),
      y: Number(localPoint.y)
    },
    snapPreview: null
  }
} // End resolveMoveTargetPoint

//=================
export function getAxisLockedPoint(basePoint, targetPoint, lockAxis) {
  if (!basePoint || !targetPoint || !lockAxis) {
    return targetPoint
  }

  const dx = Number(targetPoint.x) - Number(basePoint.x)
  const dy = Number(targetPoint.y) - Number(basePoint.y)

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: Number(targetPoint.x),
      y: Number(basePoint.y)
    }
  }

  return {
    x: Number(basePoint.x),
    y: Number(targetPoint.y)
  }
} // End getAxisLockedPoint

//=================
export function previewMoveToTarget(moveState, panels, localPoint, lockAxis = false) {
  if (!moveState.active || moveState.phase !== 'pick-target') {
    return moveState
  }

  if (!moveState.originalPanel || !moveState.basePoint) {
    return moveState
  }

  const resolvedTarget = resolveMoveTargetPoint(localPoint, panels, moveState.panelId)
  const targetPoint = getAxisLockedPoint(moveState.basePoint, resolvedTarget.point, lockAxis)

  const dx = Number(targetPoint.x) - Number(moveState.basePoint.x)
  const dy = Number(targetPoint.y) - Number(moveState.basePoint.y)

  const previewPanel = movePanelByDelta(moveState.originalPanel, dx, dy, false)

  return {
    ...moveState,
    targetPoint,
    previewPanel,
    snapPreview: resolvedTarget.snapPreview,
    lockAxis: lockAxis ? (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y') : null
  }
} // End previewMoveToTarget

//=================
export function commitMoveToTarget(moveState, panels, localPoint, lockAxis = false) {
  if (!moveState.active || moveState.phase !== 'pick-target') {
    return {
      moveState,
      panels,
      movedPanel: null
    }
  }

  const nextMoveState = previewMoveToTarget(moveState, panels, localPoint, lockAxis)

  if (!nextMoveState.previewPanel) {
    return {
      moveState: resetMoveState(),
      panels,
      movedPanel: null
    }
  }

  const nextPanels = panels.map((panel) => {
    if (panel.id !== nextMoveState.panelId) return panel
    return nextMoveState.previewPanel
  })

  return {
    moveState: resetMoveState(),
    panels: nextPanels,
    movedPanel: nextMoveState.previewPanel
  }
} // End commitMoveToTarget

//=================
export function cancelMove() {
  return resetMoveState()
} // End cancelMove