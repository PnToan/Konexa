const EPS = 0.001

function uniqueSorted(values) {
  return Array.from(new Set(values.map((value) => Math.round(value * 1000) / 1000))).sort((a, b) => a - b)
}

function panelCoversCell(panel, x1, x2, y1, y2) {
  const px1 = panel.x
  const px2 = panel.x + panel.width
  const py1 = panel.y
  const py2 = panel.y + panel.height
  return x1 >= px1 - EPS && x2 <= px2 + EPS && y1 >= py1 - EPS && y2 <= py2 + EPS
}

export function buildZones(cabinetRect, panels = []) {
  const xCuts = [cabinetRect.x, cabinetRect.x + cabinetRect.width]
  const yCuts = [cabinetRect.y, cabinetRect.y + cabinetRect.height]

  panels.forEach((panel) => {
    xCuts.push(panel.x, panel.x + panel.width)
    yCuts.push(panel.y, panel.y + panel.height)
  })

  const xs = uniqueSorted(xCuts).filter((x) => x >= cabinetRect.x - EPS && x <= cabinetRect.x + cabinetRect.width + EPS)
  const ys = uniqueSorted(yCuts).filter((y) => y >= cabinetRect.y - EPS && y <= cabinetRect.y + cabinetRect.height + EPS)
  const zones = []
  let index = 1

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      const x1 = xs[xi]
      const x2 = xs[xi + 1]
      const y1 = ys[yi]
      const y2 = ys[yi + 1]
      if (x2 - x1 <= EPS || y2 - y1 <= EPS) continue
      const occupied = panels.some((panel) => panelCoversCell(panel, x1, x2, y1, y2))
      if (occupied) continue
      zones.push({
        id: `zone_${String(index).padStart(3, '0')}`,
        name: `Zone ${index}`,
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
        bounds: { left: x1, right: x2, bottom: y1, top: y2 }
      })
      index += 1
    }
  }

  return zones
}
