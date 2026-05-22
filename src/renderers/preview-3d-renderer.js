export function renderPreview3D(ctx, payload) {
  const { width, height, cabinet, panels } = payload
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#161616'
  ctx.fillRect(0, 0, width, height)

  const pad = 24
  const boxW = width - pad * 2
  const boxH = height - pad * 2
  const scale = Math.min(boxW / cabinet.width, boxH / cabinet.height)
  const frontW = cabinet.width * scale
  const frontH = cabinet.height * scale
  const x = (width - frontW) / 2
  const y = (height - frontH) / 2
  const depthOffset = Math.min(52, cabinet.depth * scale * 0.18)

  ctx.strokeStyle = '#6f7780'
  ctx.lineWidth = 1
  ctx.fillStyle = '#252b31'
  ctx.fillRect(x + depthOffset, y - depthOffset, frontW, frontH)
  ctx.strokeRect(x + depthOffset, y - depthOffset, frontW, frontH)

  ctx.fillStyle = '#303841'
  ctx.fillRect(x, y, frontW, frontH)
  ctx.strokeStyle = '#d5d7da'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, frontW, frontH)

  panels.forEach((panel) => {
    ctx.fillStyle = panel.orientation === 'vertical' ? '#e55353' : '#3fa9f5'
    const px = x + (panel.x / cabinet.width) * frontW
    const py = y + frontH - ((panel.y + panel.height) / cabinet.depth) * frontH
    const pw = Math.max(2, (panel.width / cabinet.width) * frontW)
    const ph = Math.max(2, (panel.height / cabinet.depth) * frontH)
    ctx.fillRect(px, py, pw, ph)
  })

  ctx.fillStyle = '#ffffff'
  ctx.font = '11px Arial'
  ctx.fillText(`${cabinet.width} x ${cabinet.depth} x ${cabinet.height}`, 10, height - 10)
}
