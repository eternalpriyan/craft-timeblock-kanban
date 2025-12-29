import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import CraftSettings from './craft-settings'
import TimeblockView from './timeblock-view'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="w-full max-w-3xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium text-slate-900 dark:text-white">
              Timeblock
            </h1>
            {/* Settings toggle */}
            <details className="group relative">
              <summary className="cursor-pointer list-none">
                <svg
                  className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </summary>
              <div className="absolute left-0 top-8 z-50 w-80 p-4 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <CraftSettings />
              </div>
            </details>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{user.email}</span>
            <LogoutButton />
          </div>
        </header>

        {/* Timeline - full width */}
        <TimeblockView />
      </div>
    </div>
  )
}
