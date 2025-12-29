import { CraftBlock, Timeblock, UnscheduledTask, ParsedBlocks } from './types'
import {
  TIME_PATTERN,
  TASK_WITH_TIME_PATTERN,
  TODO_PATTERN,
  BULLET_PREFIX,
  stripHighlight,
  stripCheckbox,
  parseTime,
  categorizeTask,
} from './time-parser'

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

    // Strip bullet prefix first (-, •, *, +)
    trimmed = trimmed.replace(BULLET_PREFIX, '')

    // Check for highlight wrapper and extract color
    const { content: strippedContent, color: extractedColor } = stripHighlight(trimmed)
    if (extractedColor) {
      highlight = extractedColor
      trimmed = strippedContent
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
          originalMarkdown: originalMarkdown || text,
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
          originalMarkdown: originalMarkdown || text,
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
        originalMarkdown: originalMarkdown || text,
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
      // For task/todo/checkbox listStyle, check if it's a time-based task or unscheduled
      if (block.listStyle === 'task' || block.listStyle === 'todo' || block.listStyle === 'checkbox') {
        // Strip bullet prefix, checkbox, AND highlight for checking time pattern
        let strippedText = stripCheckbox(block.markdown)
        // Also strip highlight wrapper before checking for time pattern
        const { content: contentWithoutHighlight } = stripHighlight(strippedText)
        strippedText = contentWithoutHighlight.trim()

        // If no time pattern, treat as unscheduled task
        if (strippedText && !strippedText.match(TIME_PATTERN)) {
          const isChecked =
            block.taskInfo?.state === 'done' || /\[x\]/i.test(block.markdown)
          unscheduled.push({
            id: blockId,
            text: strippedText,
            checked: isChecked,
            originalMarkdown: block.markdown,
          })
          return
        }
        // Has time pattern - fall through to processText
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
