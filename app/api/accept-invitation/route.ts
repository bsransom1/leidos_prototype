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

    // Get collaborator by token
    const { data: collaborator, error: collaboratorError } = await supabase
      .from('proposal_collaborators')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (collaboratorError || !collaborator) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Verify email matches
    if (collaborator.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 403 }
      );
    }

    // Update status to accepted
    const { error: updateError } = await supabase
      .from('proposal_collaborators')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', collaborator.id);

    if (updateError) {
      console.error('Error updating collaborator:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted',
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
