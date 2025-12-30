'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CraftTask, KanbanColumnId, isDateColumn } from '@/lib/craft/types'
import { fetchTasks, updateTask, moveDailyNoteTask, deleteTasks, formatDateForApi } from '@/lib/craft/api'
import { useSettings } from '@/lib/settings/context'
import Column from './Column'
import CreateTaskModal from './CreateTaskModal'

interface BoardProps {
  viewMode: 'standard' | 'week'
}

interface ColumnData {
  id: KanbanColumnId
  title: string
  tasks: CraftTask[]
  isDateColumn?: boolean
  date?: string // ISO date string for date columns
}

// Get today's date as ISO string (YYYY-MM-DD)
function getTodayISO(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get week start date based on monday_first preference
function getWeekStartDate(mondayFirst: boolean): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  // Calculate offset to start of week
  const diff = mondayFirst
    ? d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
    : d.getDate() - day // Sunday start
  return new Date(d.setDate(diff))
}

// Format date to ISO string
function dateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get short day name (Mon, Tue, etc.)
function getShortDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

// Get day/month for display (e.g., "15 Jan")
function getDayMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

// Generate 7 date columns for a week
function generateWeekColumns(startDate: Date): { id: string; title: string; date: string }[] {
  const columns: { id: string; title: string; date: string }[] = []
  const today = getTodayISO()

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const iso = dateToISO(date)
    const dayName = getShortDayName(date)
    const dayMonth = getDayMonth(date)

    // Mark today specially
    const isToday = iso === today
    const title = isToday ? `${dayName} (Today)` : `${dayName} ${dayMonth}`

    columns.push({ id: iso, title, date: iso })
  }

  return columns
}

// Format week range for display (e.g., "Dec 23 - Dec 29, 2024")
function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const year = endDate.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${year}`
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`
}

// Check if week contains today
function isCurrentWeek(startDate: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  return today >= startDate && today <= endDate
}

// Default collapsed state
function getDefaultCollapsed(viewMode: 'standard' | 'week'): Record<string, boolean> {
  if (viewMode === 'standard') {
    return { inbox: true, backlog: true, today: false, future: true }
  }
  // Week view: collapse inbox/backlog/future, expand date columns
  return { inbox: true, backlog: true, future: true }
}

