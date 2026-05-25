import { getCameraConfig, projectBoxToCameraRect } from '../view/view-camera'

const DEFAULT_MOVE_SNAP_TOLERANCE = 28

//=================
function toNumber(value, fallback = 0) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  return numberValue
} // End toNumber

//=================
function distanceBetweenPoints(a, b) {
  const dx = toNumber(a?.x) - toNumber(b?.x)
  const dy = toNumber(a?.y) - toNumber(b?.y)

  return Math.sqrt(dx * dx + dy * dy)
} // End distanceBetweenPoints

//=================
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
} // End clamp

//=================
export function createMoveState() {
  return {
    active: false,
    phase: 'pick-base',

    targetType: null,
    targetId: null,

    baseSnap: null,
    basePoint: null,
    targetPoint: null,

    originalTarget: null,
    previewTarget: null,

    hoverTargetType: null,
    hoverTargetId: null,
    hoverSnap: null,
    hoverSnapPoints: [],

    targetSnap: null,
    cursorLocal: null,
    lockAxis: null
  }
} // End createMoveState

//=================
export function resetMoveState() {
  return createMoveState()
} // End resetMoveState

//=================
export function getMoveTolerance(viewport) {
  const scale = Number(viewport?.localScale || 1) * Number(viewport?.zoom || 1)

  return DEFAULT_MOVE_SNAP_TOLERANCE / Math.max(scale, 0.0001)
} // End getMoveTolerance

//=================
function getPanelAxisMin(panel, axis) {
  if (axis === 'x') return toNumber(panel.x3d ?? panel.x, 0)
  if (axis === 'y') return toNumber(panel.y3d ?? panel.worldY ?? panel.depthY ?? panel.y, 0)
  if (axis === 'z') return toNumber(panel.z3d ?? panel.z ?? panel.y, 0)

  return 0
} // End getPanelAxisMin

//=================
function getPanelAxisSize(panel, axis) {
  if (axis === 'x') return toNumber(panel.xSize ?? panel.width, 0)
  if (axis === 'y') return toNumber(panel.ySize ?? panel.depth, 0)
  if (axis === 'z') return toNumber(panel.zSize ?? panel.height ?? panel.thickness, 0)

  return 0
} // End getPanelAxisSize

//=================
function projectPanelAxisValue(value, size, reverse) {
  if (reverse) return -(value + size)

  return value
} // End projectPanelAxisValue

//=================
function getPanelViewRect(panel, currentView = 'front') {
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
} // End getPanelViewRect

//=================
function getBoxViewRect(box, currentView = 'top') {
  if (!box) return null

  return projectBoxToCameraRect(box, currentView)
} // End getBoxViewRect

//=================
function getMoveTargetRect(targetType, target, currentView) {
  if (targetType === 'panel') return getPanelViewRect(target, currentView)
  if (targetType === 'box') return getBoxViewRect(target, currentView)

  return null
} // End getMoveTargetRect

//=================
function pointInRect(rect, point) {
  if (!rect || !point) return false

  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
} // End pointInRect

//=================
function getRectCornerSnapPoints(rect, meta = {}) {
  if (!rect) return []

  const left = rect.x
  const right = rect.x + rect.width
  const bottom = rect.y
  const top = rect.y + rect.height

  return [
    { type: 'corner', key: 'bottom-left', x: left, y: bottom },
    { type: 'corner', key: 'bottom-right', x: right, y: bottom },
    { type: 'corner', key: 'top-right', x: right, y: top },
    { type: 'corner', key: 'top-left', x: left, y: top }
  ].map((snapPoint, index) => ({
    ...snapPoint,
    ...meta,
    id: `${meta.targetType}_${meta.targetId}_corner_${index}`
  }))
} // End getRectCornerSnapPoints

//=================
function getRectMiddleSnapPoints(rect, meta = {}) {
  if (!rect) return []

  const left = rect.x
  const right = rect.x + rect.width
  const bottom = rect.y
  const top = rect.y + rect.height
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  return [
    { type: 'midpoint', key: 'bottom-middle', x: centerX, y: bottom },
    { type: 'midpoint', key: 'top-middle', x: centerX, y: top },
    { type: 'midpoint', key: 'left-middle', x: left, y: centerY },
    { type: 'midpoint', key: 'right-middle', x: right, y: centerY }
  ].map((snapPoint, index) => ({
    ...snapPoint,
    ...meta,
    id: `${meta.targetType}_${meta.targetId}_midpoint_${index}`
  }))
} // End getRectMiddleSnapPoints

