import { distancePointToSegment, rectEdges, rectContainsPoint, rectFromPanel } from '../geometry/rect'

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
}

export function hitTestPanel(panels, point) {
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    const panel = panels[i]
    if (rectContainsPoint(rectFromPanel(panel), point)) return { type: 'panel', panel }
  }
  return null
}
