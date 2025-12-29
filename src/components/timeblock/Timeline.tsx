'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchBlocks, toggleTask } from '@/lib/craft/api'
import { parseBlocks } from '@/lib/craft/parse-timeblocks'
import { Timeblock, UnscheduledTask } from '@/lib/craft/types'
import TimeAxis from './TimeAxis'
import NowLine from './NowLine'
import TimeblockCard from './TimeblockCard'
import UnscheduledList from './UnscheduledList'

const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 22
const HOUR_HEIGHT = 60

interface TimelineProps {
  onError?: (message: string) => void
}

function formatDateTitle(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isCurrent(block: Timeblock): boolean {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  return currentHour >= block.start && currentHour < block.end
}

export default function Timeline({ onError }: TimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduled, setScheduled] = useState<Timeblock[]>([])
  const [unscheduled, setUnscheduled] = useState<UnscheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const startHour = DEFAULT_START_HOUR
  const endHour = DEFAULT_END_HOUR
  const totalHours = endHour - startHour

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchBlocks(currentDate)
      const { scheduled: s, unscheduled: u } = parseBlocks(data)
      setScheduled(s)
      setUnscheduled(u)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedule'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }, [currentDate, onError])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  // Scroll to current time on load
  useEffect(() => {
    if (!loading && isToday(currentDate) && timelineRef.current) {
      const now = new Date()
      const currentHour = now.getHours() + now.getMinutes() / 60
      const scrollTop = (currentHour - startHour - 2) * HOUR_HEIGHT
      timelineRef.current.scrollTop = Math.max(0, scrollTop)
    }
  }, [loading, currentDate, startHour])

  const goToPrevDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const handleToggleTask = async (blockId: string, checked: boolean) => {
    // Optimistic update
    setScheduled((prev) =>
      prev.map((block) =>
        block.id === blockId ? { ...block, checked } : block
      )
    )

    try {
      await toggleTask(blockId, checked)
    } catch (err) {
      // Revert on error
      setScheduled((prev) =>
        prev.map((block) =>
          block.id === blockId ? { ...block, checked: !checked } : block
        )
      )
      onError?.(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleToggleUnscheduledTask = async (taskId: string, checked: boolean) => {
    // Optimistic update
    setUnscheduled((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, checked } : task
      )
    )

    try {
      await toggleTask(taskId, checked)
    } catch (err) {
      // Revert on error
      setUnscheduled((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, checked: !checked } : task
        )
      )
      onError?.(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  // Generate hour lines
  const hourLines = []
  for (let hour = startHour; hour <= endHour; hour++) {
    hourLines.push(
      <div
        key={hour}
        className="absolute left-0 right-0 h-px bg-slate-200 dark:bg-slate-700 opacity-50"
        style={{ top: (hour - startHour) * HOUR_HEIGHT }}
      />
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevDay}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-medium text-slate-900 dark:text-white px-2">
            {formatDateTitle(currentDate)}
          </h2>
          <button
            onClick={goToNextDay}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={loadSchedule}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={loadSchedule}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && (
        <div
          ref={timelineRef}
          className="relative ml-14"
        >
          <TimeAxis startHour={startHour} endHour={endHour} hourHeight={HOUR_HEIGHT} />

          <div
            className="relative border-l border-slate-200 dark:border-slate-700"
            style={{ minHeight: totalHours * HOUR_HEIGHT }}
          >
            {/* Hour lines */}
            {hourLines}

            {/* Now line */}
            <NowLine startHour={startHour} hourHeight={HOUR_HEIGHT} isToday={isToday(currentDate)} />

            {/* Timeblocks */}
            {scheduled.map((block, index) => (
              <TimeblockCard
                key={block.id || index}
                block={block}
                startHour={startHour}
                hourHeight={HOUR_HEIGHT}
                isCurrent={isToday(currentDate) && isCurrent(block)}
                onToggleTask={handleToggleTask}
              />
            ))}
          </div>

          {/* Unscheduled tasks */}
          <UnscheduledList tasks={unscheduled} onToggleTask={handleToggleUnscheduledTask} />
        </div>
      )}
    </div>
  )
}
