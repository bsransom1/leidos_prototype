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
    const { proposalId, email, role = 'viewer' } = body;

    if (!proposalId || !email) {
      return NextResponse.json(
        { error: 'proposalId and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Verify user owns the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, title, user_id')
      .eq('id', proposalId)
      .eq('user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found or access denied' },
        { status: 404 }
      );
    }

    // Check if collaborator already exists
    const { data: existing, error: existingError } = await supabase
      .from('proposal_collaborators')
      .select('id, status')
      .eq('proposal_id', proposalId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // If error is not "not found", log it but continue
    if (existingError && existingError.code !== 'PGRST116') {
      console.warn('Error checking existing collaborator:', existingError);
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Collaborator already invited', data: existing },
        { status: 409 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Insert collaborator
    const { data: collaborator, error: insertError } = await supabase
      .from('proposal_collaborators')
      .insert({
        proposal_id: proposalId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        invitation_token: invitationToken,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting collaborator:', insertError);
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        user_id: user.id,
        proposal_id: proposalId,
      });
      
      // Provide more specific error messages
      if (insertError.code === '42501' && insertError.message?.includes('users')) {
        return NextResponse.json(
          { 
            error: 'DATABASE FIX REQUIRED: Foreign key constraint is blocking operations.',
            details: insertError.message,
            fix: 'Open Supabase Dashboard → SQL Editor → Run: supabase/FIX_COLLABORATORS_NOW.sql',
            code: insertError.code,
            sqlFix: `ALTER TABLE proposal_collaborators DROP CONSTRAINT IF EXISTS proposal_collaborators_invited_by_fkey;`
          },
          { status: 500 }
        );
      }
      
      if (insertError.code === '42501') {
        return NextResponse.json(
          { 
            error: 'Permission denied. Check RLS policies.',
            details: insertError.message,
            hint: 'Run FIX_COLLABORATORS_NOW.sql in Supabase SQL Editor',
            code: insertError.code
          },
          { status: 500 }
        );
      }
      
      if (insertError.code === '42P01') {
        return NextResponse.json(
          { 
            error: 'Table does not exist. Please run migration_add_collaborators.sql in Supabase SQL Editor.',
            details: insertError.message,
            code: insertError.code
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to invite collaborator',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 500 }
      );
    }

    // Send invitation email
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/proposal/shared/${invitationToken}`;
    
    try {
      // Use Supabase's email function or send via API
      // For now, we'll use a simple approach - you can enhance this with Resend/SendGrid
      const emailSent = await sendInvitationEmail(email, proposal.title, invitationLink, user.email || '');
      
      return NextResponse.json({
        success: true,
        data: collaborator,
        invitationLink, // Return link for testing/debugging
        emailSent,
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success since collaborator was added
      return NextResponse.json({
        success: true,
        data: collaborator,
        invitationLink,
        emailSent: false,
        warning: 'Collaborator added but email failed to send',
      });
    }
  } catch (error) {
    console.error('Invite collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to invite collaborator' },
      { status: 500 }
    );
  }
}

async function sendInvitationEmail(
  toEmail: string,
  proposalTitle: string,
  invitationLink: string,
  inviterEmail: string
): Promise<boolean> {
  try {
    // Use Resend for email sending
    const { Resend } = await import('resend');
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.warn('⚠️  RESEND_API_KEY not found. Email will not be sent.');
      console.log('📧 Email invitation (not sent):', {
        to: toEmail,
        proposal: proposalTitle,
        link: invitationLink,
      });
      console.log('💡 To enable email sending:');
      console.log('   1. Sign up at https://resend.com');
      console.log('   2. Get your API key');
      console.log('   3. Add RESEND_API_KEY=your_key to .env.local');
      return false;
    }

    const resend = new Resend(resendApiKey);
    
    // Get sender email from env or use Resend's default domain
    // For demos, use onboarding@resend.dev (no domain verification needed)
    // To use custom domain, verify it at https://resend.com/domains first
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    // Try sending with the configured email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `You've been invited to view: ${proposalTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 4px; padding: 24px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">Proposal Collaboration Invitation</h2>
            <p>You've been invited by <strong>${inviterEmail}</strong> to view the proposal:</p>
            <div style="background-color: #f9fafb; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
              <p style="font-weight: bold; font-size: 18px; color: #059669; margin: 0;">${proposalTitle}</p>
            </div>
            <p>Click the button below to view the proposal:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">
                View Proposal
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${invitationLink}" style="color: #2563eb; word-break: break-all;">${invitationLink}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `You've been invited by ${inviterEmail} to view the proposal: ${proposalTitle}\n\nView the proposal here: ${invitationLink}`,
    });

    // If domain verification error, fall back to Resend's default domain
    if (error && error.message?.includes('domain is not verified')) {
      console.warn('⚠️  Custom domain not verified, falling back to Resend default domain');
      fromEmail = 'onboarding@resend.dev';
      
      // Retry with default domain
      const retryResult = await resend.emails.send({
        from: fromEmail,
        to: [toEmail],
        subject: `You've been invited to view: ${proposalTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 4px; padding: 24px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Proposal Collaboration Invitation</h2>
              <p>You've been invited by <strong>${inviterEmail}</strong> to view the proposal:</p>
              <div style="background-color: #f9fafb; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
                <p style="font-weight: bold; font-size: 18px; color: #059669; margin: 0;">${proposalTitle}</p>
              </div>
              <p>Click the button below to view the proposal:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationLink}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">
                  View Proposal
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${invitationLink}" style="color: #2563eb; word-break: break-all;">${invitationLink}</a>
              </p>
            </div>
          </body>
          </html>
        `,
        text: `You've been invited by ${inviterEmail} to view the proposal: ${proposalTitle}\n\nView the proposal here: ${invitationLink}`,
      });
      
      if (retryResult.error) {
        console.error('❌ Resend API error (retry failed):', retryResult.error);
        return false;
      }
      
      console.log('✅ Email sent successfully via Resend (using default domain):', {
        to: toEmail,
        emailId: retryResult.data?.id,
        proposal: proposalTitle,
        from: fromEmail,
      });
      
      return true;
    }
    
    if (error) {
      console.error('❌ Resend API error:', error);
      return false;
    }

    console.log('✅ Email sent successfully via Resend:', {
      to: toEmail,
      emailId: data?.id,
      proposal: proposalTitle,
      from: fromEmail,
    });
    
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}
