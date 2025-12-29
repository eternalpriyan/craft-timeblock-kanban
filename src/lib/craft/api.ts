import { CraftBlock, CraftTask, TaskScope, TaskLocation, TaskUpdate } from './types'

const PROXY_BASE = '/api/craft'

// Format date for API (YYYY-MM-DD or relative)
export function formatDateForApi(date: Date): string {
  const today = new Date()
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'today'
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Fetch blocks for a specific date
export async function fetchBlocks(date: Date): Promise<CraftBlock> {
  const dateParam = formatDateForApi(date)
  const response = await fetch(`${PROXY_BASE}/blocks?date=${dateParam}`)

  if (!response.ok) {
    if (response.status === 404) {
      // No daily note exists - create one
      await createDailyNote(dateParam)
      const retryResponse = await fetch(`${PROXY_BASE}/blocks?date=${dateParam}`)
      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch blocks: ${retryResponse.status}`)
      }
      return retryResponse.json()
    }
    throw new Error(`Failed to fetch blocks: ${response.status}`)
  }

  return response.json()
}

// Create a daily note for a specific date
async function createDailyNote(dateParam: string): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [{ type: 'text', markdown: '' }],
      position: { position: 'end', date: dateParam },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create daily note: ${response.status}`)
  }
}

// Update a block's markdown content
export async function updateBlock(
  blockId: string,
  markdown: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [{ id: blockId, markdown }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[craft/api] updateBlock failed:', response.status, text)
    throw new Error(`Failed to update block: ${response.status}`)
  }

  await response.json()
}

// Insert a new block
export async function insertBlock(
  markdown: string,
  date: string = 'today'
): Promise<CraftBlock[]> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [{ type: 'text', markdown }],
      position: { position: 'end', date },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to insert block: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

// Delete blocks
export async function deleteBlocks(blockIds: string[]): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete blocks: ${response.status}`)
  }
}

// Toggle task checkbox (done/todo)
export async function toggleTask(
  taskId: string,
  done: boolean
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasksToUpdate: [
        {
          id: taskId,
          taskInfo: { state: done ? 'done' : 'todo' },
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.status}`)
  }
}

// ============================================
// Kanban API Functions
// ============================================

// Fetch tasks by scope
export async function fetchTasks(scope: TaskScope): Promise<CraftTask[]> {
  const response = await fetch(`${PROXY_BASE}/tasks?scope=${scope}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

// Update task (scheduleDate, state, markdown)
export async function updateTask(
  taskId: string,
  updates: TaskUpdate
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasksToUpdate: [{ id: taskId, ...updates }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[craft/api] updateTask failed:', response.status, text)
    throw new Error(`Failed to update task: ${response.status}`)
  }
}

// Move daily note task to a different date (physical block relocation)
export async function moveDailyNoteTask(
  taskId: string,
  targetDate: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blockIds: [taskId],
      position: { position: 'end', date: targetDate },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[craft/api] moveDailyNoteTask failed:', response.status, text)
    throw new Error(`Failed to move task: ${response.status}`)
  }
}

// Create new task
export async function createTask(
  markdown: string,
  location: TaskLocation,
  scheduleDate?: string
): Promise<CraftTask> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasks: [
        {
          markdown,
          location,
          ...(scheduleDate && { taskInfo: { scheduleDate } }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[craft/api] createTask failed:', response.status, text)
    throw new Error(`Failed to create task: ${response.status}`)
  }

  const data = await response.json()
  return data.items?.[0]
}

// Delete tasks
export async function deleteTasks(taskIds: string[]): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idsToDelete: taskIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete tasks: ${response.status}`)
  }
}