function loadCollapsedState(viewMode: 'standard' | 'week'): Record<string, boolean> {
  if (typeof window === 'undefined') return getDefaultCollapsed(viewMode)
  try {
    const key = viewMode === 'standard' ? 'kanban_collapsed' : 'kanban_collapsed_week'
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return getDefaultCollapsed(viewMode)
}

function saveCollapsedState(state: Record<string, boolean>, viewMode: 'standard' | 'week') {
  try {
    const key = viewMode === 'standard' ? 'kanban_collapsed' : 'kanban_collapsed_week'
    localStorage.setItem(key, JSON.stringify(state))
  } catch { /* ignore */ }
}

export default function Board({ viewMode }: BoardProps) {
  const { settings } = useSettings()
  const mondayFirst = settings.monday_first

  const [weekStartDate, setWeekStartDate] = useState<Date>(() => getWeekStartDate(mondayFirst))
  const [allTasks, setAllTasks] = useState<CraftTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<CraftTask | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInColumn, setCreateInColumn] = useState<KanbanColumnId>('inbox')
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() =>
    getDefaultCollapsed(viewMode)
  )

  // Update week start when monday_first changes
  useEffect(() => {
    if (viewMode === 'week') {
      setWeekStartDate(getWeekStartDate(mondayFirst))
    }
  }, [mondayFirst, viewMode])

  // Load collapsed state on mount or view mode change
  useEffect(() => {
    setCollapsedColumns(loadCollapsedState(viewMode))
  }, [viewMode])

  // Generate columns based on view mode
  const columns = useMemo((): ColumnData[] => {
    const today = getTodayISO()

    if (viewMode === 'standard') {
      // Standard 4-column view: Inbox | Backlog | Today | Future
      const inbox: CraftTask[] = []
      const backlog: CraftTask[] = []
      const todayColumn: CraftTask[] = []
      const future: CraftTask[] = []

      for (const task of allTasks) {
        if (task.taskInfo?.state === 'done' || task.taskInfo?.state === 'canceled') continue

        const isInboxTask = task.location?.type === 'inbox'
        const isDailyNoteTask = task.location?.type === 'dailyNote'
        const scheduleDate = task.taskInfo?.scheduleDate
        const noteDate = task.location?.date

        if (isDailyNoteTask) {
          if (noteDate === today) todayColumn.push(task)
          else if (noteDate && noteDate < today) backlog.push(task)
          else if (noteDate && noteDate > today) future.push(task)
          else todayColumn.push(task)
        } else if (isInboxTask) {
          if (!scheduleDate) inbox.push(task)
          else if (scheduleDate === today) todayColumn.push(task)
          else if (scheduleDate < today) backlog.push(task)
          else future.push(task) // Future scheduled
        } else {
          inbox.push(task)
        }
      }

      return [
        { id: 'inbox', title: 'Inbox', tasks: inbox },
        { id: 'backlog', title: 'Backlog', tasks: backlog },
        { id: 'today', title: 'Today', tasks: todayColumn },
        { id: 'future', title: 'Future', tasks: future },
      ]
    }

    // Week view: Inbox | Backlog | Mon-Sun | Future
    const weekColumns = generateWeekColumns(weekStartDate)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)
    const weekEndISO = dateToISO(weekEndDate)
    const weekStartISO = dateToISO(weekStartDate)

    const inbox: CraftTask[] = []
    const backlog: CraftTask[] = []
    const future: CraftTask[] = []
    const dateTasksMap: Record<string, CraftTask[]> = {}

    // Initialize date columns
    for (const col of weekColumns) {
      dateTasksMap[col.date] = []
    }

    for (const task of allTasks) {
      if (task.taskInfo?.state === 'done' || task.taskInfo?.state === 'canceled') continue

      const isInboxTask = task.location?.type === 'inbox'
      const isDailyNoteTask = task.location?.type === 'dailyNote'
      const scheduleDate = task.taskInfo?.scheduleDate
      const noteDate = task.location?.date

      // Determine effective date
      const effectiveDate = isDailyNoteTask ? noteDate : scheduleDate

      if (isDailyNoteTask) {
        if (!noteDate) {
          backlog.push(task)
        } else if (noteDate < weekStartISO) {
          backlog.push(task)
        } else if (noteDate > weekEndISO) {
          future.push(task)
        } else if (dateTasksMap[noteDate]) {
          dateTasksMap[noteDate].push(task)
        } else {
          // Date not in current week columns
          backlog.push(task)
        }
      } else if (isInboxTask) {
        if (!scheduleDate) {
          inbox.push(task)
        } else if (scheduleDate < weekStartISO) {
          backlog.push(task)
        } else if (scheduleDate > weekEndISO) {
          future.push(task)
        } else if (dateTasksMap[scheduleDate]) {
          dateTasksMap[scheduleDate].push(task)
        } else {
          inbox.push(task)
        }
      } else {
        inbox.push(task)
      }
    }

    const result: ColumnData[] = [
      { id: 'inbox', title: 'Inbox', tasks: inbox },
      { id: 'backlog', title: 'Backlog', tasks: backlog },
    ]

    // Add date columns
    for (const col of weekColumns) {
      result.push({
        id: col.date,
        title: col.title,
        tasks: dateTasksMap[col.date] || [],
        isDateColumn: true,
        date: col.date,
      })
    }

    result.push({ id: 'future', title: 'Future', tasks: future })

    return result
  }, [allTasks, viewMode, weekStartDate])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      // Shift+Space: New task
      if (e.key === ' ' && e.shiftKey) {
        e.preventDefault()
        const todayCol = viewMode === 'standard' ? 'today' : getTodayISO()
        setCreateInColumn(todayCol)
        setShowCreateModal(true)
        return
      }

      // A: Smart toggle all columns
      if (e.key === 'a' || e.key === 'A') {
        setCollapsedColumns((prev) => {
          const columnIds = columns.map(c => c.id)
          const anyExpanded = columnIds.some(id => !prev[id])
          const next: Record<string, boolean> = {}
          for (const id of columnIds) {
            // If any are expanded, collapse all. Otherwise expand all.
            next[id] = anyExpanded
          }
          saveCollapsedState(next, viewMode)
          return next
        })
        return
      }

      // 1-9, 0: Toggle specific columns
      if (/^[0-9]$/.test(e.key)) {
        const num = e.key === '0' ? 9 : parseInt(e.key) - 1
        if (num >= 0 && num < columns.length) {
          const colId = columns[num].id
          setCollapsedColumns((prev) => {
            const next = { ...prev, [colId]: !prev[colId] }
            saveCollapsedState(next, viewMode)
            return next
          })
        }
        return
      }

      // Week view specific shortcuts
      if (viewMode === 'week') {
        // Left arrow: Previous week
        if (e.key === 'ArrowLeft') {
          setWeekStartDate((prev) => {
            const next = new Date(prev)
            next.setDate(prev.getDate() - 7)
            return next
          })
          return
        }

        // Right arrow: Next week
        if (e.key === 'ArrowRight') {
          setWeekStartDate((prev) => {
            const next = new Date(prev)
            next.setDate(prev.getDate() + 7)
            return next
          })
          return
        }

        // T: Go to current week
        if (e.key === 't' || e.key === 'T') {
          setWeekStartDate(getWeekStartDate(mondayFirst))
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, columns, mondayFirst])

  // Toggle column collapse
  const handleToggleCollapse = useCallback((columnId: KanbanColumnId) => {
    setCollapsedColumns((prev) => {
      const next = { ...prev, [columnId]: !prev[columnId] }
      saveCollapsedState(next, viewMode)
      return next
    })
  }, [viewMode])

  // Week navigation
  const handlePrevWeek = useCallback(() => {
    setWeekStartDate((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() - 7)
      return next
    })
  }, [])

  const handleNextWeek = useCallback(() => {
    setWeekStartDate((prev) => {
      const next = new Date(prev)
      next.setDate(prev.getDate() + 7)
      return next
    })
  }, [])

  const handleCurrentWeek = useCallback(() => {
    setWeekStartDate(getWeekStartDate(mondayFirst))
  }, [mondayFirst])

  // Fetch all tasks
  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [active, upcoming, inbox] = await Promise.all([
        fetchTasks('active'),
        fetchTasks('upcoming'),
        fetchTasks('inbox'),
      ])

      const taskMap = new Map<string, CraftTask>()
      for (const task of [...active, ...upcoming, ...inbox]) {
        taskMap.set(task.id, task)
      }
      setAllTasks(Array.from(taskMap.values()))
    } catch (err) {
      console.error('[kanban] Failed to load tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Handle task toggle
  const handleToggleTask = useCallback(async (taskId: string, done: boolean) => {
    try {
      await updateTask(taskId, { taskInfo: { state: done ? 'done' : 'todo' } })
      if (done) {
        setAllTasks((prev) => prev.filter((t) => t.id !== taskId))
      }
    } catch (err) {
      console.error('[kanban] Toggle failed:', err)
      loadTasks()
    }
  }, [loadTasks])

  // Handle task delete
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTasks([taskId])
      setAllTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err) {
      console.error('[kanban] Delete failed:', err)
      loadTasks()
    }
  }, [loadTasks])

  // Handle task edit
  const handleEditTask = useCallback(async (taskId: string, newMarkdown: string) => {
    try {
      await updateTask(taskId, { markdown: newMarkdown })
      setAllTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, markdown: newMarkdown } : t))
      )
    } catch (err) {
      console.error('[kanban] Edit failed:', err)
      loadTasks()
    }
  }, [loadTasks])

  // Handle drag start
  const handleDragStart = useCallback((task: CraftTask) => {
    setDraggingTask(task)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingTask(null)
  }, [])

  // Handle drop with optimistic update
  const handleDrop = useCallback(async (task: CraftTask, targetColumn: KanbanColumnId) => {
    const isInboxTask = task.location?.type === 'inbox'
    const isDailyNoteTask = task.location?.type === 'dailyNote'

    // Find source column
    const sourceColumn = columns.find((col) =>
      col.tasks.some((t) => t.id === task.id)
    )?.id

    if (sourceColumn === targetColumn) {
      setDraggingTask(null)
      return
    }

    // Calculate target date for optimistic update
    let targetDate: string | undefined
    if (targetColumn === 'inbox') {
      targetDate = undefined
    } else if (targetColumn === 'backlog') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      targetDate = dateToISO(yesterday)
    } else if (targetColumn === 'future') {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      targetDate = dateToISO(futureDate)
    } else if (targetColumn === 'today') {
      targetDate = getTodayISO()
    } else if (isDateColumn(targetColumn)) {
      targetDate = targetColumn
    }

    // Optimistic update - move task immediately in UI
    setAllTasks((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t
        if (isInboxTask) {
          return {
            ...t,
            taskInfo: { ...t.taskInfo, scheduleDate: targetDate },
          }
        } else if (isDailyNoteTask) {
          return {
            ...t,
            location: { ...t.location, type: 'dailyNote' as const, date: targetDate },
          }
        }
        return t
      })
    )
    setDraggingTask(null)

    try {
      if (targetColumn === 'inbox') {
        if (isDailyNoteTask) {
          console.error('[kanban] Cannot move daily note task to inbox')
          loadTasks() // Revert
          return
        }
        if (isInboxTask) {
          await updateTask(task.id, { taskInfo: { scheduleDate: '' } })
        }
      } else if (targetColumn === 'backlog') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = dateToISO(yesterday)

        if (isInboxTask) {
          await updateTask(task.id, { taskInfo: { scheduleDate: yesterdayISO } })
        } else if (isDailyNoteTask) {
          await moveDailyNoteTask(task.id, yesterdayISO)
        }
      } else if (targetColumn === 'future') {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 7)
        const futureISO = dateToISO(futureDate)

        if (isInboxTask) {
          await updateTask(task.id, { taskInfo: { scheduleDate: futureISO } })
        } else if (isDailyNoteTask) {
          await moveDailyNoteTask(task.id, futureISO)
        }
      } else if (targetColumn === 'today') {
        const todayISO = getTodayISO()
        if (isInboxTask) {
          await updateTask(task.id, { taskInfo: { scheduleDate: todayISO } })
        } else if (isDailyNoteTask) {
          await moveDailyNoteTask(task.id, todayISO)
        }
      } else if (isDateColumn(targetColumn)) {
        const targetDateISO = targetColumn
        if (isInboxTask) {
          await updateTask(task.id, { taskInfo: { scheduleDate: targetDateISO } })
        } else if (isDailyNoteTask) {
          await moveDailyNoteTask(task.id, targetDateISO)
        }
      }
    } catch (err) {
      console.error('[kanban] Drop failed:', err)
      loadTasks() // Revert on error
    }
  }, [columns, loadTasks])

  // Handle create task
  const handleCreateTask = useCallback((columnId: KanbanColumnId) => {
    setCreateInColumn(columnId)
    setShowCreateModal(true)
  }, [])

  const handleTaskCreated = useCallback((task: CraftTask, targetColumn: KanbanColumnId) => {
    setShowCreateModal(false)
    setAllTasks((prev) => [...prev, task])
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 dark:border-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={loadTasks}
          className="px-4 py-2 rounded-lg bg-slate-600 dark:bg-zinc-600 text-white hover:bg-slate-700 dark:hover:bg-zinc-500 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Week navigation (only in week view) */}
      {viewMode === 'week' && (
        <div className="flex items-center justify-center gap-4 py-3 border-b border-slate-200 dark:border-zinc-800">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
            title="Previous week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-medium text-slate-700 dark:text-zinc-300 min-w-[180px] text-center">
              {formatWeekRange(weekStartDate)}
            </span>
            {!isCurrentWeek(weekStartDate) && (
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1 text-xs font-medium rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
            title="Next week"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Columns */}
      <div className="flex justify-center gap-2 p-4 flex-1 overflow-x-auto overflow-y-hidden">
        {columns.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={column.tasks}
            draggingTask={draggingTask}
            collapsed={collapsedColumns[column.id] || false}
            onToggleCollapse={() => handleToggleCollapse(column.id)}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onCreateTask={() => handleCreateTask(column.id)}
          />
        ))}
      </div>

      {showCreateModal && (
        <CreateTaskModal
          targetColumn={createInColumn}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  )
}
