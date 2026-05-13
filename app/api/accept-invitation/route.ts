import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Accept invitation via SECURITY DEFINER RPC to avoid brittle RLS UPDATE policies.
    const { data: accepted, error: acceptError } = await supabase
      .rpc('accept_collaborator_invitation', { p_token: token })
      .single();

    if (acceptError || !accepted) {
      console.error('Error accepting invitation:', acceptError);
      const code = (acceptError as any)?.code as string | undefined;
      const status =
        code === '22023' ? 404 : // invalid_invitation
        code === '42501' ? 401 : // not_authenticated
        500;
      return NextResponse.json(
        { error: status === 404 ? 'Invalid invitation token' : 'Failed to accept invitation' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted',
      data: accepted,
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
