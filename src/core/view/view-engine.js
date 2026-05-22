const AXIS_COLOR = {
  X: '#e53935',
  Y: '#2eaf5d',
  Z: '#1e88e5'
}

const VIEW_AXIS_CONFIG = {
  front: {
    key: 'front',
    label: 'Trước',
    plane: 'X0Z',

    horizontalAxis: 'X',
    verticalAxis: 'Z',

    horizontalSizeKey: 'width',
    verticalSizeKey: 'height',

    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Z,

    reverseHorizontal: false,
    reverseVertical: false,

    originSide: 'left',
    originCorner: 'bottom-left'
  },

  back: {
    key: 'back',
    label: 'Sau',
    plane: 'X0Z',

    horizontalAxis: 'X',
    verticalAxis: 'Z',

    horizontalSizeKey: 'width',
    verticalSizeKey: 'height',

    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Z,

    reverseHorizontal: true,
    reverseVertical: false,

    originSide: 'right',
    originCorner: 'bottom-right'
  },

  left: {
    key: 'left',
    label: 'Trái',
    plane: 'Y0Z',

    horizontalAxis: 'Y',
    verticalAxis: 'Z',

    horizontalSizeKey: 'depth',
    verticalSizeKey: 'height',

    horizontalColor: AXIS_COLOR.Y,
    verticalColor: AXIS_COLOR.Z,

    reverseHorizontal: false,
    reverseVertical: false,

    originSide: 'left',
    originCorner: 'bottom-left'
  },

  right: {
    key: 'right',
    label: 'Phải',
    plane: 'Y0Z',

    horizontalAxis: 'Y',
    verticalAxis: 'Z',

    horizontalSizeKey: 'depth',
    verticalSizeKey: 'height',

    horizontalColor: AXIS_COLOR.Y,
    verticalColor: AXIS_COLOR.Z,

    reverseHorizontal: true,
    reverseVertical: false,

    originSide: 'right',
    originCorner: 'bottom-right'
  },

  top: {
    key: 'top',
    label: 'Trên',
    plane: 'X0Y',

    horizontalAxis: 'X',
    verticalAxis: 'Y',

    horizontalSizeKey: 'width',
    verticalSizeKey: 'depth',

    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Y,

    reverseHorizontal: false,
    reverseVertical: false,

    originSide: 'left',
    originCorner: 'bottom-left'
  },

  bottom: {
    key: 'bottom',
    label: 'Dưới',
    plane: 'X0Y',

    horizontalAxis: 'X',
    verticalAxis: 'Y',

    horizontalSizeKey: 'width',
    verticalSizeKey: 'depth',

    horizontalColor: AXIS_COLOR.X,
    verticalColor: AXIS_COLOR.Y,

    reverseHorizontal: true,
    reverseVertical: false,

    originSide: 'right',
    originCorner: 'bottom-right'
  }
}

export function getViewAxisConfig(viewKey = 'front') {
  return VIEW_AXIS_CONFIG[viewKey] || VIEW_AXIS_CONFIG.front
}

export function getViewPlaneLabel(viewKey = 'front') {
  return getViewAxisConfig(viewKey).plane
}

export function getCabinetViewSize(cabinetState, viewKey = 'front') {
  const config = getViewAxisConfig(viewKey)

  return {
    width: Number(cabinetState[config.horizontalSizeKey]) || 0,
    height: Number(cabinetState[config.verticalSizeKey]) || 0,
    horizontalAxis: config.horizontalAxis,
    verticalAxis: config.verticalAxis,
    horizontalColor: config.horizontalColor,
    verticalColor: config.verticalColor,
    plane: config.plane,
    label: config.label
  }
}

export function getCabinetViewRect(cabinetState, viewKey = 'front') {
  const size = getCabinetViewSize(cabinetState, viewKey)

  return {
    id: `cabinet_${viewKey}`,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    view: viewKey,
    plane: size.plane,
    name: size.label
  }
}

export function getViewLocalLabel(viewKey = 'front') {
  const config = getViewAxisConfig(viewKey)

  return {
    horizontal: config.horizontalAxis,
    vertical: config.verticalAxis,
    horizontalColor: config.horizontalColor,
    verticalColor: config.verticalColor,
    plane: config.plane,
    label: config.label,
    originSide: config.originSide,
    originCorner: config.originCorner,
    reverseHorizontal: config.reverseHorizontal,
    reverseVertical: config.reverseVertical
  }
}

export function isReverseView(viewKey = 'front') {
  return Boolean(getViewAxisConfig(viewKey).reverseHorizontal)
}

export function isFrontBackView(viewKey = 'front') {
  return viewKey === 'front' || viewKey === 'back'
}

export function isSideView(viewKey = 'front') {
  return viewKey === 'left' || viewKey === 'right'
}

export function isTopBottomView(viewKey = 'front') {
  return viewKey === 'top' || viewKey === 'bottom'
}