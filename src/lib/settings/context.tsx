'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { UserSettings, ServerSettings, DEFAULT_SETTINGS, CRAFT_API_KEY_STORAGE_KEY } from './types'

interface SettingsContextValue {
  settings: UserSettings
  loading: boolean
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

// Helper to safely access localStorage (SSR-safe)
function getLocalApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CRAFT_API_KEY_STORAGE_KEY)
}

function setLocalApiKey(key: string | null): void {
  if (typeof window === 'undefined') return
  if (key === null) {
    localStorage.removeItem(CRAFT_API_KEY_STORAGE_KEY)
  } else {
    localStorage.setItem(CRAFT_API_KEY_STORAGE_KEY, key)
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    try {
      // Fetch server settings from Supabase
      const res = await fetch('/api/settings')
      if (res.ok) {
        const serverSettings: ServerSettings = await res.json()
        // Merge with localStorage API key
        const apiKey = getLocalApiKey()
        setSettings({ ...serverSettings, craft_api_key: apiKey })
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

    // Handle API key separately (localStorage)
    if ('craft_api_key' in updates) {
      setLocalApiKey(updates.craft_api_key ?? null)
    }

    // Send other updates to server (exclude craft_api_key)
    const { craft_api_key: _, ...serverUpdates } = updates
    if (Object.keys(serverUpdates).length > 0) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serverUpdates),
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
