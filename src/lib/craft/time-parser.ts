/**
 * Centralized time parsing module for Craft timeblocks
 *
 * This module handles all time-related parsing and formatting for timeblocks.
 * Modify patterns here to adjust how times are detected and parsed.
 */

// ============================================================================
// PATTERNS - Modify these to adjust time detection
// ============================================================================

/**
 * Highlight wrapper pattern (Craft uses this for colored text)
 * Matches: <highlight color="blue">content</highlight>
 */
export const HIGHLIGHT_PATTERN = /<highlight\s+color=["']([^"']+)["']>(.+?)<\/highlight>/is

/**
 * Time range pattern for parsing timeblocks
 *
 * Matches these formats:
 * - 10:00 AM - 11:00 AM Task
 * - 10 AM - 11 AM Task
 * - 10-11 AM: Task (shared AM/PM)
 * - 7:30-8:30: Task
 * - `8:45am-9:45am` Task (with backticks)
 *
 * Groups:
 * 1. Start hour (required)
 * 2. Start minutes (optional)
 * 3. Start AM/PM (optional)
 * 4. End hour (required)
 * 5. End minutes (optional)
 * 6. End AM/PM (optional)
 * 7. Title/content (required)
 */
export const TIME_PATTERN =
  /^`?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]+|to|->|→)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`?\s*(?:[-–—:]|\s)\s*(.+)$/i

/**
 * Task with time pattern - includes checkbox before time
 * Matches: [x] 1:00 PM - 2:00 PM Task name
 *
 * Groups:
 * 1. Checkbox state (' ' or 'x')
 * 2. Start hour
 * 3. Start minutes
 * 4. Start AM/PM
 * 5. End hour
 * 6. End minutes
 * 7. End AM/PM
 * 8. Title/content
 */
export const TASK_WITH_TIME_PATTERN =
  /^\[([ x]?)\]\s*`?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]+|to|->|→)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`?\s*(?:[-–—:]|\s)\s*(.+)$/i

/**
 * Todo/checkbox pattern (no time)
 * Matches: [ ] Task or [x] Task
 */
export const TODO_PATTERN = /^\[([ x]?)\]\s*(.+)$/i

/**
 * Bullet prefix pattern to strip
 * Matches: -, •, *, + followed by space
 */
export const BULLET_PREFIX = /^(?:[•\-*+]\s+)/

/**
 * Time range regex for markdown replacement
 * Used when updating timeblock times in the original markdown
 *
 * Groups:
 * 1. Prefix (e.g., "- ", "[ ] ")
 * 2. Opening backtick (optional)
 * 3. Start hour
 * 4. Start minutes
 * 5. Start AM/PM
 * 6. End hour
 * 7. End minutes
 * 8. End AM/PM
 * 9. Closing backtick (optional)
 * 10. Separator after time (e.g., ": " or " - ")
 */
export const TIME_RANGE_REPLACEMENT_REGEX =
  /^(.*?)(`?)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]+|to|->|→)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(`?)(\s*(?:[-–—:]|\s)\s*)/i

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Strip highlight wrapper from text and return the content + color
 */
export function stripHighlight(text: string): { content: string; color: string | null } {
  const match = text.match(HIGHLIGHT_PATTERN)
  if (match) {
    return {
      content: text.replace(HIGHLIGHT_PATTERN, '$2').trim(),
      color: match[1]
    }
  }
  return { content: text, color: null }
}

/**
 * Strip bullet prefix from text
 */
export function stripBullet(text: string): string {
  return text.replace(BULLET_PREFIX, '')
}

/**
 * Strip checkbox from text
 * Handles: "- [ ] text", "[ ] text", "[x] text"
 */
export function stripCheckbox(text: string): string {
  return text.replace(/^\s*-?\s*\[[ x]?\]\s*/i, '').trim()
}

/**
 * Parse time string into decimal hours (0-24)
 *
 * @param hours - Hour string (1-12 or 0-23)
 * @param minutes - Minutes string (optional)
 * @param period - AM/PM string (optional)
 * @returns Decimal hour (e.g., 14.5 for 2:30 PM) or null if invalid
 */