//=================
function getRectSnapEdges(rect, meta = {}) {
  if (!rect) return []

  const left = rect.x
  const right = rect.x + rect.width
  const bottom = rect.y
  const top = rect.y + rect.height

  return [
    {
      type: 'edge',
      key: 'bottom',
      orientation: 'horizontal',
      x1: left,
      y1: bottom,
      x2: right,
      y2: bottom
    },
    {
      type: 'edge',
      key: 'top',
      orientation: 'horizontal',
      x1: left,
      y1: top,
      x2: right,
      y2: top
    },
    {
      type: 'edge',
      key: 'left',
      orientation: 'vertical',
      x1: left,
      y1: bottom,
      x2: left,
      y2: top
    },
    {
      type: 'edge',
      key: 'right',
      orientation: 'vertical',
      x1: right,
      y1: bottom,
      x2: right,
      y2: top
    }
  ].map((edge) => ({
    ...edge,
    ...meta
  }))
} // End getRectSnapEdges

//=================
function getMoveTargetSnapPoints(targetType, target, currentView) {
  const rect = getMoveTargetRect(targetType, target, currentView)

  if (!rect) return []

  return getRectCornerSnapPoints(rect, {
    targetType,
    targetId: target.id
  })
} // End getMoveTargetSnapPoints

//=================
function getNearestSnapPoint(snapPoints, localPoint, tolerance) {
  let best = null

  snapPoints.forEach((snapPoint) => {
    const distance = distanceBetweenPoints(localPoint, snapPoint)

    if (distance > tolerance) return
    if (best && distance >= best.distance) return

    best = {
      ...snapPoint,
      distance
    }
  })

  return best
} // End getNearestSnapPoint

//=================
function collectHoverSnapCandidates(panels = [], boxes = [], localPoint, currentView) {
  const candidates = []

  panels.forEach((panel) => {
    const rect = getPanelViewRect(panel, currentView)

    if (!rect) return
    if (!pointInRect(rect, localPoint)) return

    candidates.push({
      targetType: 'panel',
      target: panel,
      rect,
      snapPoints: getMoveTargetSnapPoints('panel', panel, currentView)
    })
  })

  boxes.forEach((box) => {
    const rect = getBoxViewRect(box, currentView)

    if (!rect) return
    if (!pointInRect(rect, localPoint)) return

    candidates.push({
      targetType: 'box',
      target: box,
      rect,
      snapPoints: getMoveTargetSnapPoints('box', box, currentView)
    })
  })

  return candidates
} // End collectHoverSnapCandidates

//=================
export function getMoveHoverResult(panels = [], boxes = [], localPoint, viewport, currentView = 'front') {
  const tolerance = getMoveTolerance(viewport)
  const candidates = collectHoverSnapCandidates(panels, boxes, localPoint, currentView)

  let best = null

  candidates.forEach((candidate) => {
    const snap = getNearestSnapPoint(candidate.snapPoints, localPoint, tolerance)

    if (!snap) {
      if (!best) {
        best = {
          ...candidate,
          snap: null,
          distance: Infinity
        }
      }

      return
    }

    if (best?.snap && snap.distance >= best.snap.distance) return

    best = {
      ...candidate,
      snap,
      distance: snap.distance
    }
  })

  if (!best) {
    return {
      targetType: null,
      target: null,
      snap: null,
      snapPoints: []
    }
  }

  return {
    targetType: best.targetType,
    target: best.target,
    snap: best.snap,
    snapPoints: best.snapPoints
  }
} // End getMoveHoverResult

//=================
export function updateMoveHover(moveState, panels = [], boxes = [], localPoint, viewport, currentView = 'front') {
  const hover = getMoveHoverResult(
    panels,
    boxes,
    localPoint,
    viewport,
    currentView
  )

  const hoverSnapPoints = (hover.snapPoints || []).map((snapPoint) => ({
    ...snapPoint,
    active: Boolean(hover.snap && hover.snap.id === snapPoint.id)
  }))

  return {
    ...moveState,
    cursorLocal: localPoint ? { ...localPoint } : null,
    hoverTargetType: hover.targetType,
    hoverTargetId: hover.target?.id || null,
    hoverSnap: hover.snap,
    hoverSnapPoints
  }
} // End updateMoveHover

