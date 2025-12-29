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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-6">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Timeblock
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Timeline */}
        <div className="p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <TimeblockView />
        </div>

        {/* Settings (collapsible) */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Settings
            </div>
          </summary>
          <div className="mt-3 p-4 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CraftSettings />
          </div>
        </details>
      </div>
    </div>
  )
}
