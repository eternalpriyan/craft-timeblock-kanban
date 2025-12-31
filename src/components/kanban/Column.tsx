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
  onCreateTask,
}: ColumnProps) {
  // Check if this is today's date column (works for both standard "today" and week view "Mon (Today)")
  const isToday = id === 'today' || title.includes('(Today)')
  const [isOver, setIsOver] = useState(false)

  // Check if drop is allowed
  const canDrop = useCallback(() => {
    if (!draggingTask) return false
    const isDailyNoteTask = draggingTask.location?.type === 'dailyNote'
    const isScheduledInboxTask = draggingTask.location?.type === 'inbox' && draggingTask.taskInfo?.scheduleDate
    // Daily note tasks and scheduled inbox tasks cannot be dropped into inbox
    // (Craft API doesn't support clearing scheduleDate)
    if (id === 'inbox' && (isDailyNoteTask || isScheduledInboxTask)) return false
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
          min-h-[200px] w-[60px]
          ${isToday ? 'ring-2 ring-slate-400 dark:ring-zinc-500' : ''}
          ${isOver && canDrop() ? 'ring-2 ring-slate-400 dark:ring-zinc-500 bg-slate-50 dark:bg-zinc-800/50' : ''}
          ${showDropNotAllowed ? 'ring-2 ring-slate-300 dark:ring-zinc-600' : ''}
        `}
      >
        {/* Vertical title */}
        <div className={`font-serif writing-mode-vertical text-sm font-semibold whitespace-nowrap ${
          isToday ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-700 dark:text-zinc-300'
        }`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
        >
          {title}
        </div>
        {/* Task count badge */}
        <span className={`mt-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${
          isToday
            ? 'bg-slate-300 dark:bg-zinc-600 text-slate-700 dark:text-zinc-200'
            : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
        }`}>
          {tasks.length}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-[140px] max-w-[240px]">
      {/* Column header - entire bar is clickable */}
      <div
        onClick={onToggleCollapse}
        className={`
          flex items-center justify-between mb-3 px-2 py-2 rounded-lg cursor-pointer
          hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors
          ${isToday ? 'bg-slate-200 dark:bg-zinc-800' : 'bg-slate-100 dark:bg-zinc-900/50'}
        `}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isToday ? 'text-slate-600 dark:text-zinc-300' : 'text-slate-400 dark:text-zinc-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className={`font-serif text-sm font-semibold ${
            isToday ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-700 dark:text-zinc-300'
          }`}>
            {title}
          </h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            isToday
              ? 'bg-slate-300 dark:bg-zinc-600 text-slate-700 dark:text-zinc-200'
              : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
          }`}>
            {tasks.length}
          </span>
        </div>
        {onCreateTask && (
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent collapse when clicking +
              onCreateTask()
            }}
            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-500 dark:text-zinc-400 transition-colors"
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
          ${isToday ? 'bg-slate-200/50 dark:bg-zinc-800/50 ring-1 ring-slate-300 dark:ring-zinc-600' : 'bg-slate-100 dark:bg-zinc-900/50'}
          ${isOver && canDrop() ? 'ring-2 ring-slate-400 dark:ring-zinc-500 bg-slate-50 dark:bg-zinc-800/50' : ''}
          ${showDropNotAllowed ? 'ring-2 ring-slate-300 dark:ring-zinc-600 bg-slate-50 dark:bg-zinc-800/50' : ''}
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
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingTask?.id === task.id}
          />
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
