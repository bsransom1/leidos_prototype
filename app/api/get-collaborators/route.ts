import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');

    if (!proposalId) {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 }
      );
    }

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, user_id')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found or access denied' },
        { status: 404 }
      );
    }

    const role = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (!isAdmin(role)) {
      return NextResponse.json(
        { error: 'Only proposal admins can list collaborators.' },
        { status: 403 }
      );
    }

    // Get collaborators
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from('proposal_collaborators')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false });

    if (collaboratorsError) {
      console.error('Error fetching collaborators:', collaboratorsError);
      
      if (collaboratorsError.code === '42501' && collaboratorsError.message?.includes('users')) {
        return NextResponse.json(
          { 
            error: 'Database configuration error. Please run FIX_COLLABORATORS_NOW.sql in Supabase SQL Editor.',
            details: 'Foreign key constraint on invited_by needs to be removed',
            code: collaboratorsError.code
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch collaborators',
          details: collaboratorsError.message,
          code: collaboratorsError.code
        },
        { status: 500 }
      );
    }

    // Get inviter names - use auth.users metadata or fetch separately
    // Note: Direct access to auth.users may require service role, so we'll skip inviter names for now

    const collaboratorsWithNames = collaborators?.map(collab => ({
      id: collab.id,
      email: collab.email,
      role: collab.role,
      status: collab.status,
      createdAt: collab.created_at,
      acceptedAt: collab.accepted_at,
    })) || [];

    return NextResponse.json({
      success: true,
      data: collaboratorsWithNames,
    });
  } catch (error) {
    console.error('Get collaborators error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}
