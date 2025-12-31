import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TimeblockApp from './timeblock-app'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <TimeblockApp />
}
