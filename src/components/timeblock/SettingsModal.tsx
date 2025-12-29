'use client'

import { useState, useEffect, useRef } from 'react'
import { useSettings } from '@/lib/settings/context'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const [apiUrl, setApiUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setApiUrl(settings.craft_api_url || '')
  }, [settings.craft_api_url])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleThemeChange = async (theme: 'dark' | 'light') => {
    await updateSettings({ theme })
  }

  const handleApiUrlBlur = async () => {
    if (apiUrl !== (settings.craft_api_url || '')) {
      setSaving(true)
      try {
        await updateSettings({ craft_api_url: apiUrl || null })
      } catch {
        setApiUrl(settings.craft_api_url || '')
      }
      setSaving(false)
    }
  }

  const handleTimeRangeChange = async (field: 'start_hour' | 'end_hour', value: number) => {
    await updateSettings({ [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="w-full max-w-md mx-4 p-6 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-2xl"
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Settings</h2>

        {/* Theme */}
        <div className="mb-6">
          <label className="block text-sm text-slate-500 dark:text-zinc-400 mb-2">Theme</label>
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-1">
            <button
              onClick={() => handleThemeChange('dark')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                settings.theme === 'light'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Craft API URL */}
        <div className="mb-6">
          <label className="block text-sm text-slate-500 dark:text-zinc-400 mb-2">Craft API URL</label>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            onBlur={handleApiUrlBlur}
            placeholder="https://connect.craft.do/links/YOUR_KEY/api/v1"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
          {saving && <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Saving...</p>}
        </div>

        {/* Timeline Range */}
        <div className="mb-6">
          <label className="block text-sm text-slate-500 dark:text-zinc-400 mb-2">Timeline Range</label>
          <div className="flex items-center gap-3">
            <select
              value={settings.start_hour}
              onChange={(e) => handleTimeRangeChange('start_hour', parseInt(e.target.value))}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {HOURS.filter(h => h < settings.end_hour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
            <span className="text-slate-400 dark:text-zinc-500">to</span>
            <select
              value={settings.end_hour}
              onChange={(e) => handleTimeRangeChange('end_hour', parseInt(e.target.value))}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {HOURS.filter(h => h > settings.start_hour).map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-zinc-700 my-6" />

        {/* Shortcuts */}
        <div className="mb-6">
          <h3 className="text-sm text-slate-500 dark:text-zinc-400 mb-3">Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">New task</span>
              <span className="text-slate-400 dark:text-zinc-500">Space</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">Create timeblock</span>
              <span className="text-slate-400 dark:text-zinc-500">Click empty timeline</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">Edit time</span>
              <span className="text-slate-400 dark:text-zinc-500">Drag edges</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">Move timeblock</span>
              <span className="text-slate-400 dark:text-zinc-500">Drag block</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">Delete</span>
              <span className="text-slate-400 dark:text-zinc-500">Backspace / Swipe left</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-zinc-300">Navigate days</span>
              <span className="text-slate-400 dark:text-zinc-500">&larr; / &rarr;</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-zinc-700 my-6" />

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 dark:text-zinc-500">
          <a
            href="https://github.com/eternalpriyan/craft-timeblock"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-400"
          >
            Craft Timeblock
          </a>
          {' '}by Nithya Priyan
        </div>
      </div>
    </div>
  )
}
