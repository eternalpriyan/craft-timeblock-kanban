import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    craft_api_url: user.user_metadata?.craft_api_url || null,
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { craft_api_url } = body

  // Validate URL format
  if (craft_api_url && !craft_api_url.startsWith('https://connect.craft.do/links/')) {
    return NextResponse.json(
      { error: 'Invalid Craft API URL format' },
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { craft_api_url },
  })

  if (updateError) {
    console.error('[settings] Failed to update user metadata:', updateError)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, craft_api_url })
}
