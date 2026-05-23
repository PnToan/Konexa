const EPS = 0.001

//=================
function round3(value) {
  return Math.round(Number(value || 0) * 1000) / 1000
} // End round3

//=================
function uniqueSorted(values) {
  return Array.from(new Set(values.map((value) => round3(value))))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
} // End uniqueSorted

//=================
function normalizePanelRect(panel) {
  if (!panel) return null

  const x = Number(panel.x || 0)
  const y = Number(panel.y || 0)
  const width = Number(panel.width || 0)
  const height = Number(panel.height || panel.depth || panel.thickness || 0)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width <= EPS || height <= EPS) return null

  return {
    x1: x,
    x2: x + width,
    y1: y,
    y2: y + height,
    width,
    height,
    orientation: panel.orientation || panel.panelKind || null,
    edge: panel.edge || panel.panelSide || null
  }
} // End normalizePanelRect

//=================
function collectZoneCuts(cabinetRect, panels = []) {
  const x1 = Number(cabinetRect.x || 0)
  const y1 = Number(cabinetRect.y || 0)
  const x2 = x1 + Number(cabinetRect.width || 0)
  const y2 = y1 + Number(cabinetRect.height || 0)

  const xCuts = [x1, x2]
  const yCuts = [y1, y2]

  panels.forEach((panel) => {
    const rect = normalizePanelRect(panel)

    if (!rect) return

    xCuts.push(rect.x1, rect.x2)
    yCuts.push(rect.y1, rect.y2)
  })

  return {
    xs: uniqueSorted(xCuts).filter((x) => x >= x1 - EPS && x <= x2 + EPS),
    ys: uniqueSorted(yCuts).filter((y) => y >= y1 - EPS && y <= y2 + EPS)
  }
} // End collectZoneCuts

//=================
function panelBlocksCell(panel, x1, x2, y1, y2) {
  const rect = normalizePanelRect(panel)

  if (!rect) return false

  const overlapX = x2 > rect.x1 + EPS && x1 < rect.x2 - EPS
  const overlapY = y2 > rect.y1 + EPS && y1 < rect.y2 - EPS

  return overlapX && overlapY
} // End panelBlocksCell

//=================
function createCellMap(cabinetRect, panels = []) {
  const cuts = collectZoneCuts(cabinetRect, panels)
  const cells = []
  const cellMap = {}

  for (let xi = 0; xi < cuts.xs.length - 1; xi += 1) {
    for (let yi = 0; yi < cuts.ys.length - 1; yi += 1) {
      const x1 = cuts.xs[xi]
      const x2 = cuts.xs[xi + 1]
      const y1 = cuts.ys[yi]
      const y2 = cuts.ys[yi + 1]

      if (x2 - x1 <= EPS || y2 - y1 <= EPS) continue

      const blocked = panels.some((panel) => panelBlocksCell(panel, x1, x2, y1, y2))
      const key = `${xi}_${yi}`
      const cell = {
        key,
        xi,
        yi,
        x1,
        x2,
        y1,
        y2,
        blocked
      }

      cells.push(cell)
      cellMap[key] = cell
    }
  }

  return { cells, cellMap }
} // End createCellMap

//=================
function getOpenNeighbors(cell, cellMap) {
  const candidates = [
    cellMap[`${cell.xi - 1}_${cell.yi}`],
    cellMap[`${cell.xi + 1}_${cell.yi}`],
    cellMap[`${cell.xi}_${cell.yi - 1}`],
    cellMap[`${cell.xi}_${cell.yi + 1}`]
  ]

  return candidates.filter((nextCell) => nextCell && !nextCell.blocked)
} // End getOpenNeighbors

//=================
function createZoneFromCells(cabinetRect, group, index) {
  let minX = group[0].x1
  let maxX = group[0].x2
  let minY = group[0].y1
  let maxY = group[0].y2

  group.forEach((cell) => {
    minX = Math.min(minX, cell.x1)
    maxX = Math.max(maxX, cell.x2)
    minY = Math.min(minY, cell.y1)
    maxY = Math.max(maxY, cell.y2)
  })

  const width = maxX - minX
  const height = maxY - minY

  if (width <= EPS || height <= EPS) return null

  return {
    id: `${cabinetRect.id || 'cabinet'}_zone_${String(index).padStart(3, '0')}`,
    name: `Zone ${index}`,

    x: minX,
    y: minY,
    width,
    height,

    minX,
    maxX,
    minY,
    maxY,

    minZ: minY,
    maxZ: maxY,

    bounds: {
      left: minX,
      right: maxX,
      bottom: minY,
      top: maxY
    },

    cells: group
  }
} // End createZoneFromCells

//=================
export function buildZones(cabinetRect, panels = []) {
  if (!cabinetRect) return []

  const { cells, cellMap } = createCellMap(cabinetRect, panels)
  const visited = {}
  const zones = []
  let zoneIndex = 1

  cells.forEach((startCell) => {
    if (startCell.blocked) return
    if (visited[startCell.key]) return

    const stack = [startCell]
    const group = []

    visited[startCell.key] = true

    while (stack.length > 0) {
      const cell = stack.pop()

      group.push(cell)

      getOpenNeighbors(cell, cellMap).forEach((nextCell) => {
        if (visited[nextCell.key]) return

        visited[nextCell.key] = true
        stack.push(nextCell)
      })
    }

    if (group.length === 0) return

    const zone = createZoneFromCells(cabinetRect, group, zoneIndex)

    if (!zone) return

    zones.push(zone)
    zoneIndex += 1
  })

  return zones
} // End buildZones