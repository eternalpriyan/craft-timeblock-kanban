'use client'

import { useState, useCallback } from 'react'
import { CraftTask, KanbanColumnId } from '@/lib/craft/types'
import TaskCard from './TaskCard'

interface ColumnProps {
  id: KanbanColumnId
  title: string
  tasks: CraftTask[]
  draggingTask: CraftTask | null
  collapsed: boolean
  onToggleCollapse: () => void
  onToggleTask: (taskId: string, done: boolean) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (taskId: string, newMarkdown: string) => void
  onDragStart: (task: CraftTask) => void
  onDragEnd: () => void
  onDrop: (task: CraftTask, targetColumn: KanbanColumnId) => void
  onReorderTasks?: (columnId: KanbanColumnId, taskIds: string[]) => void
  onCreateTask?: () => void
}

export default function Column({
  id,
  title,
  tasks,
  draggingTask,
  collapsed,
  onToggleCollapse,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onDragStart,
  onDragEnd,
  onDrop,
  onReorderTasks,
  onCreateTask,
}: ColumnProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isOver, setIsOver] = useState(false)

  // Check if drop is allowed
  const canDrop = useCallback(() => {
    if (!draggingTask) return false
    const isDailyNoteTask = draggingTask.location?.type === 'dailyNote'
    // Daily note tasks cannot be dropped into inbox
    if (id === 'inbox' && isDailyNoteTask) return false
    return true
  }, [draggingTask, id])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (canDrop()) {
      e.dataTransfer.dropEffect = 'move'
      setIsOver(true)
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }, [canDrop])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    if (draggingTask && canDrop()) {
      onDrop(draggingTask, id)
    }
  }, [draggingTask, canDrop, onDrop, id])

  const showDropNotAllowed = isOver && !canDrop()

  // Collapsed view
  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center py-4 px-2 rounded-lg cursor-pointer
          bg-slate-100 dark:bg-zinc-900/50 hover:bg-slate-200 dark:hover:bg-zinc-800
          min-h-[200px] w-[60px] transition-all
          ${isOver && canDrop() ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
          ${showDropNotAllowed ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}
        `}
      >
        {/* Vertical title */}
        <div className="writing-mode-vertical text-sm font-semibold text-slate-700 dark:text-zinc-300 whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
        >
          {title}
        </div>
        {/* Task count badge */}
        <span className="mt-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400">
          {tasks.length}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[360px] transition-all">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <svg
            className="w-4 h-4 text-slate-400 dark:text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            {title}
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400">
            {tasks.length}
          </span>
        </button>
        {onCreateTask && (
          <button
            onClick={onCreateTask}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex-1 rounded-lg p-2 space-y-2 overflow-y-auto min-h-[200px]
          bg-slate-100 dark:bg-zinc-900/50
          ${isOver && canDrop() ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
          ${showDropNotAllowed ? 'ring-2 ring-red-400 dark:ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}
        `}
      >
        {/* Not allowed indicator */}
        {showDropNotAllowed && (
          <div className="flex items-center justify-center py-4 text-xs text-red-600 dark:text-red-400">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Cannot move daily note task to inbox
          </div>
        )}

        {/* Task cards */}
        {tasks.map((task, index) => (
          <div
            key={task.id}
            onDragOver={(e) => {
              // Allow reordering within same column
              if (draggingTask && tasks.some(t => t.id === draggingTask.id)) {
                e.preventDefault()
                e.stopPropagation()
                setDragOverIndex(index)
              }
            }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              // Handle reordering within same column
              if (draggingTask && tasks.some(t => t.id === draggingTask.id) && onReorderTasks) {
                e.preventDefault()
                e.stopPropagation()
                const fromIndex = tasks.findIndex(t => t.id === draggingTask.id)
                if (fromIndex !== index && fromIndex !== -1) {
                  const newOrder = [...tasks]
                  const [moved] = newOrder.splice(fromIndex, 1)
                  newOrder.splice(index, 0, moved)
                  onReorderTasks(id, newOrder.map(t => t.id))
                }
                setDragOverIndex(null)
              }
            }}
            className={dragOverIndex === index && draggingTask?.id !== task.id ? 'border-t-2 border-orange-400' : ''}
          >
            <TaskCard
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onDragStart={onDragStart}
              onDragEnd={() => {
                setDragOverIndex(null)
                onDragEnd()
              }}
              isDragging={draggingTask?.id === task.id}
            />
          </div>
        ))}

        {/* Empty state */}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400 dark:text-zinc-500">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
