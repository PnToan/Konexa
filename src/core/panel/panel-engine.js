let panelIndex = 1

function nextPanelId() {
  return `panel_${String(panelIndex++).padStart(3, '0')}`
}

export function createPanelOnZoneEdge(zone, edge, thickness) {
  const t = Number(thickness || 18)
  const id = nextPanelId()
  const base = {
    id,
    name: `Tấm ${id.replace('panel_', '')}`,
    zoneId: zone.id,
    edge,
    material: 'Nhựa rỗng',
    thickness: t,
    color: edge === 'left' || edge === 'right' ? '#e55353' : '#3fa9f5'
  }

  if (edge === 'left') {
    return { ...base, orientation: 'vertical', x: zone.x, y: zone.y, width: t, height: zone.height }
  }
  if (edge === 'right') {
    return { ...base, orientation: 'vertical', x: zone.x + zone.width - t, y: zone.y, width: t, height: zone.height }
  }
  if (edge === 'bottom') {
    return { ...base, orientation: 'horizontal', x: zone.x, y: zone.y, width: zone.width, height: t }
  }
  return { ...base, orientation: 'horizontal', x: zone.x, y: zone.y + zone.height - t, width: zone.width, height: t }
}

export function splitZoneByCount(zone, count, thickness) {
  const n = Math.max(2, Math.floor(Number(count || 2)))
  const panels = []
  const t = Number(thickness || 18)
  const vertical = zone.width >= zone.height

  for (let i = 1; i < n; i += 1) {
    const id = nextPanelId()
    if (vertical) {
      const x = zone.x + (zone.width / n) * i - t / 2
      panels.push({
        id, name: `Tấm ${id.replace('panel_', '')}`, zoneId: zone.id, edge: 'split', orientation: 'vertical',
        x, y: zone.y, width: t, height: zone.height, thickness: t, material: 'Nhựa rỗng', color: '#e55353'
      })
    } else {
      const y = zone.y + (zone.height / n) * i - t / 2
      panels.push({
        id, name: `Tấm ${id.replace('panel_', '')}`, zoneId: zone.id, edge: 'split', orientation: 'horizontal',
        x: zone.x, y, width: zone.width, height: t, thickness: t, material: 'Nhựa rỗng', color: '#3fa9f5'
      })
    }
  }
  return panels
}

export function movePanelByDelta(panel, dx, dy, lockAxis = false) {
  let moveX = dx
  let moveY = dy
  if (lockAxis) {
    if (Math.abs(dx) >= Math.abs(dy)) moveY = 0
    else moveX = 0
  }
  return { ...panel, x: panel.x + moveX, y: panel.y + moveY }
}
