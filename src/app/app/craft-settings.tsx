'use client'

import { useState, useEffect } from 'react'

export default function CraftSettings() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setUrl(data.craft_api_url || '')
      }
    } catch {
      console.error('[craft-settings] Failed to load settings')
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ craft_api_url: url }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Failed to save')
        return
      }

      setStatus('saved')
      setMessage('Saved!')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setMessage('Failed to save settings')
    }
  }

  return (
    <form onSubmit={saveSettings} className="space-y-4">
      <div>
        <label
          htmlFor="craft-url"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Craft API URL
        </label>
        <input
          id="craft-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://connect.craft.do/links/YOUR_KEY/api/v1"
          className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Get this from Craft → Daily Notes API settings
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Saving...' : 'Save'}
        </button>

        {message && (
          <span
            className={`text-sm ${
              status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  )
}
