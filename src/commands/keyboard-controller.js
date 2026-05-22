import { parseCommand } from './command-parser'
import { useAppStore } from '../stores/useAppStore'
import { useDrawingStore } from '../stores/useDrawingStore'

export function handleViewportKey(event) {
  const app = useAppStore()
  const drawing = useDrawingStore()
  const allowed = '0123456789./-'

  if (event.key === 'Delete' || event.key === 'Backspace' && !app.state.commandBuffer) {
    drawing.deleteSelected()
    return
  }

  if (event.key === 'Escape') {
    app.clearCommand()
    drawing.clearSelection()
    app.setStatus('Đã hủy lệnh')
    return
  }

  if (event.key === 'Backspace') {
    app.state.commandBuffer = app.state.commandBuffer.slice(0, -1)
    return
  }

  if (event.key === 'Enter') {
    const command = parseCommand(app.state.commandBuffer)
    if (command.type === 'split') drawing.splitHoveredZone(command.count)
    else if (command.type === 'number') drawing.moveSelectedByNumber(command.value)
    else app.setStatus('Lệnh không hợp lệ')
    app.clearCommand()
    return
  }

  if (allowed.includes(event.key)) {
    app.appendCommand(event.key)
    app.setStatus(`Nhập lệnh: ${app.state.commandBuffer}`)
  }
}
