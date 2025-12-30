'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Timeblock } from '@/lib/craft/types'

interface TimeblockCardProps {
  block: Timeblock
  startHour: number
  endHour: number
  hourHeight: number
  isCurrent: boolean
  isHovered?: boolean
  column?: number
  totalColumns?: number
  onToggleTask?: (blockId: string, checked: boolean) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onDelete?: () => void
  onEdit?: (newTitle: string) => void
  onMove?: (newStart: number) => void
  onResize?: (newStart: number, newEnd: number) => void
  onDragEnd?: () => void
  onUnschedule?: () => void
}

// Category to Tailwind class mapping - visible colors in both modes
const categoryColors: Record<string, string> = {
  work: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800',
  meeting: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800',
  health: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800',
  personal: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800',
  default: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
}

// Craft highlight colors - visible in both modes
const highlightColors: Record<string, string> = {
  purple: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800',
  'gradient-purple': 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800',
  blue: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800',
  'gradient-blue': 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800',
  green: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800',
  'gradient-green': 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800',
  yellow: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
  'gradient-yellow': 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
  orange: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800',
  'gradient-orange': 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800',
  red: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800',
  'gradient-red': 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800',
  pink: 'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-800',
  'gradient-pink': 'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-800',
  gray: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
  'gradient-gray': 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
}

function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayHour} ${period}` : `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isHexColor(str: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(str)
}

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

