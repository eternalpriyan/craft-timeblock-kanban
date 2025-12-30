'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { UnscheduledTask } from '@/lib/craft/types'

// Render text with markdown links underlined
function renderWithLinks(text: string): React.ReactNode {
  // Match [text](url) patterns
  const linkPattern = /\[([^\]]+)\]\([^)]+\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = linkPattern.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    // Add the link text with underline
    parts.push(
      <span key={key++} className="underline decoration-slate-400 dark:decoration-zinc-500">
        {match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

interface UnscheduledListProps {
  tasks: UnscheduledTask[]
  onToggleTask?: (taskId: string, checked: boolean) => void
  onTaskHover?: (taskId: string | null) => void
  hoveredTask?: string | null
  onDelete?: (taskId: string) => void
  onEdit?: (taskId: string, newText: string) => void
  onDragStart?: (task: UnscheduledTask) => void
  onDragEnd?: () => void
  onAddTask?: () => void
}

interface TaskItemProps {
  task: UnscheduledTask
  onToggleTask?: (taskId: string, checked: boolean) => void
  onHover?: (taskId: string | null) => void
  isHovered?: boolean
  onDelete?: () => void
  onEdit?: (newText: string) => void
  onDragStart?: (task: UnscheduledTask) => void
  onDragEnd?: () => void
}

function TaskItem({ task, onToggleTask, onHover, isHovered, onDelete, onEdit, onDragStart, onDragEnd }: TaskItemProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

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

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!task.id || isEditing) return
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'unscheduled', taskId: task.id, text: task.text }))
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(task)
  }, [task, onDragStart, isEditing])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    onDragEnd?.()
  }, [onDragEnd])

  const handleDoubleClick = useCallback(() => {
    if (!onEdit) return
    setEditText(task.text)
    setIsEditing(true)
  }, [task.text, onEdit])

  const handleSaveEdit = useCallback(() => {
    if (!onEdit || !editText.trim()) {
      setIsEditing(false)
      return
    }
    if (editText.trim() !== task.text) {
      onEdit(editText.trim())
    }
    setIsEditing(false)
  }, [editText, task.text, onEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      setEditText('')
    }
  }, [handleSaveEdit])

  return (
    <li
      draggable={!!task.id && !isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group flex items-start gap-2 text-sm transition-all ${isEditing ? '' : 'cursor-grab'} ${
        task.checked
          ? 'text-slate-400 dark:text-zinc-500'
          : 'text-slate-700 dark:text-zinc-300'
      } ${isHovered ? 'bg-slate-100 dark:bg-zinc-800 -mx-2 px-2 py-1 rounded' : ''} ${isDragging ? 'opacity-50' : ''} ${isEditing ? 'ring-1 ring-slate-400 dark:ring-zinc-500 -mx-2 px-2 py-1 rounded' : ''}`}
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
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveEdit}
          className="flex-1 px-1 py-0.5 text-sm rounded border border-slate-400 dark:border-zinc-500 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none"
        />
      ) : (
        <>
          <span
            onDoubleClick={handleDoubleClick}
            className={`flex-1 cursor-text ${task.checked ? 'line-through' : ''}`}
          >
            {renderWithLinks(task.text)}
          </span>
          {/* Action buttons on hover */}
          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={handleDoubleClick}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-500"
                title="Edit"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-500"
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </li>
  )
}

export default function UnscheduledList({
  tasks,
  onToggleTask,
  onTaskHover,
  hoveredTask,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  onAddTask,
}: UnscheduledListProps) {
  // Show component if there are tasks OR if we can add tasks (so user can add first task)
  if (tasks.length === 0 && !onAddTask) return null

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-sm font-medium text-slate-500 dark:text-zinc-400">
          Unscheduled ({tasks.length})
        </h3>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-500 transition-colors"
            title="Add task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id || index}
            task={task}
            onToggleTask={onToggleTask}
            onHover={onTaskHover}
            isHovered={hoveredTask === task.id}
            onDelete={task.id ? () => onDelete?.(task.id!) : undefined}
            onEdit={task.id && onEdit ? (newText) => onEdit(task.id!, newText) : undefined}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </ul>
    </div>
  )
}
