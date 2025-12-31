'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { CraftTask } from '@/lib/craft/types'

// Strip markdown checkbox patterns and Craft-specific markup from task text
function stripMarkup(text: string): string {
  return text
    .trim()                                              // Remove leading/trailing whitespace first
    .replace(/^[\s\u200B\uFEFF]*/, '')                   // Remove any zero-width chars at start
    .replace(/^[-–—•*+]\s*\[[ xX]?\]\s*/i, '')          // - [ ] or - [x] with various dash types
    .replace(/^\[[ xX]?\]\s*/i, '')                      // [ ] or [x] at start without bullet
    .replace(/^[-–—•*+]\s+/i, '')                        // Plain bullet without checkbox
    .replace(/<highlight[^>]*>/gi, '')                   // Strip <highlight ...> opening tags
    .replace(/<\/highlight>/gi, '')                      // Strip </highlight> closing tags
    .trim()
}

// Alias for backwards compatibility
function stripCheckboxMarkdown(text: string): string {
  return stripMarkup(text)
}

// Format ISO date to readable format (e.g., "31 Jan 2026")
function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Render text with markdown links underlined
function renderWithLinks(text: string): React.ReactNode {
  const cleaned = stripCheckboxMarkdown(text)
  // Match [text](url) patterns
  const linkPattern = /\[([^\]]+)\]\([^)]+\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = linkPattern.exec(cleaned)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, match.index))
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
  if (lastIndex < cleaned.length) {
    parts.push(cleaned.slice(lastIndex))
  }

  return parts.length > 0 ? parts : cleaned
}

// Get the checkbox prefix from original markdown
function getCheckboxPrefix(text: string): string {
  const match = text.match(/^(-\s*\[[ xX]\]\s*|\[[ xX]\]\s*)/)
  return match ? match[0] : '- [ ] '
}

interface TaskCardProps {
  task: CraftTask
  onToggle?: (taskId: string, done: boolean) => void
  onDelete?: (taskId: string) => void
  onEdit?: (taskId: string, newMarkdown: string) => void
  onDragStart?: (task: CraftTask) => void
  onDragEnd?: () => void
  isDragging?: boolean
  dragHandleOnly?: boolean
}

export default function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  isDragging = false,
  dragHandleOnly = false,
}: TaskCardProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isCompleted = task.taskInfo?.state === 'done'
  const isInboxTask = task.location?.type === 'inbox'

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Start editing on double-click
  const handleDoubleClick = useCallback(() => {
    if (!onEdit) return
    setEditText(stripCheckboxMarkdown(task.markdown))
    setIsEditing(true)
  }, [task.markdown, onEdit])

  // Save edit
  const handleSaveEdit = useCallback(() => {
    if (!onEdit || !editText.trim()) {
      setIsEditing(false)
      return
    }
    const prefix = getCheckboxPrefix(task.markdown)
    const newMarkdown = prefix + editText.trim()
    if (newMarkdown !== task.markdown) {
      onEdit(task.id, newMarkdown)
    }
    setIsEditing(false)
  }, [editText, task.id, task.markdown, onEdit])

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditText('')
  }, [])

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])

  // Touch handlers for swipe delete
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
      setTimeout(() => onDelete(task.id), 200)
    } else {
      setSwipeX(0)
    }
    touchStartRef.current = null
  }, [swipeX, onDelete, task.id])

  // HTML5 drag handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(task)
  }, [task, onDragStart, isEditing])

  const handleDragEnd = useCallback(() => {
    onDragEnd?.()
  }, [onDragEnd])

  const style: React.CSSProperties = {}
  if (swipeX !== 0) {
    style.transform = `translateX(${swipeX}px)`
    style.transition = swipeX === 0 ? 'transform 0.2s' : 'none'
  }

  return (
    <div
      draggable={!isEditing && !dragHandleOnly}
      onDragStart={!dragHandleOnly ? handleDragStart : undefined}
      onDragEnd={!dragHandleOnly ? handleDragEnd : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        group relative p-3 rounded-lg border select-none
        bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700
        hover:border-slate-300 dark:hover:border-zinc-600
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${isCompleted ? 'opacity-60' : ''}
        ${isEditing ? 'ring-2 ring-slate-400 dark:ring-zinc-500' : ''}
        ${dragHandleOnly ? '' : 'cursor-grab'}
      `}
      style={style}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle (when dragHandleOnly) */}
        {dragHandleOnly && (
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="flex-shrink-0 mt-0.5 cursor-grab text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-400"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </div>
        )}

        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (!isEditing) onToggle?.(task.id, !isCompleted)
          }}
          className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-slate-400 dark:border-zinc-500 flex items-center justify-center hover:border-slate-600 dark:hover:border-zinc-400 transition-colors"
        >
          {isCompleted && (
            <svg className="w-3 h-3 text-slate-700 dark:text-zinc-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="w-full px-2 py-1 text-sm rounded border border-slate-400 dark:border-zinc-500 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:focus:ring-zinc-400"
            />
          ) : (
            <p
              onDoubleClick={handleDoubleClick}
              className={`text-sm text-slate-900 dark:text-zinc-100 cursor-text break-words ${isCompleted ? 'line-through' : ''}`}
            >
              {renderWithLinks(task.markdown)}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {/* Task type indicator */}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isInboxTask
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
            }`}>
              {isInboxTask ? 'Inbox' : 'Note'}
            </span>

            {/* Schedule date if present */}
            {task.taskInfo?.scheduleDate && (
              <span>{formatDate(task.taskInfo.scheduleDate)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons (visible on hover) - stacked vertically */}
      {!isEditing && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(task.id)
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-500"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Edit button */}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDoubleClick()
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 dark:text-zinc-500"
              title="Edit (double-click)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
