'use client'

import { Timeblock } from '@/lib/craft/types'

interface TimeblockCardProps {
  block: Timeblock
  startHour: number
  hourHeight: number
  isCurrent: boolean
  onToggleTask?: (blockId: string, checked: boolean) => void
}

// Category to Tailwind class mapping
const categoryColors: Record<string, string> = {
  work: 'bg-blue-500/15 border-blue-500/30',
  meeting: 'bg-orange-500/15 border-orange-500/30',
  health: 'bg-green-500/15 border-green-500/30',
  personal: 'bg-purple-500/15 border-purple-500/30',
  default: 'bg-slate-500/10 border-slate-500/20',
}

// Craft highlight colors
const highlightColors: Record<string, string> = {
  purple: 'bg-purple-500/25 border-purple-500/40',
  'gradient-purple': 'bg-purple-500/25 border-purple-500/40',
  blue: 'bg-blue-500/25 border-blue-500/40',
  'gradient-blue': 'bg-blue-500/25 border-blue-500/40',
  green: 'bg-green-500/25 border-green-500/40',
  'gradient-green': 'bg-green-500/25 border-green-500/40',
  yellow: 'bg-yellow-500/25 border-yellow-500/40',
  'gradient-yellow': 'bg-yellow-500/25 border-yellow-500/40',
  orange: 'bg-orange-500/25 border-orange-500/40',
  'gradient-orange': 'bg-orange-500/25 border-orange-500/40',
  red: 'bg-red-500/25 border-red-500/40',
  'gradient-red': 'bg-red-500/25 border-red-500/40',
  pink: 'bg-pink-500/25 border-pink-500/40',
  'gradient-pink': 'bg-pink-500/25 border-pink-500/40',
  gray: 'bg-slate-500/25 border-slate-500/40',
  'gradient-gray': 'bg-slate-500/25 border-slate-500/40',
}

function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayHour} ${period}` : `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}

// Convert hex color to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Check if string is a hex color
function isHexColor(str: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(str)
}

export default function TimeblockCard({
  block,
  startHour,
  hourHeight,
  isCurrent,
  onToggleTask,
}: TimeblockCardProps) {
  const top = (block.start - startHour) * hourHeight
  const height = (block.end - block.start) * hourHeight

  // Determine color class and inline styles
  let colorClass = categoryColors[block.category] || categoryColors.default
  let inlineStyle: React.CSSProperties = { top, height: Math.max(height, 24) }

  if (block.highlight) {
    if (isHexColor(block.highlight)) {
      // Use inline styles for hex colors
      colorClass = 'border'
      inlineStyle = {
        ...inlineStyle,
        backgroundColor: hexToRgba(block.highlight, 0.25),
        borderColor: hexToRgba(block.highlight, 0.5),
      }
    } else {
      colorClass = highlightColors[block.highlight] || colorClass
    }
  }
  if (isCurrent) {
    colorClass = 'bg-orange-500/25 border-orange-500'
  }

  return (
    <div
      className={`absolute left-3 right-3 rounded-md border px-3 py-2 overflow-hidden transition-transform hover:translate-x-0.5 ${colorClass}`}
      style={inlineStyle}
    >
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
        {formatTime(block.start)} - {formatTime(block.end)}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
        {block.isTask && block.id && onToggleTask && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTask(block.id!, !block.checked)
            }}
            className="flex-shrink-0 w-4 h-4 rounded border border-slate-400 dark:border-slate-500 flex items-center justify-center hover:border-slate-600 dark:hover:border-slate-400 transition-colors"
          >
            {block.checked && (
              <svg className="w-3 h-3 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
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
    </div>
  )
}
