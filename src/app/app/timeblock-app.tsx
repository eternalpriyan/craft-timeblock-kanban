'use client'

import { useState, useEffect, useCallback } from 'react'
import { SettingsProvider } from '@/lib/settings/context'
import LogoutButton from './logout-button'
import TimeblockView from './timeblock-view'
import SettingsModal from '@/components/timeblock/SettingsModal'
import Board from '@/components/kanban/Board'

type ViewType = 'timeblock' | 'tasks' | '7day'

interface TimeblockAppProps {
  userEmail: string
}

export default function TimeblockApp({ userEmail }: TimeblockAppProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('timeblock')
  const [reloadKey, setReloadKey] = useState(0)

  // Reload the current view
  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  // Keyboard shortcut: V to cycle views, R to reload
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if in an input or modal
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      settingsOpen
    ) {
      return
    }
    if (e.key === 'v' || e.key === 'V') {
      setCurrentView((prev) => {
        if (prev === 'timeblock') return 'tasks'
        if (prev === 'tasks') return '7day'
        return 'timeblock'
      })
    }
    if (e.key === 'r' || e.key === 'R') {
      handleReload()
    }
  }, [settingsOpen, handleReload])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        {/* Header - always full width */}
        <header className="w-full px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View switcher */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setCurrentView('timeblock')}
                  className={`font-serif px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'timeblock'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Timeblock
                </button>
                <button
                  onClick={() => setCurrentView('tasks')}
                  className={`font-serif px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'tasks'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setCurrentView('7day')}
                  className={`font-serif px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentView === '7day'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  7-Day
                </button>
              </div>
              <button
                onClick={handleReload}
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Reload (R)"
              >
                <svg
                  className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Settings"
              >
                <svg
                  className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</span>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Content - with appropriate max-width */}
        <div className={`w-full mx-auto px-4 py-4 ${
          currentView === 'timeblock' ? 'max-w-3xl' :
          currentView === 'tasks' ? 'max-w-5xl' :
          '' // 7-day: full width
        }`}>
          {currentView === 'timeblock' && <TimeblockView key={reloadKey} />}
          {currentView === 'tasks' && <Board key={reloadKey} viewMode="standard" />}
          {currentView === '7day' && <Board key={reloadKey} viewMode="week" />}
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SettingsProvider>
  )
}
