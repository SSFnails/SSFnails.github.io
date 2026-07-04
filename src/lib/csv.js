// Экспорт в CSV для Excel: BOM + точка с запятой, чтобы русский Excel открывал без танцев
function esc(v) {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map(esc).join(';'))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