//=================
export function startMoveFromHover(moveState, panels = [], boxes = [], localPoint, viewport, currentView = 'front') {
  const hoverState = updateMoveHover(
    moveState,
    panels,
    boxes,
    localPoint,
    viewport,
    currentView
  )

  if (!hoverState.hoverSnap) {
    return hoverState
  }

  const targetType = hoverState.hoverSnap.targetType
  const targetId = hoverState.hoverSnap.targetId
  const source = targetType === 'panel' ? panels : boxes
  const target = source.find((item) => item.id === targetId)

  if (!target) return hoverState

  return {
    ...hoverState,
    active: true,
    phase: 'pick-target',

    targetType,
    targetId,

    baseSnap: { ...hoverState.hoverSnap },
    basePoint: {
      x: toNumber(hoverState.hoverSnap.x),
      y: toNumber(hoverState.hoverSnap.y)
    },
    targetPoint: {
      x: toNumber(hoverState.hoverSnap.x),
      y: toNumber(hoverState.hoverSnap.y)
    },

    originalTarget: { ...target },

    // Click lần 1 chỉ chọn điểm gốc, chưa tạo preview.
    previewTarget: null,

    hoverSnap: null,
    hoverSnapPoints: [],
    targetSnap: null,
    cursorLocal: localPoint ? { ...localPoint } : null,
    lockAxis: null
  }
} // End startMoveFromHover

//=================
function collectTargetSnapSources(panels = [], boxes = [], movingType, movingId, currentView = 'front') {
  const points = []
  const edges = []

  panels.forEach((panel) => {
    if (!panel || (movingType === 'panel' && panel.id === movingId)) return

    const rect = getPanelViewRect(panel, currentView)

    if (!rect) return

    const meta = {
      targetType: 'panel',
      targetId: panel.id
    }

    points.push(...getRectCornerSnapPoints(rect, meta))
    points.push(...getRectMiddleSnapPoints(rect, meta))
    edges.push(...getRectSnapEdges(rect, meta))
  })

  boxes.forEach((box) => {
    if (!box || (movingType === 'box' && box.id === movingId)) return

    const rect = getBoxViewRect(box, currentView)

    if (!rect) return

    const meta = {
      targetType: 'box',
      targetId: box.id
    }

    points.push(...getRectCornerSnapPoints(rect, meta))
    points.push(...getRectMiddleSnapPoints(rect, meta))
    edges.push(...getRectSnapEdges(rect, meta))
  })

  return {
    points,
    edges
  }
} // End collectTargetSnapSources

//=================
function findNearestPointSnap(localPoint, targets, tolerance) {
  let best = null

  if (!localPoint || !targets || !Array.isArray(targets.points)) {
    return null
  }

  targets.points.forEach((target) => {
    const distance = distanceBetweenPoints(localPoint, target)

    if (distance > tolerance) return
    if (best && distance >= best.distance) return

    best = {
      ...target,
      type: target.type || 'corner',
      distance
    }
  })

  return best
} // End findNearestPointSnap

//=================
function findNearestEdgeSnap(localPoint, targets, tolerance) {
  let best = null

  if (!localPoint || !targets || !Array.isArray(targets.edges)) {
    return null
  }

  targets.edges.forEach((edge) => {
    let snapPoint = null

    if (edge.orientation === 'horizontal') {
      snapPoint = {
        x: clamp(toNumber(localPoint.x), edge.x1, edge.x2),
        y: edge.y1
      }
    }

    if (edge.orientation === 'vertical') {
      snapPoint = {
        x: edge.x1,
        y: clamp(toNumber(localPoint.y), edge.y1, edge.y2)
      }
    }

    if (!snapPoint) return

    const distance = distanceBetweenPoints(localPoint, snapPoint)

    if (distance > tolerance) return
    if (best && distance >= best.distance) return

    best = {
      type: 'edge',
      key: edge.key,
      orientation: edge.orientation,
      targetType: edge.targetType,
      targetId: edge.targetId,
      x: snapPoint.x,
      y: snapPoint.y,
      distance
    }
  })

  return best
} // End findNearestEdgeSnap

