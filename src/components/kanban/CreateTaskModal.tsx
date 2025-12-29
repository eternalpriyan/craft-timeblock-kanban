'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { KanbanColumnId, CraftTask } from '@/lib/craft/types'
import { createTask } from '@/lib/craft/api'

interface CreateTaskModalProps {
  targetColumn: KanbanColumnId
  onClose: () => void
  onCreated: (task: CraftTask, targetColumn: KanbanColumnId) => void
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export default function CreateTaskModal({
  targetColumn,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
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
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      let newTask: CraftTask
      if (taskType === 'inbox') {
        // Create inbox task
        const scheduleDate = targetColumn === 'inbox' ? undefined : date
        newTask = await createTask(title.trim(), { type: 'inbox' }, scheduleDate)
      } else {
        // Create daily note task
        newTask = await createTask(title.trim(), { type: 'dailyNote', date })
      }
      onCreated(newTask, targetColumn)
    } catch (err) {
      console.error('[kanban] Create task failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setLoading(false)
    }
  }, [title, taskType, date, targetColumn, onCreated])

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
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                      ? 'bg-blue-500 text-white'
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
                      ? 'bg-green-500 text-white'
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
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
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
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
