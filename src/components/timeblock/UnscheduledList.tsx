'use client'

import { useState, useRef, useCallback } from 'react'
import { UnscheduledTask } from '@/lib/craft/types'

interface UnscheduledListProps {
  tasks: UnscheduledTask[]
  onToggleTask?: (taskId: string, checked: boolean) => void
  onTaskHover?: (taskId: string | null) => void
  hoveredTask?: string | null
  onDelete?: (taskId: string) => void
}

interface TaskItemProps {
  task: UnscheduledTask
  onToggleTask?: (taskId: string, checked: boolean) => void
  onHover?: (taskId: string | null) => void
  isHovered?: boolean
  onDelete?: () => void
}

function TaskItem({ task, onToggleTask, onHover, isHovered, onDelete }: TaskItemProps) {
  const [swipeX, setSwipeX] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    if (deltaX < 0) {
      setSwipeX(deltaX)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (swipeX < -80 && onDelete) {
      setSwipeX(-200)
      setTimeout(() => onDelete(), 200)
    } else {
      setSwipeX(0)
    }
    touchStartRef.current = null
  }, [swipeX, onDelete])

  return (
    <li
      className={`flex items-start gap-2 text-sm transition-all ${
        task.checked
          ? 'text-slate-400 dark:text-zinc-500'
          : 'text-slate-700 dark:text-zinc-300'
      } ${isHovered ? 'bg-orange-500/10 -mx-2 px-2 py-1 rounded' : ''}`}
      style={{
        transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
        transition: swipeX === 0 ? 'transform 0.2s' : 'none',
      }}
      onMouseEnter={() => onHover?.(task.id)}
      onMouseLeave={() => onHover?.(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {task.id && onToggleTask ? (
        <button
          onClick={() => onToggleTask(task.id!, !task.checked)}
          className="flex-shrink-0 w-4 h-4 mt-0.5 rounded border border-slate-400 dark:border-zinc-500 flex items-center justify-center hover:border-slate-600 dark:hover:border-zinc-400 transition-colors"
        >
          {task.checked && (
            <svg className="w-3 h-3 text-slate-700 dark:text-zinc-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      ) : (
        <span className="flex-shrink-0 mt-0.5">{task.checked ? '✓' : '○'}</span>
      )}
      <span className={task.checked ? 'line-through' : ''}>{task.text}</span>
    </li>
  )
}

export default function UnscheduledList({
  tasks,
  onToggleTask,
  onTaskHover,
  hoveredTask,
  onDelete,
}: UnscheduledListProps) {
  if (tasks.length === 0) return null

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
      <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-3">
        Unscheduled ({tasks.length})
      </h3>
      <ul className="space-y-2">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id || index}
            task={task}
            onToggleTask={onToggleTask}
            onHover={onTaskHover}
            isHovered={hoveredTask === task.id}
            onDelete={task.id ? () => onDelete?.(task.id!) : undefined}
          />
        ))}
      </ul>
    </div>
  )
}
