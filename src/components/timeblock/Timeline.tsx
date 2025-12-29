'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchBlocks, toggleTask, deleteBlocks, insertBlock, updateBlock, formatDateForApi } from '@/lib/craft/api'
import { parseBlocks } from '@/lib/craft/parse-timeblocks'
import { Timeblock, UnscheduledTask } from '@/lib/craft/types'
import { formatTimeForMarkdown, replaceTimeInMarkdown } from '@/lib/craft/time-parser'
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

export default function Timeline({ onError, startHour = 6, endHour = 22 }: TimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduled, setScheduled] = useState<Timeblock[]>([])
  const [unscheduled, setUnscheduled] = useState<UnscheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null)
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [creatingAt, setCreatingAt] = useState<number | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const totalHours = endHour - startHour

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchBlocks(currentDate)
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
  }, [currentDate, onError])

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
      await toggleTask(blockId, checked)
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
      await toggleTask(taskId, checked)
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
      await deleteBlocks([block.id])
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
      await deleteBlocks([task.id])
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

  const handleDragEnd = () => {
    justDraggedRef.current = true
    // Reset after a short delay
    setTimeout(() => { justDraggedRef.current = false }, 100)
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
      const items = await insertBlock(markdown, dateParam)
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
      const items = await insertBlock(markdown, dateParam)
      if (items[0]?.id) {
        setUnscheduled(prev =>
          prev.map(t => t.id === tempId ? { ...t, id: items[0].id } : t)
        )
      }
    } catch (err) {
      setUnscheduled(prev => prev.filter(t => t.id !== tempId))
      onError?.(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  const handleMoveBlock = async (blockId: string, newStart: number) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    const duration = block.end - block.start
    const newEnd = newStart + duration

    // Optimistic update
    setScheduled(prev =>
      prev.map(b =>
        b.id === blockId ? { ...b, start: newStart, end: newEnd } : b
      ).sort((a, b) => a.start - b.start)
    )

    try {
      const newMarkdown = replaceTimeInMarkdown(block.originalMarkdown, newStart, newEnd)
      await updateBlock(block.id, newMarkdown)
      // Update originalMarkdown in state for subsequent edits
      setScheduled(prev =>
        prev.map(b =>
          b.id === blockId ? { ...b, originalMarkdown: newMarkdown } : b
        )
      )
    } catch (err) {
      console.error('[Timeline] Move failed:', err)
      loadSchedule()
      onError?.(err instanceof Error ? err.message : 'Failed to move block')
    }
  }

  const handleResizeBlock = async (blockId: string, newStart: number, newEnd: number) => {
    const block = scheduled.find(b => b.id === blockId)
    if (!block?.id) return

    // Optimistic update
    setScheduled(prev =>
      prev.map(b =>
        b.id === blockId ? { ...b, start: newStart, end: newEnd } : b
      ).sort((a, b) => a.start - b.start)
    )

    try {
      const newMarkdown = replaceTimeInMarkdown(block.originalMarkdown, newStart, newEnd)
      await updateBlock(block.id, newMarkdown)
      // Update originalMarkdown in state for subsequent edits
      setScheduled(prev =>
        prev.map(b =>
          b.id === blockId ? { ...b, originalMarkdown: newMarkdown } : b
        )
      )
    } catch (err) {
      console.error('[Timeline] Resize failed:', err)
      loadSchedule()
      onError?.(err instanceof Error ? err.message : 'Failed to resize block')
    }
  }

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevDay}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-medium text-slate-900 dark:text-white px-2">
            {formatDateTitle(currentDate)}
          </h2>
          <button
            onClick={goToNextDay}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={loadSchedule}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
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
          className="relative ml-14"
        >
          <TimeAxis startHour={startHour} endHour={endHour} hourHeight={HOUR_HEIGHT} />

          <div
            ref={trackRef}
            className="relative border-l border-slate-200 dark:border-zinc-800 cursor-pointer pl-1"
            style={{ minHeight: totalHours * HOUR_HEIGHT }}
            onClick={handleTimelineClick}
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
                  onMove={(newStart) => block.id && handleMoveBlock(block.id, newStart)}
                  onResize={(newStart, newEnd) => block.id && handleResizeBlock(block.id, newStart, newEnd)}
                  onDragEnd={handleDragEnd}
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
