import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  paramsPromise: Promise<{ path: string[] }>,
  method: string
) {
  const supabase = await createClient()

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get Craft API URL from user metadata
  const craftApiUrl = user.user_metadata?.craft_api_url as string | undefined
  if (!craftApiUrl) {
    return NextResponse.json(
      { error: 'Craft API URL not configured. Please set it in settings.' },
      { status: 400 }
    )
  }

  // Build target URL
  const { path } = await paramsPromise
  const pathString = path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  const targetUrl = `${craftApiUrl}/${pathString}${searchParams ? `?${searchParams}` : ''}`

  // Forward request
  const headers: HeadersInit = {
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
    'Accept': request.headers.get('Accept') || 'application/json',
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  // Include body for non-GET requests
  if (method !== 'GET') {
    const body = await request.text()
    if (body) {
      fetchOptions.body = body
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions)
    const contentType = response.headers.get('Content-Type') || 'application/json'

    if (contentType.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    } else {
      const text = await response.text()
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': contentType },
      })
    }
  } catch (error) {
    console.error('[craft-proxy] Request failed:', error)
    return NextResponse.json(
      { error: 'Failed to reach Craft API' },
      { status: 502 }
    )
  }
}
