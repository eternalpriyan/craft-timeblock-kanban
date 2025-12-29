// Craft API block structure
export interface CraftBlock {
  id: string
  type: string
  textStyle?: string
  markdown?: string
  content?: CraftBlock[] | string
  text?: string
  pageTitle?: string
  color?: string | { color?: string; name?: string }
  highlight?: string
  highlightColor?: string
  style?: { color?: string; highlight?: string }
  listStyle?: 'task' | 'todo' | 'checkbox' | 'bullet' | 'numbered'
  taskInfo?: { state?: 'todo' | 'done' | 'canceled' }
  blocks?: CraftBlock[]
  subblocks?: CraftBlock[]
  children?: CraftBlock[]
  page?: CraftBlock
}

// Parsed timeblock for display
export interface Timeblock {
  id: string | null
  start: number // Hour as decimal (e.g., 10.5 = 10:30)
  end: number
  title: string
  category: 'work' | 'meeting' | 'health' | 'personal' | 'default'
  highlight: string | null
  originalMarkdown: string
  isTask: boolean
  checked: boolean
}

// Unscheduled task (no time assigned)
export interface UnscheduledTask {
  id: string | null
  text: string
  checked: boolean
  originalMarkdown: string
}

// Result from parsing blocks
export interface ParsedBlocks {
  scheduled: Timeblock[]
  unscheduled: UnscheduledTask[]
}

// Timeline settings
export interface TimelineSettings {
  startHour: number // Default 6 (6 AM)
  endHour: number // Default 22 (10 PM)
  hourHeight: number // Pixels per hour, default 60
}

// ============================================
// Kanban Types
// ============================================

// Task scopes for GET /tasks endpoint
export type TaskScope = 'active' | 'upcoming' | 'inbox' | 'logbook'

// Task location types
export interface TaskLocation {
  type: 'inbox' | 'dailyNote'
  date?: string // YYYY-MM-DD for dailyNote tasks
}

// Craft task from GET /tasks response
export interface CraftTask {
  id: string
  markdown: string
  taskInfo?: {
    state?: 'todo' | 'done' | 'canceled'
    scheduleDate?: string
    deadlineDate?: string
  }
  location?: TaskLocation
}

// Kanban column identifiers
export type KanbanColumnId = 'inbox' | 'backlog' | 'today'

// Task update payload for PUT /tasks
export interface TaskUpdate {
  taskInfo?: {
    state?: 'todo' | 'done' | 'canceled'
    scheduleDate?: string // Use empty string '' to clear
  }
  markdown?: string
}
