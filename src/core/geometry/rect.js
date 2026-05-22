export function rectContainsPoint(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
}

export function rectEdges(rect) {
  return {
    left: { x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.height },
    right: { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height },
    bottom: { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },
    top: { x1: rect.x, y1: rect.y + rect.height, x2: rect.x + rect.width, y2: rect.y + rect.height }
  }
}

export function distancePointToSegment(point, segment) {
  const ax = segment.x1
  const ay = segment.y1
  const bx = segment.x2
  const by = segment.y2
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(point.x - ax, point.y - ay)
  const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq))
  const px = ax + t * dx
  const py = ay + t * dy
  return Math.hypot(point.x - px, point.y - py)
}

export function rectFromPanel(panel) {
  return { x: panel.x, y: panel.y, width: panel.width, height: panel.height }
}