export function parseTime(
  hours: string,
  minutes: string | undefined,
  period: string | undefined
): number | null {
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

/**
 * Format decimal hour to time string for markdown
 *
 * @param hour - Decimal hour (e.g., 14.5 for 2:30 PM)
 * @returns Formatted string (e.g., "2:30pm")
 */
export function formatTimeForMarkdown(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'pm' : 'am'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayHour}${period}` : `${displayHour}:${m.toString().padStart(2, '0')}${period}`
}

/**
 * Format decimal hour to display time (12-hour format)
 *
 * @param hour - Decimal hour
 * @returns Formatted string (e.g., "2:30 PM")
 */
export function formatTimeForDisplay(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayHour} ${period}` : `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Check if text contains a time pattern (after stripping highlight/bullet)
 */
export function hasTimePattern(text: string): boolean {
  // Strip highlight first
  const { content } = stripHighlight(text)
  // Strip bullet
  const stripped = stripBullet(content).trim()
  // Check for time pattern
  return TIME_PATTERN.test(stripped)
}

/**
 * Check if text is a task with time
 */
export function hasTaskWithTimePattern(text: string): boolean {
  const { content } = stripHighlight(text)
  const stripped = stripBullet(content).trim()
  return TASK_WITH_TIME_PATTERN.test(stripped)
}

/**
 * Extract time range from text
 * Returns null if no valid time range found
 */
export function extractTimeRange(text: string): {
  start: number;
  end: number;
  title: string;
  isTask: boolean;
  checked: boolean;
} | null {
  // Strip highlight first
  const { content } = stripHighlight(text)
  const stripped = stripBullet(content).trim()

  // Check for task with time first
  const taskMatch = stripped.match(TASK_WITH_TIME_PATTERN)
  if (taskMatch) {
    const isChecked = taskMatch[1].toLowerCase() === 'x'
    let startPeriod = taskMatch[4]
    const endPeriod = taskMatch[7]
    if (!startPeriod && endPeriod) startPeriod = endPeriod

    const startHour = parseTime(taskMatch[2], taskMatch[3], startPeriod)
    const endHour = parseTime(taskMatch[5], taskMatch[6], endPeriod)
    const title = taskMatch[8].trim()

    if (startHour !== null && endHour !== null && title) {
      return { start: startHour, end: endHour, title, isTask: true, checked: isChecked }
    }
  }

  // Check for regular time pattern
  const match = stripped.match(TIME_PATTERN)
  if (match) {
    let startPeriod = match[3]
    const endPeriod = match[6]
    if (!startPeriod && endPeriod) startPeriod = endPeriod

    const startHour = parseTime(match[1], match[2], startPeriod)
    const endHour = parseTime(match[4], match[5], endPeriod)
    const title = match[7].trim()

    if (startHour !== null && endHour !== null && title) {
      return { start: startHour, end: endHour, title, isTask: false, checked: false }
    }
  }

  return null
}

/**
 * Replace time in markdown while preserving original formatting
 *
 * @param original - Original markdown string
 * @param newStart - New start time (decimal hours)
 * @param newEnd - New end time (decimal hours)
 * @returns Updated markdown string
 */
export function replaceTimeInMarkdown(
  original: string,
  newStart: number,
  newEnd: number
): string {
  // Check if wrapped in highlight - if so, we need to replace inside the highlight
  const highlightMatch = original.match(HIGHLIGHT_PATTERN)
  if (highlightMatch) {
    const color = highlightMatch[1]
    const innerContent = highlightMatch[2]
    const replacedInner = replaceTimeInContent(innerContent, newStart, newEnd)
    // Reconstruct with highlight wrapper
    const prefix = original.substring(0, highlightMatch.index || 0)
    const suffix = original.substring((highlightMatch.index || 0) + highlightMatch[0].length)
    return `${prefix}<highlight color="${color}">${replacedInner}</highlight>${suffix}`
  }

  return replaceTimeInContent(original, newStart, newEnd)
}

/**
 * Helper to replace time in content (without highlight wrapper)
 */
function replaceTimeInContent(content: string, newStart: number, newEnd: number): string {
  const match = content.match(TIME_RANGE_REPLACEMENT_REGEX)
  if (!match) {
    // Fallback: prepend new time to title
    const title = content.replace(/^[•\-*+]\s*/, '').trim()
    return `${formatTimeForMarkdown(newStart)}-${formatTimeForMarkdown(newEnd)} ${title}`
  }

  const prefix = match[1] // Any prefix like "- " or "[ ] "
  const backtickStart = match[2]
  const backtickEnd = match[9]
  const separator = match[10] // The separator after time (like ": " or " - ")
  const rest = content.slice(match[0].length) // Everything after the time range

  return `${prefix}${backtickStart}${formatTimeForMarkdown(newStart)}-${formatTimeForMarkdown(newEnd)}${backtickEnd}${separator}${rest}`
}

/**
 * Categorize a task based on title keywords
 */
export function categorizeTask(title: string): 'work' | 'meeting' | 'health' | 'personal' | 'default' {
  const lower = title.toLowerCase()

  if (/deep work|focus|code|write|develop|build/.test(lower)) return 'work'
  if (/call|meeting|sync|chat|standup|1:1|interview/.test(lower)) return 'meeting'
  if (/gym|exercise|workout|run|yoga|walk|health|meditat/.test(lower)) return 'health'
  if (/lunch|dinner|breakfast|break|personal|family|friend/.test(lower)) return 'personal'

  return 'default'
}
