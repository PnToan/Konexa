export function normalizePositiveNumber(value, fallback = 1) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return number
}

export function roundMm(value) {
  return Math.round(Number(value || 0) * 100) / 100
}
