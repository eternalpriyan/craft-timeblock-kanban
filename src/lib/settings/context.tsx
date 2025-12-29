'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { UserSettings, DEFAULT_SETTINGS } from './types'

interface SettingsContextValue {
  settings: UserSettings
  loading: boolean
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('[settings] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, ...updates }))

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        // Revert on error
        await refreshSettings()
        throw new Error('Failed to save settings')
      }
    } catch (err) {
      console.error('[settings] Failed to update:', err)
      throw err
    }
  }, [refreshSettings])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  // Apply theme to document
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [settings.theme])

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
