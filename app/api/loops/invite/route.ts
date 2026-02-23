import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, inviteLink } = await request.json();
    
    const apiKey = process.env.LOOPS_API_KEY;
    const transactionalId = process.env.LOOPS_INVITE_TEMPLATE_ID;
    
    if (!apiKey || !transactionalId) {
      console.error('LOOPS_API_KEY or LOOPS_INVITE_TEMPLATE_ID not configured');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        transactionalId,
        email,
        addToAudience: true,
        dataVariables: {
          firstName: firstName || '',
          lastName: lastName || '',
          inviteLink: inviteLink || '',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Loops API error:', data);
      return NextResponse.json(
        { success: false, message: data?.message },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Loops invite API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
