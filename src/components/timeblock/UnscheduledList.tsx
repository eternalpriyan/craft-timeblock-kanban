'use client'

import { UnscheduledTask } from '@/lib/craft/types'

interface UnscheduledListProps {
  tasks: UnscheduledTask[]
  onToggleTask?: (taskId: string, checked: boolean) => void
}

export default function UnscheduledList({ tasks, onToggleTask }: UnscheduledListProps) {
  if (tasks.length === 0) return null

  return (
    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
        Unscheduled ({tasks.length})
      </h3>
      <ul className="space-y-2">
        {tasks.map((task, index) => (
          <li
            key={task.id || index}
            className={`flex items-start gap-2 text-sm ${
              task.checked
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {task.id && onToggleTask ? (
              <button
                onClick={() => onToggleTask(task.id!, !task.checked)}
                className="flex-shrink-0 w-4 h-4 mt-0.5 rounded border border-slate-400 dark:border-slate-500 flex items-center justify-center hover:border-slate-600 dark:hover:border-slate-400 transition-colors"
              >
                {task.checked && (
                  <svg className="w-3 h-3 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ) : (
              <span className="flex-shrink-0 mt-0.5">{task.checked ? '✓' : '○'}</span>
            )}
            <span className={task.checked ? 'line-through' : ''}>{task.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
