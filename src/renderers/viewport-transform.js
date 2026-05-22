export function getLocalScale(viewport) {
  return viewport.localScale * viewport.zoom
}

export function localToScreen(viewport, localX, localY) {
  const scale = getLocalScale(viewport)
  return {
    x: viewport.localOriginX + viewport.panX + localX * scale,
    y: viewport.localOriginY + viewport.panY - localY * scale
  }
}

export function screenToLocal(viewport, screenX, screenY) {
  const scale = getLocalScale(viewport)
  return {
    x: (screenX - viewport.localOriginX - viewport.panX) / scale,
    y: (viewport.localOriginY + viewport.panY - screenY) / scale
  }
}
