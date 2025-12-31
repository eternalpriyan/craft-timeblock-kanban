import { CraftBlock, CraftTask, TaskScope, TaskLocation, TaskUpdate } from './types'

const PROXY_BASE = '/api/craft'

// Helper to build headers with API key
function craftHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Craft-API-Key': apiKey,
  }
}

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
export async function fetchBlocks(date: Date, apiKey: string): Promise<CraftBlock> {
  const dateParam = formatDateForApi(date)
  const response = await fetch(`${PROXY_BASE}/blocks?date=${dateParam}`, {
    headers: craftHeaders(apiKey),
  })

  if (!response.ok) {
    if (response.status === 404) {
      // No daily note exists - create one
      await createDailyNote(dateParam, apiKey)
      const retryResponse = await fetch(`${PROXY_BASE}/blocks?date=${dateParam}`, {
        headers: craftHeaders(apiKey),
      })
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
async function createDailyNote(dateParam: string, apiKey: string): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'POST',
    headers: craftHeaders(apiKey),
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
  markdown: string,
  apiKey: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'PUT',
    headers: craftHeaders(apiKey),
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
  apiKey: string,
  date: string = 'today'
): Promise<CraftBlock[]> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'POST',
    headers: craftHeaders(apiKey),
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
export async function deleteBlocks(blockIds: string[], apiKey: string): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks`, {
    method: 'DELETE',
    headers: craftHeaders(apiKey),
    body: JSON.stringify({ blockIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete blocks: ${response.status}`)
  }
}

// Toggle task checkbox (done/todo)
export async function toggleTask(
  taskId: string,
  done: boolean,
  apiKey: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'PUT',
    headers: craftHeaders(apiKey),
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
export async function fetchTasks(scope: TaskScope, apiKey: string): Promise<CraftTask[]> {
  const response = await fetch(`${PROXY_BASE}/tasks?scope=${scope}`, {
    headers: craftHeaders(apiKey),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

// Update task (scheduleDate, state, markdown)
export async function updateTask(
  taskId: string,
  updates: TaskUpdate,
  apiKey: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'PUT',
    headers: craftHeaders(apiKey),
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
  targetDate: string,
  apiKey: string
): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/blocks/move`, {
    method: 'PUT',
    headers: craftHeaders(apiKey),
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
  apiKey: string,
  scheduleDate?: string
): Promise<CraftTask> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'POST',
    headers: craftHeaders(apiKey),
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
export async function deleteTasks(taskIds: string[], apiKey: string): Promise<void> {
  const response = await fetch(`${PROXY_BASE}/tasks`, {
    method: 'DELETE',
    headers: craftHeaders(apiKey),
    body: JSON.stringify({ idsToDelete: taskIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete tasks: ${response.status}`)
  }
}