export default function TimeblockCard({
  block,
  startHour,
  endHour,
  hourHeight,
  isCurrent,
  isHovered,
  column = 0,
  totalColumns = 1,
  onToggleTask,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onEdit,
  onMove,
  onResize,
  onDragEnd,
  onUnschedule,
}: TimeblockCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartRef = useRef<{ y: number; startHour: number } | null>(null)
  const resizeStartRef = useRef<{ y: number; start: number; end: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = useCallback(() => {
    if (!onEdit) return
    setEditText(block.title)
    setIsEditing(true)
  }, [block.title, onEdit])

  const handleSaveEdit = useCallback(() => {
    if (!onEdit || !editText.trim()) {
      setIsEditing(false)
      return
    }
    if (editText.trim() !== block.title) {
      onEdit(editText.trim())
    }
    setIsEditing(false)
  }, [editText, block.title, onEdit])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      setEditText('')
    }
  }, [handleSaveEdit])

  // Calculate position and clamp to visible bounds
  const rawTop = (block.start - startHour) * hourHeight
  const rawBottom = (block.end - startHour) * hourHeight
  const maxHeight = (endHour - startHour) * hourHeight
  const clampedTop = Math.max(0, rawTop)
  const clampedBottom = Math.min(maxHeight, rawBottom)
  const top = clampedTop
  const height = Math.max(24, clampedBottom - clampedTop) // min height 24px

  // Drag handlers - mouse-based for within-timeline movement
  // Shift+drag triggers HTML5 drag for cross-area (to unscheduled)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return

    // If Shift is held, allow HTML5 drag for cross-area transfer
    if (e.shiftKey) return

    // Prevent HTML5 drag, use mouse-based for within-timeline
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { y: e.clientY, startHour: block.start }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !onMove) return

      const deltaY = e.clientY - dragStartRef.current.y
      const deltaHours = deltaY / hourHeight
      let newStart = dragStartRef.current.startHour + deltaHours
      // Snap to 15-minute intervals
      newStart = Math.round(newStart * 4) / 4
      // Clamp within bounds
      const duration = block.end - block.start
      newStart = Math.max(startHour, Math.min(endHour - duration, newStart))
      onMove(newStart)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      onDragEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [block.start, block.end, startHour, endHour, hourHeight, onMove, onDragEnd])

  // Resize handlers
  const handleResizeStart = useCallback((edge: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(edge)
    resizeStartRef.current = { y: e.clientY, start: block.start, end: block.end }

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !onResize) return
      const deltaY = e.clientY - resizeStartRef.current.y
      const deltaHours = deltaY / hourHeight

      let newStart = resizeStartRef.current.start
      let newEnd = resizeStartRef.current.end

      if (edge === 'top') {
        newStart = resizeStartRef.current.start + deltaHours
        newStart = Math.round(newStart * 4) / 4
        newStart = Math.max(startHour, Math.min(newEnd - 0.25, newStart))
      } else {
        newEnd = resizeStartRef.current.end + deltaHours
        newEnd = Math.round(newEnd * 4) / 4
        newEnd = Math.max(newStart + 0.25, Math.min(endHour, newEnd))
      }

      onResize(newStart, newEnd)
    }

    const handleMouseUp = () => {
      setIsResizing(null)
      resizeStartRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      onDragEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [block.start, block.end, startHour, endHour, hourHeight, onResize, onDragEnd])

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
    // Only allow left swipe
    if (deltaX < 0) {
      setSwipeX(deltaX)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (swipeX < -80 && onDelete) {
      // Trigger delete animation
      setSwipeX(-200)
      setTimeout(() => onDelete(), 200)
    } else {
      setSwipeX(0)
    }
    touchStartRef.current = null
  }, [swipeX, onDelete])

  // Calculate column-based positioning
  const columnWidth = 100 / totalColumns
  const leftPercent = column * columnWidth
  const gap = totalColumns > 1 ? 2 : 0 // Gap between columns in px

  // Determine color class and inline styles
  let colorClass = categoryColors[block.category] || categoryColors.default
  let inlineStyle: React.CSSProperties = {
    top,
    height: Math.max(height, 24),
    left: `calc(${leftPercent}% + ${gap}px)`,
    width: `calc(${columnWidth}% - ${gap * 2}px)`,
  }

  if (block.highlight) {
    if (isHexColor(block.highlight)) {
      colorClass = 'border'
      inlineStyle = {
        ...inlineStyle,
        backgroundColor: hexToRgba(block.highlight, 0.85),
        borderColor: hexToRgba(block.highlight, 1),
      }
    } else {
      colorClass = highlightColors[block.highlight] || colorClass
    }
  }
  if (isCurrent) {
    colorClass = 'bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-800 ring-1 ring-orange-400/50'
  }

  // Apply swipe transform
  if (swipeX !== 0) {
    inlineStyle.transform = `translateX(${swipeX}px)`
    inlineStyle.transition = swipeX === 0 ? 'transform 0.2s' : 'none'
  }

  return (
    <div
      ref={cardRef}
      className={`timeblock-card group absolute rounded-md border px-2 py-1.5 overflow-hidden select-none ${colorClass} ${
        isDragging || isResizing ? 'cursor-grabbing shadow-lg z-10' : 'cursor-grab'
      } ${isHovered ? 'ring-2 ring-slate-400 dark:ring-zinc-500' : ''}`}
      style={inlineStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top resize handle */}
      <div
        className="resize-handle absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-orange-500/20"
        onMouseDown={(e) => handleResizeStart('top', e)}
      />

      {/* Content */}
      <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-0.5">
        {formatTime(block.start)} - {formatTime(block.end)}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
        {block.isTask && block.id && onToggleTask && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTask(block.id!, !block.checked)
            }}
            className="flex-shrink-0 w-4 h-4 rounded border border-slate-400 dark:border-zinc-500 flex items-center justify-center hover:border-slate-600 dark:hover:border-zinc-400 transition-colors"
          >
            {block.checked && (
              <svg className="w-3 h-3 text-slate-700 dark:text-zinc-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
        {block.isTask && (!block.id || !onToggleTask) && (
          <span className="flex-shrink-0">{block.checked ? '✓' : '○'}</span>
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 text-sm rounded border border-slate-400 dark:border-zinc-500 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            className={`cursor-text ${block.checked ? 'line-through opacity-60' : ''}`}
          >
            {renderWithLinks(block.title)}
          </span>
        )}
      </div>

      {/* Action buttons - stacked vertically, appears on hover */}
      {(onDelete || onEdit || onUnschedule) && !isEditing && (
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Delete button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* Edit button */}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDoubleClick()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {/* Unschedule button */}
          {onUnschedule && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnschedule()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
              title="Move to unscheduled"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Bottom resize handle */}
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-orange-500/20"
        onMouseDown={(e) => handleResizeStart('bottom', e)}
      />
    </div>
  )
}
