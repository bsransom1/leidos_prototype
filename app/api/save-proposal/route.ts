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
    const { 
      title, 
      baaInput, 
      generatedOutput, 
      status, 
      currentStep, 
      proposalId,
      organizationContextJson,
      pdfFileName 
    } = body;

    // If proposalId exists, update existing proposal; otherwise create new
    if (proposalId) {
      const pmRole = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
      if (!canEdit(pmRole)) {
        return NextResponse.json(
          { error: 'Viewers cannot modify proposals.' },
          { status: 403 }
        );
      }

      const updateData: any = {};
      if (title !== undefined && title !== null) updateData.title = title;
      if (baaInput !== undefined && baaInput !== null) updateData.baa_input = baaInput;
      if (generatedOutput !== undefined && generatedOutput !== null) {
        updateData.generated_output = generatedOutput;
      }
      if (status !== undefined && status !== null) updateData.status = status || 'draft';
      if (currentStep !== undefined && currentStep !== null) {
        updateData.current_step = currentStep || 'proposal';
      }
      
      if (organizationContextJson) {
        updateData.organization_context_json = typeof organizationContextJson === 'string' 
          ? organizationContextJson 
          : JSON.stringify(organizationContextJson);
      }
      
      if (pdfFileName) {
        updateData.pdf_file_name = pdfFileName;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to update proposal' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    } else {
      // Insert new proposal into database
      const insertData: any = {
        user_id: user.id,
        title,
        baa_input: baaInput,
        generated_output: generatedOutput,
        status: status || 'draft',
        current_step: currentStep || 'proposal',
      };
      
      if (organizationContextJson) {
        insertData.organization_context_json = typeof organizationContextJson === 'string' 
          ? organizationContextJson 
          : JSON.stringify(organizationContextJson);
      }
      
      if (pdfFileName) {
        insertData.pdf_file_name = pdfFileName;
      }

      const { data, error } = await supabase
        .from('proposals')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to save proposal' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Save proposal error:', error);
    return NextResponse.json(
      { error: 'Failed to save proposal' },
      { status: 500 }
    );
  }
}
