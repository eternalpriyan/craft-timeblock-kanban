import { CraftBlock, Timeblock, UnscheduledTask, ParsedBlocks } from './types'

// Time pattern: flexible for 12/24 hour formats
// Handles: `10:00 AM - 11:00 AM` - Task, 10 AM - 11 AM Task, 10-11 AM: Task
// Separators: -, –, —, to, ->
// Task separators: -, :, or just space
// Minutes optional (defaults to :00)
// Shared AM/PM: "10-11 AM" means both 10 AM and 11 AM
// Supports optional bullet point prefix: •, -, *, +
const TIME_PATTERN =
  /^(?:[•\-*+]\s+)?`?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]+|to|->|→)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`?\s*(?:[-–—:]|\s)\s*(.+)$/i

// Task with time pattern: - [x] `1:00 PM - 2:00 PM` Task name
const TASK_WITH_TIME_PATTERN =
  /^-?\s*\[([ x]?)\]\s*`?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]+|to|->|→)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`?\s*(?:[-–—:]|\s)\s*(.+)$/i

// Todo pattern (no time)
const TODO_PATTERN = /^-?\s*\[([ x]?)\]\s*(.+)$/i

// Highlight wrapper pattern
const HIGHLIGHT_PATTERN = /^<highlight\s+color=["']([^"']+)["']>(.+)<\/highlight>$/is

function parseTime(hours: string, minutes: string | undefined, period: string | undefined): number | null {
  let h = parseInt(hours, 10)
  const m = parseInt(minutes || '0', 10)

  if (isNaN(h)) return null

  // Handle 12-hour format
  if (period) {
    const p = period.toLowerCase()
    if (p === 'pm' && h !== 12) h += 12
    if (p === 'am' && h === 12) h = 0
  }

  return h + m / 60
}

function categorizeTask(title: string): Timeblock['category'] {
  const lower = title.toLowerCase()

  if (/deep work|focus|code|write|develop|build/.test(lower)) return 'work'
  if (/call|meeting|sync|chat|standup|1:1|interview/.test(lower)) return 'meeting'
  if (/gym|exercise|workout|run|yoga|walk|health|meditat/.test(lower)) return 'health'
  if (/lunch|dinner|breakfast|break|personal|family|friend/.test(lower)) return 'personal'

  return 'default'
}

