export interface UserSettings {
  craft_api_url: string | null
  theme: 'dark' | 'light'
  start_hour: number
  end_hour: number
}

export const DEFAULT_SETTINGS: UserSettings = {
  craft_api_url: null,
  theme: 'dark',
  start_hour: 6,
  end_hour: 22,
}
