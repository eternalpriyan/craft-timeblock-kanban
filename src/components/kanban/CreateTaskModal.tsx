'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { KanbanColumnId, CraftTask } from '@/lib/craft/types'
import { createTask } from '@/lib/craft/api'
import { useSettings } from '@/lib/settings/context'

interface CreateTaskModalProps {
  targetColumn: KanbanColumnId
  onClose: () => void
  onCreated: (task: CraftTask, targetColumn: KanbanColumnId) => void
}

function getTodayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []

  // Add empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  // Add the days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }
  return days
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
}

function DatePicker({ value, onChange }: DatePickerProps) {
  const today = new Date()
  const selectedDate = new Date(value + 'T00:00:00')
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())

  const days = getMonthDays(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const quickDates = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'Next Week', date: addDays(today, 7) },
  ]

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day)
    onChange(formatDateISO(newDate))
  }

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getFullYear() === viewYear
  }

  const isToday = (day: number) => {
    return today.getDate() === day &&
           today.getMonth() === viewMonth &&
           today.getFullYear() === viewYear
  }

  return (
    <div className="space-y-3">
      {/* Quick date buttons */}
      <div className="flex gap-2">
        {quickDates.map(({ label, date }) => {
          const dateISO = formatDateISO(date)
          const isActive = value === dateISO
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(dateISO)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Calendar */}
      <div className="border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{monthName}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center text-xs text-slate-400 dark:text-zinc-500 py-2 border-b border-slate-200 dark:border-zinc-700">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-zinc-700 p-1">
          {days.map((day, i) => (
            <div key={i} className="aspect-square">
              {day !== null ? (
                <button
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`w-full h-full flex items-center justify-center text-sm rounded transition-colors ${
                    isSelected(day)
                      ? 'bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium'
                      : isToday(day)
                        ? 'bg-slate-200 dark:bg-zinc-600 text-slate-900 dark:text-zinc-100 font-medium'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {day}
                </button>
              ) : (
                <div className="w-full h-full bg-white dark:bg-zinc-800" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected date display */}
      <div className="text-center text-sm text-slate-500 dark:text-zinc-400">
        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

export default function CreateTaskModal({
  targetColumn,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const { settings } = useSettings()
  const apiKey = settings.craft_api_key

  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState<'inbox' | 'dailyNote'>(
    targetColumn === 'inbox' ? 'inbox' : 'dailyNote'
  )
  const [date, setDate] = useState(getTodayISO())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !apiKey) return

    setLoading(true)
    setError(null)

    try {
      let newTask: CraftTask
      if (taskType === 'inbox') {
        // Create inbox task
        const scheduleDate = targetColumn === 'inbox' ? undefined : date
        newTask = await createTask(title.trim(), { type: 'inbox' }, apiKey, scheduleDate)
      } else {
        // Create daily note task
        newTask = await createTask(title.trim(), { type: 'dailyNote', date }, apiKey)
      }
      onCreated(newTask, targetColumn)
    } catch (err) {
      console.error('[kanban] Create task failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setLoading(false)
    }
  }, [title, taskType, date, targetColumn, onCreated, apiKey])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-800 rounded-xl shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
              New Task
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Task title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Task
              </label>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-zinc-500"
              />
            </div>

            {/* Task type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Task Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaskType('inbox')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    taskType === 'inbox'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                      : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  Inbox Task
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('dailyNote')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    taskType === 'dailyNote'
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700'
                      : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-600'
                  }`}
                >
                  Daily Note Task
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {taskType === 'inbox'
                  ? 'Inbox tasks can be scheduled to any date and moved freely.'
                  : 'Daily note tasks are embedded in a specific day\'s note.'}
              </p>
            </div>

            {/* Date picker (for dailyNote or scheduled inbox) */}
            {(taskType === 'dailyNote' || targetColumn !== 'inbox') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                  Date
                </label>
                <DatePicker value={date} onChange={setDate} />
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-700 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
