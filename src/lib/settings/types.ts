export type KanbanViewMode = 'standard' | 'week'

// Settings stored in Supabase (server-side)
export interface ServerSettings {
  craft_api_url: string | null
  theme: 'dark' | 'light'
  start_hour: number
  end_hour: number
  kanban_view_mode: KanbanViewMode
  monday_first: boolean
}

// Full settings including localStorage items (client-side)
export interface UserSettings extends ServerSettings {
  craft_api_key: string | null // Stored in localStorage for split-knowledge security
}

export const DEFAULT_SETTINGS: UserSettings = {
  craft_api_url: null,
  craft_api_key: null,
  theme: 'dark',
  start_hour: 6,
  end_hour: 22,
  kanban_view_mode: 'standard',
  monday_first: true, // Monday-first by default (common in SG)
}

// localStorage key for API key
export const CRAFT_API_KEY_STORAGE_KEY = 'craft_api_key'
