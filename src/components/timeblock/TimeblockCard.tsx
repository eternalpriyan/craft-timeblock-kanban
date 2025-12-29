'use client'

import { Timeblock } from '@/lib/craft/types'

interface TimeblockCardProps {
  block: Timeblock
  startHour: number
  hourHeight: number
  isCurrent: boolean
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

export default function TimeblockCard({
  block,
  startHour,
  hourHeight,
  isCurrent,
}: TimeblockCardProps) {
  const top = (block.start - startHour) * hourHeight
  const height = (block.end - block.start) * hourHeight

  // Determine color class
  let colorClass = categoryColors[block.category] || categoryColors.default
  if (block.highlight) {
    colorClass = highlightColors[block.highlight] || colorClass
  }
  if (isCurrent) {
    colorClass = 'bg-orange-500/25 border-orange-500'
  }

  return (
    <div
      className={`absolute left-3 right-3 rounded-md border px-3 py-2 overflow-hidden transition-transform hover:translate-x-0.5 ${colorClass}`}
      style={{ top, height: Math.max(height, 24) }}
    >
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
        {formatTime(block.start)} - {formatTime(block.end)}
      </div>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
        {block.isTask && (
          <span className={block.checked ? 'line-through opacity-60' : ''}>
            {block.checked ? '✓ ' : '○ '}
          </span>
        )}
        {block.title}
      </div>
    </div>
  )
}
