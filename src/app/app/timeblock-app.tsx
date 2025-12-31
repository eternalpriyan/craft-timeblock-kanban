'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SettingsProvider } from '@/lib/settings/context'
import LogoutButton from './logout-button'
import TimeblockView from './timeblock-view'
import SettingsModal from '@/components/timeblock/SettingsModal'
import Board from '@/components/kanban/Board'

type ViewType = 'timeblock' | 'tasks' | '7day'

export default function TimeblockApp() {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('timeblock')
  const [reloadKey, setReloadKey] = useState(0)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Logout handler
  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [router])

  // Detect actual mobile device (touch + narrow), not just narrow desktop window
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches
      const isNarrow = window.innerWidth < 768
      setIsMobileDevice(isTouch && isNarrow)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Reload the current view
  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if in an input or modal
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      settingsOpen
    ) {
      return
    }
    // V to cycle views
    if (e.key === 'v' || e.key === 'V') {
      setCurrentView((prev) => {
        if (prev === 'timeblock') return 'tasks'
        if (prev === 'tasks') return '7day'
        return 'timeblock'
      })
    }
    // R to reload
    if (e.key === 'r' || e.key === 'R') handleReload()
    // S for settings
    if (e.key === 's' || e.key === 'S') setSettingsOpen(true)
    // L for logout
    if (e.key === 'l' || e.key === 'L') handleLogout()
  }, [settingsOpen, handleReload, handleLogout])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <SettingsProvider>
      {/* Mobile blocker - only shows on actual mobile devices (touch + narrow) */}
      {isMobileDevice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900 px-8">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-zinc-400 text-lg font-medium mb-2">Mobile Support Coming Soon</p>
          <p className="text-zinc-500 text-sm">Please view from desktop for now</p>
        </div>
      </div>
      )}

      {!isMobileDevice && (
      <div className="min-h-screen bg-background">
        {/* Header - always full width */}
        <header className="w-full px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View switcher */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setCurrentView('timeblock')}
                  title="Timeblock View (V=Cycle)"
                  className={`p-2 rounded-md transition-colors ${
                    currentView === 'timeblock'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {/* 3 horizontal lines */}
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="3" y1="5" x2="17" y2="5" />
                    <line x1="3" y1="10" x2="17" y2="10" />
                    <line x1="3" y1="15" x2="17" y2="15" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentView('tasks')}
                  title="Tasks Kanban (V=Cycle)"
                  className={`p-2 rounded-md transition-colors ${
                    currentView === 'tasks'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {/* 3 vertical lines */}
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="5" y1="3" x2="5" y2="17" />
                    <line x1="10" y1="3" x2="10" y2="17" />
                    <line x1="15" y1="3" x2="15" y2="17" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentView('7day')}
                  title="Week Kanban (V=Cycle)"
                  className={`p-2 rounded-md transition-colors ${
                    currentView === '7day'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {/* 6 vertical lines */}
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <line x1="2" y1="3" x2="2" y2="17" />
                    <line x1="5.6" y1="3" x2="5.6" y2="17" />
                    <line x1="9.2" y1="3" x2="9.2" y2="17" />
                    <line x1="12.8" y1="3" x2="12.8" y2="17" />
                    <line x1="16.4" y1="3" x2="16.4" y2="17" />
                    <line x1="18" y1="3" x2="18" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                title="Settings (S)"
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
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SettingsProvider>
  )
}
