'use client'

import { useState } from 'react'
import { useSettings } from '@/lib/settings/context'
import Timeline from '@/components/timeblock/Timeline'

export default function TimeblockView() {
  const { settings, loading } = useSettings()
  const [error, setError] = useState<string | null>(null)

  // Still checking
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
        <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    )
  }

  // No API URL configured
  if (!settings.craft_api_url) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Configure your Craft API URL in settings to see your timeblocks.
        </p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <Timeline
        onError={setError}
        startHour={settings.start_hour}
        endHour={settings.end_hour}
      />
    </>
  )
}
