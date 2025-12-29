'use client'

import { useEffect, useState } from 'react'

interface NowLineProps {
  startHour: number
  hourHeight: number
  isToday: boolean
}

export default function NowLine({ startHour, hourHeight, isToday }: NowLineProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!isToday) return

    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isToday])

  if (!isToday) return null

  const currentHour = now.getHours() + now.getMinutes() / 60
  const top = (currentHour - startHour) * hourHeight

  // Don't show if outside visible range
  if (top < 0) return null

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-orange-500 dark:bg-orange-400 z-10 flex items-center"
      style={{ top }}
    >
      <div className="absolute -left-14 text-[11px] font-semibold text-orange-500 dark:text-orange-400">
        {timeStr}
      </div>
      <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full -ml-1 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
    </div>
  )
}
