'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchBlocks, toggleTask, deleteBlocks, insertBlock, updateBlock, formatDateForApi, createTask } from '@/lib/craft/api'
import { parseBlocks } from '@/lib/craft/parse-timeblocks'
import { Timeblock, UnscheduledTask } from '@/lib/craft/types'
import { formatTimeForMarkdown, replaceTimeInMarkdown, stripCheckbox } from '@/lib/craft/time-parser'
import TimeAxis from './TimeAxis'
import NowLine from './NowLine'
import TimeblockCard from './TimeblockCard'
import UnscheduledList from './UnscheduledList'
import InlineEditor from './InlineEditor'

const HOUR_HEIGHT = 60

interface TimelineProps {
  onError?: (message: string) => void
  startHour?: number
  endHour?: number
  apiKey: string
}

function formatDateTitle(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isCurrent(block: Timeblock): boolean {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  return currentHour >= block.start && currentHour < block.end
}

export default function Timeline({ onError, startHour = 6, endHour = 22, apiKey }: TimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduled, setScheduled] = useState<Timeblock[]>([])
  const [unscheduled, setUnscheduled] = useState<UnscheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [creatingAt, setCreatingAt] = useState<number | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)
  const [draggingTask, setDraggingTask] = useState<UnscheduledTask | null>(null)
  const [isTimelineDropOver, setIsTimelineDropOver] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const totalHours = endHour - startHour

  const loadSchedule = useCallback(async () => {
    if (!apiKey) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const data = await fetchBlocks(currentDate, apiKey)
      const { scheduled: s, unscheduled: u } = parseBlocks(data)
      setScheduled(s)
      setUnscheduled(u)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedule'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }, [currentDate, onError, apiKey])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  // Scroll to current time on load
  useEffect(() => {
    if (!loading && isToday(currentDate) && timelineRef.current) {
      const now = new Date()
      const currentHour = now.getHours() + now.getMinutes() / 60
      const scrollTop = (currentHour - startHour - 2) * HOUR_HEIGHT
      timelineRef.current.scrollTop = Math.max(0, scrollTop)
    }
  }, [loading, currentDate, startHour])

  const goToPrevDay = useCallback(() => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }, [currentDate])

  const goToNextDay = useCallback(() => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }, [currentDate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable

      // Delete/Backspace - delete hovered block or task
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        if (hoveredBlock) {
          e.preventDefault()
          handleDeleteBlock(hoveredBlock)
        } else if (hoveredTask) {
          e.preventDefault()
          handleDeleteTask(hoveredTask)
        }
      }

      // Spacebar - new task
      if (e.key === ' ' && !isTyping && !creatingAt) {
        e.preventDefault()
        setCreatingTask(true)
      }

      // Arrow keys - navigate days
      if (e.key === 'ArrowLeft' && !isTyping) {
        e.preventDefault()
        goToPrevDay()
      }
      if (e.key === 'ArrowRight' && !isTyping) {
        e.preventDefault()
        goToNextDay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hoveredBlock, hoveredTask, creatingAt, goToPrevDay, goToNextDay])

  const handleToggleTask = async (blockId: string, checked: boolean) => {
    setScheduled((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, checked } : block
      )
    )

    try {
      await toggleTask(blockId, checked, apiKey)
    } catch (err) {
      setScheduled((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, checked: !checked } : block
        )
      )
      onError?.(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleToggleUnscheduledTask = async (taskId: string, checked: boolean) => {
    setUnscheduled((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, checked } : task
      )
    )

    try {
      await toggleTask(taskId, checked, apiKey)
    } catch (err) {
      setUnscheduled((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, checked: !checked } : task
        )
      )
      onError?.(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    // Optimistic delete
    setScheduled(prev => prev.filter(b => b.id !== blockId))
    setHoveredBlock(null)

    try {
      await deleteBlocks([block.id], apiKey)
    } catch (err) {
      // Revert on error
      loadSchedule()
      onError?.(err instanceof Error ? err.message : 'Failed to delete block')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const task = unscheduled.find(t => t.id === taskId)
    if (!task?.id) return

    // Optimistic delete
    setUnscheduled(prev => prev.filter(t => t.id !== taskId))
    setHoveredTask(null)

    try {
      await deleteBlocks([task.id], apiKey)
    } catch (err) {
      loadSchedule()
      onError?.(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  // Track if we just finished dragging/resizing to prevent click
  const justDraggedRef = useRef(false)

  const handleTimelineClick = (e: React.MouseEvent) => {
    // Don't create if clicking on a timeblock
    if ((e.target as HTMLElement).closest('.timeblock-card')) return
    // Don't create if already creating
    if (creatingAt !== null) return
    // Don't create if we just finished dragging/resizing
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }

    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = e.clientY - rect.top
    let startDecimal = y / HOUR_HEIGHT + startHour
    // Snap to 15-minute intervals
    startDecimal = Math.round(startDecimal * 4) / 4
    // Clamp within bounds
    startDecimal = Math.max(startHour, Math.min(endHour - 1, startDecimal))

    setCreatingAt(startDecimal)
  }

  // Calculate column positions for overlapping blocks
  const getBlockColumns = (blocks: Timeblock[]): Map<string, { column: number; totalColumns: number }> => {
    const result = new Map<string, { column: number; totalColumns: number }>()
    if (blocks.length === 0) return result

    // Group overlapping blocks
    const groups: Timeblock[][] = []
    const sorted = [...blocks].sort((a, b) => a.start - b.start)

    for (const block of sorted) {
      // Find a group this block overlaps with
      let added = false
      for (const group of groups) {
        const overlaps = group.some(b =>
          (block.start < b.end && block.end > b.start)
        )
        if (overlaps) {
          group.push(block)
          added = true
          break
        }
      }
      if (!added) {
        groups.push([block])
      }
    }

    // Assign columns within each group
    for (const group of groups) {
      const totalColumns = group.length
      group.forEach((block, index) => {
        result.set(block.id || `temp-${index}`, { column: index, totalColumns })
      })
    }

    return result
  }

  const blockColumns = getBlockColumns(scheduled)

  const handleCreateTimeblock = async (title: string) => {
    if (creatingAt === null || !title.trim()) {
      setCreatingAt(null)
      return
    }

    const start = creatingAt
    const end = Math.min(start + 1, endHour) // 1 hour default
    const markdown = `${formatTimeForMarkdown(start)}-${formatTimeForMarkdown(end)} ${title.trim()}`

    // Optimistic add
    const tempId = `temp-${Date.now()}`
    const newBlock: Timeblock = {
      id: tempId,
      start,
      end,
      title: title.trim(),
      category: 'default',
      highlight: null,
      originalMarkdown: markdown,
      isTask: false,
      checked: false,
    }
    setScheduled(prev => [...prev, newBlock].sort((a, b) => a.start - b.start))
    setCreatingAt(null)

    try {
      const dateParam = formatDateForApi(currentDate)
      const items = await insertBlock(markdown, apiKey, dateParam)
      // Update with real ID
      if (items[0]?.id) {
        setScheduled(prev =>
          prev.map(b => b.id === tempId ? { ...b, id: items[0].id } : b)
        )
      }
    } catch (err) {
      setScheduled(prev => prev.filter(b => b.id !== tempId))
      onError?.(err instanceof Error ? err.message : 'Failed to create timeblock')
    }
  }

  const handleCreateTask = async (text: string) => {
    setCreatingTask(false)
    if (!text.trim()) return

    const markdown = `- [ ] ${text.trim()}`

    // Optimistic add
    const tempId = `temp-${Date.now()}`
    const newTask: UnscheduledTask = {
      id: tempId,
      text: text.trim(),
      checked: false,
      originalMarkdown: markdown,
    }
    setUnscheduled(prev => [newTask, ...prev])

    try {
      const dateParam = formatDateForApi(currentDate)
      // Use createTask API so task appears in kanban
      const task = await createTask(markdown, { type: 'dailyNote', date: dateParam }, apiKey)
      if (task?.id) {
        setUnscheduled(prev =>
          prev.map(t => t.id === tempId ? { ...t, id: task.id } : t)
        )
      }
    } catch (err) {
      setUnscheduled(prev => prev.filter(t => t.id !== tempId))
      onError?.(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  // Edit unscheduled task
  const handleEditUnscheduled = async (taskId: string, newText: string) => {
    const task = unscheduled.find(t => t.id === taskId)
    if (!task?.id) return

    const newMarkdown = `- [${task.checked ? 'x' : ' '}] ${newText.trim()}`

    // Optimistic update
    setUnscheduled(prev =>
      prev.map(t => t.id === taskId ? { ...t, text: newText.trim(), originalMarkdown: newMarkdown } : t)
    )

    try {
      await updateBlock(taskId, newMarkdown, apiKey)
    } catch (err) {
      loadSchedule() // Revert on error
      onError?.(err instanceof Error ? err.message : 'Failed to edit task')
    }
  }

  // Edit timeblock
  const handleEditTimeblock = async (blockId: string, newTitle: string) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    // Reconstruct markdown with new title but preserve time
    const timeStr = `${formatTimeForMarkdown(block.start)}-${formatTimeForMarkdown(block.end)}`
    const prefix = block.isTask ? `- [${block.checked ? 'x' : ' '}] ` : ''
    const newMarkdown = `${prefix}${timeStr} ${newTitle.trim()}`

    // Optimistic update
    setScheduled(prev =>
      prev.map(b => b.id === blockId ? { ...b, title: newTitle.trim(), originalMarkdown: newMarkdown } : b)
    )

    try {
      await updateBlock(blockId, newMarkdown, apiKey)
    } catch (err) {
      loadSchedule() // Revert on error
      onError?.(err instanceof Error ? err.message : 'Failed to edit timeblock')
    }
  }

  // Track pending changes to avoid API calls during drag
  const pendingChangeRef = useRef<{ blockId: string; newStart: number; newEnd: number } | null>(null)

  // Local update during drag (no API call)
  const handleMoveBlock = (blockId: string, newStart: number) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    const duration = block.end - block.start
    const newEnd = newStart + duration

    // Store pending change
    pendingChangeRef.current = { blockId, newStart, newEnd }

    // Optimistic update (local only)
    setScheduled(prev =>
      prev.map(b =>
        b.id === blockId ? { ...b, start: newStart, end: newEnd } : b
      ).sort((a, b) => a.start - b.start)
    )
  }

  // Local update during resize (no API call)
  const handleResizeBlock = (blockId: string, newStart: number, newEnd: number) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    // Store pending change
    pendingChangeRef.current = { blockId, newStart, newEnd }

    // Optimistic update (local only)
    setScheduled(prev =>
      prev.map(b =>
        b.id === blockId ? { ...b, start: newStart, end: newEnd } : b
      ).sort((a, b) => a.start - b.start)
    )
  }

  // Commit changes to API on drag/resize end
  const handleBlockDragEnd = async () => {
    justDraggedRef.current = true
    setTimeout(() => { justDraggedRef.current = false }, 100)

    const pending = pendingChangeRef.current
    if (!pending) return
    pendingChangeRef.current = null

    const block = scheduled.find(b => b.id === pending.blockId)
    if (!block?.id) return

    try {
      const newMarkdown = replaceTimeInMarkdown(block.originalMarkdown, pending.newStart, pending.newEnd)
      await updateBlock(block.id, newMarkdown, apiKey)
      // Update originalMarkdown in state for subsequent edits
      setScheduled(prev =>
        prev.map(b =>
          b.id === pending.blockId ? { ...b, originalMarkdown: newMarkdown } : b
        )
      )
    } catch (err) {
      console.error('[Timeline] Update failed:', err)
      loadSchedule()
      onError?.(err instanceof Error ? err.message : 'Failed to update block')
    }
  }

  // Handle dropping unscheduled task onto timeline
  const handleTimelineDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsTimelineDropOver(true)
  }, [])

  const handleTimelineDragLeave = useCallback(() => {
    setIsTimelineDropOver(false)
  }, [])

  const handleTimelineDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsTimelineDropOver(false)

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.type !== 'unscheduled' || !data.taskId) return

      const task = unscheduled.find(t => t.id === data.taskId)
      if (!task?.id) return

      // Calculate drop position time
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return

      const y = e.clientY - rect.top
      let dropHour = y / HOUR_HEIGHT + startHour
      // Snap to 15-minute intervals
      dropHour = Math.round(dropHour * 4) / 4
      // Clamp within bounds
      dropHour = Math.max(startHour, Math.min(endHour - 1, dropHour))

      const endTime = Math.min(dropHour + 1, endHour) // 1 hour default duration
      const timePrefix = `${formatTimeForMarkdown(dropHour)}-${formatTimeForMarkdown(endTime)}`

      // Get the task text without checkbox
      const taskText = stripCheckbox(task.originalMarkdown)
      // Create new markdown with time and checkbox
      const newMarkdown = `- [ ] ${timePrefix} ${taskText}`

      // Optimistic: remove from unscheduled, add to scheduled
      setUnscheduled(prev => prev.filter(t => t.id !== task.id))
      const tempBlock: Timeblock = {
        id: task.id,
        start: dropHour,
        end: endTime,
        title: taskText,
        category: 'default',
        highlight: null,
        originalMarkdown: newMarkdown,
        isTask: true,
        checked: task.checked,
      }
      setScheduled(prev => [...prev, tempBlock].sort((a, b) => a.start - b.start))

      // Update via API
      await updateBlock(task.id, newMarkdown, apiKey)
    } catch (err) {
      console.error('[Timeline] Drop failed:', err)
      loadSchedule() // Revert on error
      onError?.(err instanceof Error ? err.message : 'Failed to schedule task')
    }

    setDraggingTask(null)
  }, [unscheduled, startHour, endHour, loadSchedule, onError, apiKey])

  // Handle dropping timeblock to unscheduled
  const handleDropToUnscheduled = useCallback(async (blockId: string) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    try {
      // Remove time from markdown, keep task checkbox
      const taskText = block.title
      const newMarkdown = block.isTask
        ? `- [${block.checked ? 'x' : ' '}] ${taskText}`
        : `- [ ] ${taskText}`

      // Optimistic: remove from scheduled, add to unscheduled
      setScheduled(prev => prev.filter(b => b.id !== blockId))
      const newTask: UnscheduledTask = {
        id: block.id,
        text: taskText,
        checked: block.checked,
        originalMarkdown: newMarkdown,
      }
      setUnscheduled(prev => [newTask, ...prev])

      // Update via API
      await updateBlock(block.id, newMarkdown, apiKey)
    } catch (err) {
      console.error('[Timeline] Unschedule failed:', err)
      loadSchedule() // Revert on error
      onError?.(err instanceof Error ? err.message : 'Failed to unschedule task')
    }
  }, [scheduled, loadSchedule, onError, apiKey])

  // Generate hour lines
  const hourLines = []
  for (let hour = startHour; hour <= endHour; hour++) {
    hourLines.push(
      <div
        key={hour}
        className="absolute left-0 right-0 h-px bg-slate-200 dark:bg-zinc-800"
        style={{ top: (hour - startHour) * HOUR_HEIGHT }}
      />
    )
  }

  return (
    <div className="w-full">
      {/* Header - centered like 7-day view */}
      <div className="flex items-center justify-center gap-4 py-3 border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={goToPrevDay}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
          title="Previous day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <span className="font-serif text-sm font-medium text-slate-700 dark:text-zinc-300 min-w-[120px] text-center">
            {formatDateTitle(currentDate)}
          </span>
          {!isToday(currentDate) && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-medium rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
          title="Next day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500 dark:text-zinc-400">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={loadSchedule}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && (
        <div
          ref={timelineRef}
          className="relative ml-14 mt-8"
        >
          <TimeAxis startHour={startHour} endHour={endHour} hourHeight={HOUR_HEIGHT} />

          <div
            ref={trackRef}
            className={`relative border-l border-slate-200 dark:border-zinc-800 cursor-pointer pl-1 overflow-hidden ${
              isTimelineDropOver ? 'ring-2 ring-slate-400 dark:ring-zinc-500 bg-slate-50/50 dark:bg-zinc-800/50' : ''
            }`}
            style={{ height: totalHours * HOUR_HEIGHT }}
            onClick={handleTimelineClick}
            onDragOver={handleTimelineDragOver}
            onDragLeave={handleTimelineDragLeave}
            onDrop={handleTimelineDrop}
          >
            {/* Hour lines */}
            {hourLines}

            {/* Now line */}
            <NowLine startHour={startHour} hourHeight={HOUR_HEIGHT} isToday={isToday(currentDate)} />

            {/* Timeblocks */}
            {scheduled.map((block, index) => {
              const columnInfo = blockColumns.get(block.id || `temp-${index}`)
              return (
                <TimeblockCard
                  key={block.id || index}
                  block={block}
                  startHour={startHour}
                  endHour={endHour}
                  hourHeight={HOUR_HEIGHT}
                  isCurrent={isToday(currentDate) && isCurrent(block)}
                  isHovered={hoveredBlock === block.id}
                  column={columnInfo?.column || 0}
                  totalColumns={columnInfo?.totalColumns || 1}
                  onToggleTask={handleToggleTask}
                  onMouseEnter={() => setHoveredBlock(block.id)}
                  onMouseLeave={() => setHoveredBlock(null)}
                  onDelete={() => block.id && handleDeleteBlock(block.id)}
                  onEdit={(newTitle) => block.id && handleEditTimeblock(block.id, newTitle)}
                  onMove={(newStart) => block.id && handleMoveBlock(block.id, newStart)}
                  onResize={(newStart, newEnd) => block.id && handleResizeBlock(block.id, newStart, newEnd)}
                  onDragEnd={handleBlockDragEnd}
                  onUnschedule={() => block.id && handleDropToUnscheduled(block.id)}
                />
              )
            })}

            {/* Inline timeblock creator */}
            {creatingAt !== null && (
              <InlineEditor
                type="timeblock"
                style={{
                  position: 'absolute',
                  top: (creatingAt - startHour) * HOUR_HEIGHT,
                  left: 12,
                  right: 12,
                }}
                onSubmit={handleCreateTimeblock}
                onCancel={() => setCreatingAt(null)}
                placeholder="New timeblock..."
              />
            )}
          </div>

          {/* Unscheduled tasks */}
          <UnscheduledList
            tasks={unscheduled}
            onToggleTask={handleToggleUnscheduledTask}
            onTaskHover={setHoveredTask}
            hoveredTask={hoveredTask}
            onDelete={handleDeleteTask}
            onEdit={handleEditUnscheduled}
            onDragStart={setDraggingTask}
            onDragEnd={() => setDraggingTask(null)}
            onAddTask={() => setCreatingTask(true)}
          />

          {/* Inline task creator */}
          {creatingTask && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <InlineEditor
                type="task"
                onSubmit={handleCreateTask}
                onCancel={() => setCreatingTask(false)}
                placeholder="New task..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
