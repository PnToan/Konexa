export function parseCommand(buffer) {
  const text = String(buffer || '').trim().toLowerCase()
  if (!text) return { type: 'empty' }

  const splitMatch = text.match(/^\/(\d+)$/)
  if (splitMatch) return { type: 'split', count: Number(splitMatch[1]) }

  const number = Number(text)
  if (Number.isFinite(number)) return { type: 'number', value: number }

  return { type: 'unknown', raw: text }
}
