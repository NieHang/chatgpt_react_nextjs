/** Bounded line comparison for tool responses, not a patch to apply. */
export function summarizeFileChanges(before: string, after: string) {
  const lines = (text: string) => {
    if (!text) return []
    const result = text.split(/\r\n|\n|\r/)
    if (result[result.length - 1] === '') result.pop()
    return result
  }
  const oldLines = lines(before)
  const newLines = lines(after)
  let start = 0
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++
  let oldEnd = oldLines.length
  let newEnd = newLines.length
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--
    newEnd--
  }
  const oldCount = oldEnd - start
  const newCount = newEnd - start
  const coarse = (oldCount + 1) * (newCount + 1) > 250_000
  const preview: string[] = []
  let added = 0
  let removed = 0
  let truncated = false
  let previewLength = 0
  const emit = (sign: '+' | '-', index: number, text: string) => {
    if (sign === '+') added++
    else removed++
    const entry = `${sign} ${sign === '+' ? 'new' : 'old'} ${index + 1}: ${text.slice(0, 300)}`
    if (text.length > 300) truncated = true
    if (preview.length < 80 && previewLength + entry.length <= 12_000) {
      preview.push(entry)
      previewLength += entry.length
    } else truncated = true
  }
  if (coarse) {
    for (let i = start; i < oldEnd; i++) emit('-', i, oldLines[i])
    for (let j = start; j < newEnd; j++) emit('+', j, newLines[j])
  } else {
    const width = newCount + 1
    const table = new Uint32Array((oldCount + 1) * width)
    for (let i = oldCount - 1; i >= 0; i--) {
      for (let j = newCount - 1; j >= 0; j--) {
        table[i * width + j] = oldLines[start + i] === newLines[start + j]
          ? 1 + table[(i + 1) * width + j + 1]
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < oldCount || j < newCount) {
      if (i < oldCount && j < newCount && oldLines[start + i] === newLines[start + j]) {
        i++
        j++
      } else if (i < oldCount && (j === newCount || table[(i + 1) * width + j] >= table[i * width + j + 1])) {
        emit('-', start + i, oldLines[start + i])
        i++
      } else {
        emit('+', start + j, newLines[start + j])
        j++
      }
    }
  }
  return {
    changed: before !== after,
    old_line_count: oldLines.length,
    new_line_count: newLines.length,
    added_lines: added,
    removed_lines: removed,
    comparison: coarse ? 'replacement_block' : 'line_diff',
    note: coarse
      ? 'Large edit: counts cover the entire replacement block, including any unchanged lines inside it.'
      : before !== after && added === 0 && removed === 0
        ? 'Only line endings or the final newline changed.'
        : 'Minus marks old lines; plus marks new lines. Line numbers refer to their respective versions.',
    preview: preview.join('\n'),
    preview_truncated: truncated,
  }
}
