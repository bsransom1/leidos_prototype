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
      const updateData: any = {
        title,
        baa_input: baaInput,
        generated_output: generatedOutput,
        status: status || 'draft',
        current_step: currentStep || 'proposal',
      };
      
      if (organizationContextJson) {
        updateData.organization_context_json = typeof organizationContextJson === 'string' 
          ? organizationContextJson 
          : JSON.stringify(organizationContextJson);
      }
      
      if (pdfFileName) {
        updateData.pdf_file_name = pdfFileName;
      }

      const { data, error } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId)
        .eq('user_id', user.id)
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
