# Craft Timeblock Kanban

## Project Overview

A Vercel-deployed Next.js app that provides Timeblock and Kanban views for Craft daily notes. Solves CORS issues by proxying Craft API calls through Vercel serverless functions.

**Live routes:**
- `/` - Cover/landing page
- `/login` - Supabase email OTP authentication
- `/app` - Protected main app (timeblock + kanban views)
- `/auth/callback` - OAuth callback handler
- `/api/craft/*` - Craft API proxy (planned)

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Auth:** Supabase (email OTP, SSR cookie sessions)
- **Hosting:** Vercel
- **Source apps:** [craft-timeblock](https://github.com/eternalpriyan/craft-timeblock), [craft-kanban](https://github.com/eternalpriyan/craft-kanban)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Cover page
│   ├── globals.css               # Tailwind + dark mode config
│   ├── login/page.tsx            # OTP login flow
│   ├── app/                      # Protected routes
│   │   ├── page.tsx              # Entry point (redirects to timeblock-app)
│   │   ├── timeblock-app.tsx     # Main app shell with settings provider
│   │   ├── timeblock-view.tsx    # Timeline wrapper with loading states
│   │   └── logout-button.tsx
│   ├── auth/callback/route.ts    # Supabase auth callback
│   └── api/
│       ├── craft/[...path]/route.ts  # Craft API proxy
│       └── settings/route.ts         # User settings CRUD
├── components/
│   ├── timeblock/
│   │   ├── Timeline.tsx          # Main timeline component with interactions
│   │   ├── TimeblockCard.tsx     # Individual timeblock (drag/resize/swipe)
│   │   ├── TimeAxis.tsx          # Hour labels on left
│   │   ├── NowLine.tsx           # Current time indicator
│   │   ├── UnscheduledList.tsx   # Tasks without times
│   │   ├── InlineEditor.tsx      # Inline create for blocks/tasks
│   │   └── SettingsModal.tsx     # Tabbed settings (General, Timeblock, Kanban)
│   └── kanban/
│       ├── Board.tsx             # Main board with 3 columns (Inbox, Backlog, Today)
│       ├── Column.tsx            # Individual column with drop zone
│       ├── TaskCard.tsx          # Draggable task card with checkbox
│       └── CreateTaskModal.tsx   # New task modal with date picker
├── lib/
│   ├── craft/
│   │   ├── api.ts                # Craft API client (blocks + tasks CRUD)
│   │   ├── types.ts              # CraftBlock, Timeblock, CraftTask types
│   │   ├── time-parser.ts        # ⭐ EDIT HERE: All time parsing patterns & functions
│   │   └── parse-timeblocks.ts   # Block → Timeblock/Task conversion
│   ├── settings/
│   │   ├── types.ts              # UserSettings interface + defaults
│   │   └── context.tsx           # Settings React context + theme application
│   └── supabase/
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client (RSC/API routes)
│       └── middleware.ts         # Session refresh + route protection
└── middleware.ts                 # Next.js middleware entry
```

## Environment Variables

Required in `.env.local` (not committed):
```
NEXT_PUBLIC_SUPABASE_URL=https://rbnwkpizbvtyumqdyflw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## Current Status

**Completed:**
- [x] Next.js project setup
- [x] Supabase email OTP auth with session persistence
- [x] Cover page → Login → Protected destination flow
- [x] Middleware for route protection
- [x] Craft API proxy (`/api/craft/*`)
- [x] Timeblock view with full interactivity:
  - Drag to move, resize edges to adjust duration
  - Click empty space to create (1hr default)
  - Backspace/Delete or swipe left to delete
  - Spacebar for new task
  - Overlapping blocks display side-by-side
  - Dark/light mode with persistence
- [x] Settings (theme, API URL, timeline range) saved to Supabase user metadata
- [x] Kanban view fully integrated:
  - Standard 3-column layout (Inbox, Backlog, Today)
  - Drag-drop with task type constraints (inbox vs daily note tasks)
  - Collapsible columns (accordion style, inbox/backlog collapsed by default)
  - Click checkbox to complete, swipe/delete to remove
  - Inline task editing (double-click or pencil icon)
  - Task reordering within columns via drag-drop
  - Create task modal with type selection and date picker
  - Optimistic UI updates (no page reload on actions)
  - Press V to toggle views, R to reload
- [x] Tabbed Settings modal (General, Timeblock, Kanban)
- [x] 7-day view for kanban:
  - 3-way view switcher in header: Timeblock | Tasks | 7-Day
  - Tasks view: Standard 3-column (Inbox | Backlog | Today)
  - 7-Day view: Full week (Inbox | Backlog | Mon-Sun | Future)
  - Week navigation with prev/next buttons and "Today" quick-jump
  - Configurable week start (Monday or Sunday) in Settings
  - Today column highlighted with orange accent
  - V key cycles through views

## Code Principles

### 1. Fail Loudly
- All errors must surface to the user with actionable messages
- No silent catches - log and display meaningful context
- API errors include status codes and response bodies
- Use error boundaries for React component failures

### 2. Secrets Management
- All keys in `.env.local` only (gitignored)
- Never hardcode credentials
- Use `NEXT_PUBLIC_` prefix only for truly public values
- Document required env vars in this file

### 3. Single Source of Truth (SSOT)
- No code duplication - extract shared logic to `/lib`
- One Supabase client factory per environment (client/server)
- Shared types in `/types` when needed
- Constants and config in dedicated files

### 4. Documentation
- This CLAUDE.md is the primary context file
- Update on any structural changes
- Code comments for non-obvious logic only
- Component files should be self-documenting via clear naming

### 5. Gardening
- Remove unused imports, files, and dependencies
- No commented-out code in commits
- Run `npm run build` before committing to catch issues
- Periodically audit for dead code and outdated patterns

### 6. Error Handling Pattern
```typescript
// Preferred pattern for async operations
const { data, error } = await someOperation()
if (error) {
  console.error('[context] Operation failed:', error)
  setMessage({ type: 'error', text: error.message })
  return
}
// proceed with data
```

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build (run before committing)
npm run lint     # ESLint
```

## Supabase Config Notes

- Email OTP enabled (not magic link)
- Redirect URLs must include `/auth/callback` for each domain
- Production: add Vercel domain to Supabase redirect allowlist

## Integration Notes (for Step 2)

### Craft API

Each user provides their own public API URL: `https://connect.craft.do/links/{KEY}/api/v1`

Full API documentation: [docs/craft-api.md](docs/craft-api.md)

Key endpoints:
- `GET /blocks` - Fetch daily note content (default: today)
- `POST /blocks` - Insert content
- `GET /tasks` - Get tasks by scope (active, upcoming, inbox, logbook)
- `GET /daily-notes/search` - Search across notes

### Source Repos

Raw index.html files to pull from:
- **Timeblock:** https://raw.githubusercontent.com/eternalpriyan/craft-timeblock/main/index.html
- **Kanban:** https://raw.githubusercontent.com/eternalpriyan/craft-kanban/main/index.html

### Source App Characteristics

Both are vanilla JS single-file apps that:
- Call Craft API directly (causes CORS for some users)
- Use localStorage for settings (API URL, theme)
- Parse Craft daily notes for timeblocks/tasks

### Integration Approach

1. Convert to React components
2. Route API calls through `/api/craft/` proxy
3. Share auth state and Craft API URL config
4. Unified settings/preferences storage

### Kanban Task Types (IMPORTANT)

Craft has two distinct task location types with different drag-drop rules:

**Inbox Tasks** (`location.type === 'inbox'`)
- Central tasks in Craft's Inbox, not tied to any document
- **Flexible:** Can move between ALL columns
- When dragged to a date column → `scheduleDate` updates
- Task **stays in Inbox** — only metadata changes
- Can be dragged back to Inbox column (removes scheduleDate)

**Daily Note Tasks** (`location.type === 'dailyNote'`)
- Embedded markdown blocks inside daily note pages
- **Limited:** Can only move between DATE columns (Today, Backlog)
- **CANNOT be dragged to Inbox** — API constraint, causes orphaning
- Moving between dates = physical block relocation via `PUT /blocks/move`

### Kanban API Functions

```typescript
// lib/craft/api.ts
fetchTasks(scope: TaskScope)           // GET /tasks?scope=...
updateTask(taskId, updates)            // PUT /tasks (scheduleDate, state)
moveDailyNoteTask(taskId, targetDate)  // PUT /blocks/move
createTask(markdown, location, date?)  // POST /tasks
deleteTasks(taskIds)                   // DELETE /tasks
```

### 7-Day View (Implemented)

**Columns:** Inbox | Backlog | Mon-Sun | Future

**Settings:**
- `kanban_view_mode`: 'standard' | 'week'
- `monday_first`: boolean (week start day)

**Key files:**
- `src/components/kanban/Board.tsx` - Main board with view mode logic
- `src/components/kanban/Column.tsx` - Column with date column support
- `src/lib/settings/types.ts` - Settings interface
- `src/components/timeblock/SettingsModal.tsx` - View mode toggle UI