//=================
function resolveMoveTargetPoint(moveState, panels = [], boxes = [], localPoint, viewport, currentView = 'front') {
  if (!localPoint) {
    return {
      point: moveState.targetPoint || moveState.basePoint || { x: 0, y: 0 },
      snap: null
    }
  }

  const tolerance = getMoveTolerance(viewport)
  const targets = collectTargetSnapSources(
    panels,
    boxes,
    moveState.targetType,
    moveState.targetId,
    currentView
  )

  const pointSnap = findNearestPointSnap(localPoint, targets, tolerance)
  const edgeSnap = findNearestEdgeSnap(localPoint, targets, tolerance)

  let bestSnap = null

  if (pointSnap && edgeSnap) {
    // Ưu tiên góc và tâm cạnh nếu đang gần điểm đó.
    // Nếu không có đoạn này, edge snap dễ thắng và renderer sẽ vẽ vuông.
    if (pointSnap.type === 'corner' || pointSnap.type === 'midpoint') {
      bestSnap = pointSnap.distance <= edgeSnap.distance + tolerance * 0.35
        ? pointSnap
        : edgeSnap
    } else {
      bestSnap = pointSnap.distance <= edgeSnap.distance ? pointSnap : edgeSnap
    }
  } else {
    bestSnap = pointSnap || edgeSnap
  }

  if (!bestSnap) {
    return {
      point: {
        x: toNumber(localPoint.x),
        y: toNumber(localPoint.y)
      },
      snap: null
    }
  }

  return {
    point: {
      x: toNumber(bestSnap.x),
      y: toNumber(bestSnap.y)
    },
    snap: bestSnap
  }
} // End resolveMoveTargetPoint

//=================
export function getAxisLockedPoint(basePoint, targetPoint, lockAxis) {
  if (!basePoint || !targetPoint || !lockAxis) {
    return targetPoint
  }

  const dx = toNumber(targetPoint.x) - toNumber(basePoint.x)
  const dy = toNumber(targetPoint.y) - toNumber(basePoint.y)

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: toNumber(targetPoint.x),
      y: toNumber(basePoint.y)
    }
  }

  return {
    x: toNumber(basePoint.x),
    y: toNumber(targetPoint.y)
  }
} // End getAxisLockedPoint

//=================
function getWorldDeltaFromViewDelta(dx, dy, currentView = 'front') {
  const camera = getCameraConfig(currentView)

  return {
    axisU: camera.axisU,
    axisV: camera.axisV,
    deltaU: camera.reverseU ? -dx : dx,
    deltaV: camera.reverseV ? -dy : dy
  }
} // End getWorldDeltaFromViewDelta

//=================
function applyPanelAxisDelta(panel, axis, delta) {
  const next = { ...panel }

  if (axis === 'x') {
    const sourceX = toNumber(panel.x3d ?? panel.x, 0)
    const nextX = sourceX + delta

    next.x3d = nextX
    next.x = nextX

    return next
  }

  if (axis === 'y') {
    const sourceY = toNumber(panel.y3d ?? panel.worldY ?? panel.depthY, 0)
    const nextY = sourceY + delta

    next.y3d = nextY
    next.worldY = nextY
    next.depthY = nextY

    return next
  }

  if (axis === 'z') {
    const sourceZ = toNumber(panel.z3d ?? panel.z ?? panel.y, 0)
    const nextZ = sourceZ + delta

    next.z3d = nextZ
    next.z = nextZ
    next.y = nextZ

    return next
  }

  return next
} // End applyPanelAxisDelta

//=================
function movePanelByViewDelta(panel, dx, dy, currentView = 'front') {
  const worldDelta = getWorldDeltaFromViewDelta(dx, dy, currentView)
  let nextPanel = { ...panel }

  nextPanel = applyPanelAxisDelta(nextPanel, worldDelta.axisU, worldDelta.deltaU)
  nextPanel = applyPanelAxisDelta(nextPanel, worldDelta.axisV, worldDelta.deltaV)

  return nextPanel
} // End movePanelByViewDelta

