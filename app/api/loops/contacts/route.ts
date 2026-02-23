import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = body?.email
    const firstName = body?.firstName ?? ''

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 })
    }

    const apiKey = process.env.LOOPS_API_KEY
    if (!apiKey) {
      console.error('LOOPS_API_KEY is not configured')
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 })
    }

    const response = await fetch('https://app.loops.so/api/v1/contacts/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, firstName }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Loops API error:', data?.message ?? response.statusText)
      return NextResponse.json({ success: false, message: data?.message }, { status: response.status })
    }

    return NextResponse.json({ success: data.success })
  } catch (error) {
    console.error('Loops contacts API error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
