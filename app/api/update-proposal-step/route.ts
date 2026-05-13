import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, canEdit } from '@/lib/pm-access';

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
    const { proposalId, step, baaInput, organizationContext, generatedOutput } = body;

    if (!proposalId || !step) {
      return NextResponse.json(
        { error: 'proposalId and step are required' },
        { status: 400 }
      );
    }

    const pmRole = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (!canEdit(pmRole)) {
      return NextResponse.json(
        { error: 'Viewers cannot update proposals.' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {
      current_step: step,
      updated_at: new Date().toISOString(),
    };

    // Optionally update data fields if provided
    if (baaInput) updateData.baa_input = baaInput;
    if (organizationContext) {
      // Store organization context in baa_input or create a separate field
      // For now, we'll store it as part of the proposal data
    }
    if (generatedOutput) updateData.generated_output = generatedOutput;

    // Update proposal
    const { data, error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update proposal step' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update proposal step error:', error);
    return NextResponse.json(
      { error: 'Failed to update proposal step' },
      { status: 500 }
    );
  }
}
