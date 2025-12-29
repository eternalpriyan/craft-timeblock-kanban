import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface UserSettings {
  craft_api_url: string | null
  theme: 'dark' | 'light'
  start_hour: number
  end_hour: number
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'craft_api_url'> = {
  theme: 'dark',
  start_hour: 6,
  end_hour: 22,
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metadata = user.user_metadata || {}

  return NextResponse.json({
    craft_api_url: metadata.craft_api_url || null,
    theme: metadata.theme || DEFAULT_SETTINGS.theme,
    start_hour: metadata.start_hour ?? DEFAULT_SETTINGS.start_hour,
    end_hour: metadata.end_hour ?? DEFAULT_SETTINGS.end_hour,
  } as UserSettings)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { craft_api_url, theme, start_hour, end_hour } = body

  // Validate URL format if provided
  if (craft_api_url && !craft_api_url.startsWith('https://connect.craft.do/links/')) {
    return NextResponse.json(
      { error: 'Invalid Craft API URL format' },
      { status: 400 }
    )
  }

  // Validate theme if provided
  if (theme && !['dark', 'light'].includes(theme)) {
    return NextResponse.json(
      { error: 'Invalid theme value' },
      { status: 400 }
    )
  }

  // Validate hours if provided
  if (start_hour !== undefined && (start_hour < 0 || start_hour > 23)) {
    return NextResponse.json(
      { error: 'Invalid start_hour value' },
      { status: 400 }
    )
  }

  if (end_hour !== undefined && (end_hour < 1 || end_hour > 24)) {
    return NextResponse.json(
      { error: 'Invalid end_hour value' },
      { status: 400 }
    )
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}
  if (craft_api_url !== undefined) updateData.craft_api_url = craft_api_url
  if (theme !== undefined) updateData.theme = theme
  if (start_hour !== undefined) updateData.start_hour = start_hour
  if (end_hour !== undefined) updateData.end_hour = end_hour

  const { error: updateError } = await supabase.auth.updateUser({
    data: updateData,
  })

  if (updateError) {
    console.error('[settings] Failed to update user metadata:', updateError)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, ...updateData })
}
