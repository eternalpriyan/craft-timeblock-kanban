# Craft Timeblock Kanban

## Project Overview

A Vercel-deployed Next.js app that provides Timeblock and Kanban views for Craft daily notes. Solves CORS issues by proxying Craft API calls through Vercel serverless functions.

**Live routes:**
- `/` - Cover/landing page
- `/login` - Supabase email OTP authentication
- `/app` - Protected main app (timeblock + kanban views - WIP)
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
│   ├── page.tsx              # Cover page
│   ├── login/page.tsx        # OTP login flow
│   ├── app/                   # Protected routes
│   │   ├── page.tsx          # Main app (destination)
│   │   └── logout-button.tsx
│   └── auth/callback/route.ts # Supabase auth callback
├── lib/
│   └── supabase/
│       ├── client.ts         # Browser client
│       ├── server.ts         # Server client (RSC/API routes)
│       └── middleware.ts     # Session refresh + route protection
└── middleware.ts             # Next.js middleware entry
```

## Environment Variables

Required in `.env.local` (not committed):
```
NEXT_PUBLIC_SUPABASE_URL=https://rbnwkpizbvtyumqdyflw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## Current Status

**Completed (Step 1):**
- [x] Next.js project setup
- [x] Supabase email OTP auth with session persistence
- [x] Cover page → Login → Protected destination flow
- [x] Middleware for route protection

**Pending (Step 2):**
- [ ] Integrate timeblock view from craft-timeblock repo
- [ ] Integrate kanban view from craft-kanban repo  
- [ ] Unify into single app experience with view switching
- [ ] Add `/api/craft/*` proxy routes to fix CORS

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
