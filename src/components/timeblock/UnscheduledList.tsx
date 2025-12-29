'use client'

import { UnscheduledTask } from '@/lib/craft/types'

interface UnscheduledListProps {
  tasks: UnscheduledTask[]
}

export default function UnscheduledList({ tasks }: UnscheduledListProps) {
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
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="flex-shrink-0 mt-0.5">
              {task.checked ? '✓' : '○'}
            </span>
            <span>{task.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