export function parseBlocks(data: CraftBlock | CraftBlock[] | string): ParsedBlocks {
  const scheduled: Timeblock[] = []
  const unscheduled: UnscheduledTask[] = []

  function processText(
    text: string,
    highlight: string | null = null,
    blockId: string | null = null,
    originalMarkdown: string | null = null
  ) {
    if (!text || typeof text !== 'string') return

    let trimmed = text.trim()
    if (!trimmed) return

    // Check for highlight wrapper
    const highlightMatch = trimmed.match(HIGHLIGHT_PATTERN)
    if (highlightMatch) {
      highlight = highlightMatch[1]
      trimmed = highlightMatch[2].trim()
    }

    // First check for task with time (checkbox + time)
    const taskWithTimeMatch = trimmed.match(TASK_WITH_TIME_PATTERN)
    if (taskWithTimeMatch) {
      const isChecked = taskWithTimeMatch[1].toLowerCase() === 'x'
      let startPeriod = taskWithTimeMatch[4]
      const endPeriod = taskWithTimeMatch[7]
      if (!startPeriod && endPeriod) startPeriod = endPeriod

      const startHour = parseTime(taskWithTimeMatch[2], taskWithTimeMatch[3], startPeriod)
      const endHour = parseTime(taskWithTimeMatch[5], taskWithTimeMatch[6], endPeriod)
      const title = taskWithTimeMatch[8].trim()

      if (startHour !== null && endHour !== null && title) {
        scheduled.push({
          id: blockId,
          start: startHour,
          end: endHour,
          title,
          category: categorizeTask(title),
          highlight,
          originalMarkdown: originalMarkdown || trimmed,
          isTask: true,
          checked: isChecked,
        })
        return
      }
    }

    // Check for regular time pattern (no checkbox)
    const match = trimmed.match(TIME_PATTERN)
    if (match) {
      let startPeriod = match[3]
      const endPeriod = match[6]
      if (!startPeriod && endPeriod) startPeriod = endPeriod

      const startHour = parseTime(match[1], match[2], startPeriod)
      const endHour = parseTime(match[4], match[5], endPeriod)
      const title = match[7].trim()

      if (startHour !== null && endHour !== null && title) {
        scheduled.push({
          id: blockId,
          start: startHour,
          end: endHour,
          title,
          category: categorizeTask(title),
          highlight,
          originalMarkdown: originalMarkdown || trimmed,
          isTask: false,
          checked: false,
        })
        return
      }
    }

    // Check if it's a checkbox/todo item (no time)
    const todoMatch = trimmed.match(TODO_PATTERN)
    if (todoMatch) {
      const isChecked = todoMatch[1].toLowerCase() === 'x'
      unscheduled.push({
        id: blockId,
        text: todoMatch[2].trim(),
        checked: isChecked,
        originalMarkdown: originalMarkdown || trimmed,
      })
    }
  }

  function processBlock(block: CraftBlock) {
    let blockColor = block.color || block.highlight || block.highlightColor || null
    const blockId = block.id || null

    // Handle color as object
    if (blockColor && typeof blockColor === 'object') {
      blockColor = blockColor.color || blockColor.name || null
    }

    // Check style property
    if (!blockColor && block.style) {
      blockColor = block.style.color || block.style.highlight || null
    }

    // Handle markdown field
    if (block.markdown) {
      if (block.listStyle === 'todo' || block.listStyle === 'checkbox') {
        const text = block.markdown.replace(/^-?\s*\[[ x]?\]\s*/i, '').trim()
        if (text && !text.match(TIME_PATTERN)) {
          const isChecked =
            block.taskInfo?.state === 'done' || /^-?\s*\[x\]/i.test(block.markdown)
          unscheduled.push({
            id: blockId,
            text,
            checked: isChecked,
            originalMarkdown: block.markdown,
          })
          return
        }
      }
      processText(block.markdown, blockColor as string | null, blockId, block.markdown)
    }

    // Handle content field
    if (block.content) {
      if (typeof block.content === 'string') {
        processText(block.content, blockColor as string | null, blockId, block.content)
      } else if (Array.isArray(block.content)) {
        block.content.forEach((item) => {
          if (typeof item === 'string') {
            processText(item, blockColor as string | null, blockId, item)
          } else if (typeof item === 'object') {
            processBlock(item)
          }
        })
      }
    }

    // Handle text field
    if (block.text) {
      processText(block.text, null, blockId, block.text)
    }

    // Handle pageTitle
    if (block.pageTitle) {
      processText(block.pageTitle, null, blockId, block.pageTitle)
    }

    // Process nested structures
    if (block.blocks) block.blocks.forEach(processBlock)
    if (block.subblocks) block.subblocks.forEach(processBlock)
    if (block.children) block.children.forEach(processBlock)
    if (block.page) processBlock(block.page)
  }

  // Handle different response structures
  if (typeof data === 'string') {
    // Try to parse as XML (legacy)
    const pageTitleRegex = /<pageTitle>([^<]+)<\/pageTitle>/g
    let match
    while ((match = pageTitleRegex.exec(data)) !== null) {
      processText(match[1])
    }
    const contentRegex = /<content>([^<]+)<\/content>/g
    while ((match = contentRegex.exec(data)) !== null) {
      processText(match[1])
    }
  } else if (Array.isArray(data)) {
    data.forEach(processBlock)
  } else if (data.page) {
    processBlock(data.page)
  } else if (data.blocks) {
    data.blocks.forEach(processBlock)
  } else {
    processBlock(data)
  }

  // Sort by start time
  scheduled.sort((a, b) => a.start - b.start)

  return { scheduled, unscheduled }
}
