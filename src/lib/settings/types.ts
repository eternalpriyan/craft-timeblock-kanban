export type KanbanViewMode = 'standard' | 'week'

export interface UserSettings {
  craft_api_url: string | null
  theme: 'dark' | 'light'
  start_hour: number
  end_hour: number
  // Kanban settings
  kanban_view_mode: KanbanViewMode
  monday_first: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  craft_api_url: null,
  theme: 'dark',
  start_hour: 6,
  end_hour: 22,
  kanban_view_mode: 'standard',
  monday_first: true, // Monday-first by default (common in SG)
}
