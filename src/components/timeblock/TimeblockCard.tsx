'use client'

import { useState, useRef, useCallback } from 'react'
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
  onMove?: (newStart: number) => void
  onResize?: (newStart: number, newEnd: number) => void
  onDragEnd?: () => void
}

// Category to Tailwind class mapping - opaque backgrounds
const categoryColors: Record<string, string> = {
  work: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  meeting: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
  health: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  personal: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
  default: 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600',
}

// Craft highlight colors - opaque backgrounds
const highlightColors: Record<string, string> = {
  purple: 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
  'gradient-purple': 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700',
  blue: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  'gradient-blue': 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  green: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  'gradient-green': 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  yellow: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
  'gradient-yellow': 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
  orange: 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
  'gradient-orange': 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700',
  red: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700',
  'gradient-red': 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700',
  pink: 'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700',
  'gradient-pink': 'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700',
  gray: 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600',
  'gradient-gray': 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600',
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
  onMove,
  onResize,
  onDragEnd,
}: TimeblockCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartRef = useRef<{ y: number; startHour: number } | null>(null)
  const resizeStartRef = useRef<{ y: number; start: number; end: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const top = (block.start - startHour) * hourHeight
  const height = (block.end - block.start) * hourHeight

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return
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
    colorClass = 'bg-orange-200 dark:bg-orange-900 border-orange-400 dark:border-orange-600'
  }

  // Apply swipe transform
  if (swipeX !== 0) {
    inlineStyle.transform = `translateX(${swipeX}px)`
    inlineStyle.transition = swipeX === 0 ? 'transform 0.2s' : 'none'
  }

  return (
    <div
      ref={cardRef}
      className={`timeblock-card absolute rounded-md border px-2 py-1.5 overflow-hidden select-none ${colorClass} ${
        isDragging || isResizing ? 'cursor-grabbing shadow-lg z-10' : 'cursor-grab'
      } ${isHovered ? 'ring-2 ring-orange-500/50' : ''}`}
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
        <span className={block.checked ? 'line-through opacity-60' : ''}>{block.title}</span>
      </div>

      {/* Bottom resize handle */}
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-orange-500/20"
        onMouseDown={(e) => handleResizeStart('bottom', e)}
      />
    </div>
  )
}
