'use client'

import { useState, useEffect, useCallback } from 'react'
import { CraftTask, KanbanColumnId } from '@/lib/craft/types'
import { fetchTasks, updateTask, moveDailyNoteTask, deleteTasks, formatDateForApi } from '@/lib/craft/api'
import Column from './Column'
import CreateTaskModal from './CreateTaskModal'

interface ColumnData {
  id: KanbanColumnId
  title: string
  tasks: CraftTask[]
}

// Default collapsed state (inbox and backlog collapsed by default)
const DEFAULT_COLLAPSED: Record<KanbanColumnId, boolean> = {
  inbox: true,
  backlog: true,
  today: false,
}

function loadCollapsedState(): Record<KanbanColumnId, boolean> {
  if (typeof window === 'undefined') return DEFAULT_COLLAPSED
  try {
    const stored = localStorage.getItem('kanban_collapsed')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return DEFAULT_COLLAPSED
}

function saveCollapsedState(state: Record<KanbanColumnId, boolean>) {
  try {
    localStorage.setItem('kanban_collapsed', JSON.stringify(state))
  } catch { /* ignore */ }
}

// Get today's date as ISO string (YYYY-MM-DD)
function getTodayISO(): string {
  const today = new Date()
  return formatDateForApi(today) === 'today'
    ? new Date().toISOString().split('T')[0]
    : formatDateForApi(today)
}

// Distribute tasks into columns based on location and scheduleDate
function distributeToColumns(allTasks: CraftTask[]): ColumnData[] {
  const today = getTodayISO()

  const inbox: CraftTask[] = []
  const backlog: CraftTask[] = []
  const todayColumn: CraftTask[] = []

  for (const task of allTasks) {
    // Skip completed/canceled tasks
    if (task.taskInfo?.state === 'done' || task.taskInfo?.state === 'canceled') {
      continue
    }

    const isInboxTask = task.location?.type === 'inbox'
    const isDailyNoteTask = task.location?.type === 'dailyNote'
    const scheduleDate = task.taskInfo?.scheduleDate
    const noteDate = task.location?.date

    if (isDailyNoteTask) {
      // Daily note tasks go by their note date
      if (noteDate === today) {
        todayColumn.push(task)
      } else if (noteDate && noteDate < today) {
        backlog.push(task)
      } else {
        // Future daily note tasks (shouldn't happen often)
        todayColumn.push(task)
      }
    } else if (isInboxTask) {
      // Inbox tasks go by their scheduleDate
      if (!scheduleDate) {
        inbox.push(task)
      } else if (scheduleDate === today) {
        todayColumn.push(task)
      } else if (scheduleDate < today) {
        backlog.push(task)
      } else {
        // Future scheduled inbox tasks stay in inbox
        inbox.push(task)
      }
    } else {
      // Unknown type, default to inbox
      inbox.push(task)
    }
  }

  return [
    { id: 'inbox', title: 'Inbox', tasks: inbox },
    { id: 'backlog', title: 'Backlog', tasks: backlog },
    { id: 'today', title: 'Today', tasks: todayColumn },
  ]
}

export default function Board() {
  const [columns, setColumns] = useState<ColumnData[]>([
    { id: 'inbox', title: 'Inbox', tasks: [] },
    { id: 'backlog', title: 'Backlog', tasks: [] },
    { id: 'today', title: 'Today', tasks: [] },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<CraftTask | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInColumn, setCreateInColumn] = useState<KanbanColumnId>('inbox')
  const [collapsedColumns, setCollapsedColumns] = useState<Record<KanbanColumnId, boolean>>(DEFAULT_COLLAPSED)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    setCollapsedColumns(loadCollapsedState())
  }, [])

  // Toggle column collapse
  const handleToggleCollapse = useCallback((columnId: KanbanColumnId) => {
    setCollapsedColumns((prev) => {
      const next = { ...prev, [columnId]: !prev[columnId] }
      saveCollapsedState(next)
      return next
    })
  }, [])

  // Fetch all tasks
  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all scopes in parallel
      const [active, upcoming, inbox] = await Promise.all([
        fetchTasks('active'),
        fetchTasks('upcoming'),
        fetchTasks('inbox'),
      ])

      // Deduplicate by task ID
      const taskMap = new Map<string, CraftTask>()
      for (const task of [...active, ...upcoming, ...inbox]) {
        taskMap.set(task.id, task)
      }
      const allTasks = Array.from(taskMap.values())

      // Distribute to columns
      const distributed = distributeToColumns(allTasks)
      setColumns(distributed)
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
      await updateTask(taskId, {
        taskInfo: { state: done ? 'done' : 'todo' },
      })
      // Optimistic update: remove from columns if completed
      if (done) {
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          }))
        )
      }
    } catch (err) {
      console.error('[kanban] Toggle failed:', err)
      loadTasks() // Reload on error
    }
  }, [loadTasks])

  // Handle task delete
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTasks([taskId])
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }))
      )
    } catch (err) {
      console.error('[kanban] Delete failed:', err)
      loadTasks()
    }
  }, [loadTasks])

  // Handle task edit
  const handleEditTask = useCallback(async (taskId: string, newMarkdown: string) => {
    try {
      await updateTask(taskId, { markdown: newMarkdown })
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === taskId ? { ...t, markdown: newMarkdown } : t
          ),
        }))
      )
    } catch (err) {
      console.error('[kanban] Edit failed:', err)
      loadTasks()
    }
  }, [loadTasks])

  // Handle task reordering within a column (local only - no API persistence)
  const handleReorderTasks = useCallback((columnId: KanbanColumnId, taskIds: string[]) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== columnId) return col
        // Reorder tasks based on taskIds order
        const taskMap = new Map(col.tasks.map(t => [t.id, t]))
        const reordered = taskIds.map(id => taskMap.get(id)).filter(Boolean) as CraftTask[]
        return { ...col, tasks: reordered }
      })
    )
  }, [])

  // Handle drag start
  const handleDragStart = useCallback((task: CraftTask) => {
    setDraggingTask(task)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingTask(null)
  }, [])

  // Handle drop
  const handleDrop = useCallback(async (task: CraftTask, targetColumn: KanbanColumnId) => {
    const isInboxTask = task.location?.type === 'inbox'
    const isDailyNoteTask = task.location?.type === 'dailyNote'

    // Find source column for optimistic update
    const sourceColumn = columns.find((col) =>
      col.tasks.some((t) => t.id === task.id)
    )?.id

    if (sourceColumn === targetColumn) {
      setDraggingTask(null)
      return
    }

    try {
      if (targetColumn === 'inbox') {
        // Moving to inbox = remove scheduleDate (use empty string to clear)
        if (isDailyNoteTask) {
          // Not allowed - should not reach here due to canDrop check
          console.error('[kanban] Cannot move daily note task to inbox')
          return
        }
        if (isInboxTask) {
          await updateTask(task.id, {
            taskInfo: { scheduleDate: '' },
          })
        }
      } else {
        // Moving to a date column
        const targetDate = targetColumn === 'today' ? getTodayISO() : getTodayISO() // For backlog, use yesterday or keep as is
        const actualDate = targetColumn === 'backlog'
          ? new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
          : getTodayISO()

        if (isInboxTask) {
          await updateTask(task.id, {
            taskInfo: { scheduleDate: actualDate },
          })
        } else if (isDailyNoteTask) {
          await moveDailyNoteTask(task.id, actualDate)
        }
      }

      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === sourceColumn) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) }
          }
          if (col.id === targetColumn) {
            return { ...col, tasks: [...col.tasks, task] }
          }
          return col
        })
      )
    } catch (err) {
      console.error('[kanban] Drop failed:', err)
      loadTasks()
    } finally {
      setDraggingTask(null)
    }
  }, [columns, loadTasks])

  // Handle create task
  const handleCreateTask = useCallback((columnId: KanbanColumnId) => {
    setCreateInColumn(columnId)
    setShowCreateModal(true)
  }, [])

  const handleTaskCreated = useCallback((task: CraftTask, targetColumn: KanbanColumnId) => {
    setShowCreateModal(false)
    // Optimistic update - add task to the target column
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === targetColumn) {
          return { ...col, tasks: [...col.tasks, task] }
        }
        return col
      })
    )
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={loadTasks}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 p-4 h-full overflow-x-auto">
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
            onReorderTasks={handleReorderTasks}
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
    </>
  )
}