//=================
function applyBoxAxisDelta(box, axis, delta) {
  const next = { ...box }

  if (axis === 'x') {
    const sourceX = toNumber(box.x, 0)
    const nextX = sourceX + delta

    next.x = nextX
    next.x3d = nextX

    return next
  }

  if (axis === 'y') {
    const sourceY = toNumber(box.y, 0)
    const nextY = sourceY + delta

    next.y = nextY
    next.y3d = nextY

    return next
  }

  if (axis === 'z') {
    const sourceZ = toNumber(box.z, 0)
    const nextZ = sourceZ + delta

    next.z = nextZ
    next.z3d = nextZ

    return next
  }

  return next
} // End applyBoxAxisDelta

//=================
function moveBoxByViewDelta(box, dx, dy, currentView = 'top') {
  const worldDelta = getWorldDeltaFromViewDelta(dx, dy, currentView)
  let nextBox = { ...box }

  nextBox = applyBoxAxisDelta(nextBox, worldDelta.axisU, worldDelta.deltaU)
  nextBox = applyBoxAxisDelta(nextBox, worldDelta.axisV, worldDelta.deltaV)

  return nextBox
} // End moveBoxByViewDelta

//=================
function moveTargetByViewDelta(targetType, target, dx, dy, currentView = 'front') {
  if (targetType === 'panel') {
    return movePanelByViewDelta(target, dx, dy, currentView)
  }

  if (targetType === 'box') {
    return moveBoxByViewDelta(target, dx, dy, currentView)
  }

  return target
} // End moveTargetByViewDelta

//=================
export function previewMoveToTarget(moveState, panels = [], boxes = [], localPoint, viewport, lockAxis = false, currentView = 'front') {
  if (!moveState.active || moveState.phase !== 'pick-target') {
    return moveState
  }

  if (!moveState.originalTarget || !moveState.basePoint || !localPoint) {
    return moveState
  }

  const resolvedTarget = resolveMoveTargetPoint(
    moveState,
    panels,
    boxes,
    localPoint,
    viewport,
    currentView
  )

  const targetPoint = getAxisLockedPoint(
    moveState.basePoint,
    resolvedTarget.point,
    lockAxis
  )

  const dx = toNumber(targetPoint.x) - toNumber(moveState.basePoint.x)
  const dy = toNumber(targetPoint.y) - toNumber(moveState.basePoint.y)

  const previewTarget = moveTargetByViewDelta(
    moveState.targetType,
    moveState.originalTarget,
    dx,
    dy,
    currentView
  )

  if (!previewTarget) {
    return {
      ...moveState,
      cursorLocal: localPoint ? { ...localPoint } : null,
      targetSnap: null,
      previewTarget: null
    }
  }

  return {
    ...moveState,
    cursorLocal: localPoint ? { ...localPoint } : null,
    targetPoint,
    previewTarget,
    targetSnap: resolvedTarget.snap,
    lockAxis: lockAxis ? (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y') : null
  }
} // End previewMoveToTarget

//=================
export function commitMoveToTarget(moveState, panels = [], boxes = [], localPoint, viewport, lockAxis = false, currentView = 'front') {
  if (!moveState.active || moveState.phase !== 'pick-target') {
    return {
      moveState,
      panels,
      boxes,
      movedTarget: null
    }
  }

  const nextMoveState = previewMoveToTarget(
    moveState,
    panels,
    boxes,
    localPoint,
    viewport,
    lockAxis,
    currentView
  )

  if (!nextMoveState.previewTarget) {
    return {
      moveState: resetMoveState(),
      panels,
      boxes,
      movedTarget: null
    }
  }

  const nextPanels = panels.map((panel) => {
    if (nextMoveState.targetType !== 'panel') return panel
    if (panel.id !== nextMoveState.targetId) return panel

    return nextMoveState.previewTarget
  })

  const nextBoxes = boxes.map((box) => {
    if (nextMoveState.targetType !== 'box') return box
    if (box.id !== nextMoveState.targetId) return box

    return nextMoveState.previewTarget
  })

  return {
    moveState: resetMoveState(),
    panels: nextPanels,
    boxes: nextBoxes,
    movedTarget: {
      type: nextMoveState.targetType,
      id: nextMoveState.targetId,
      target: nextMoveState.previewTarget
    }
  }
} // End commitMoveToTarget

//=================
export function cancelMove() {
  return resetMoveState()
} // End cancelMove