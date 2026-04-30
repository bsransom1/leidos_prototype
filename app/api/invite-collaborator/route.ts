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
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const emailHtml = buildInvitationEmail({ toEmail, proposalTitle, invitationLink, inviterEmail });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[LEIDOS GENAI] Proposal review access granted — ${proposalTitle}`,
      html: emailHtml,
      text: `${inviterEmail} has granted you read access to the following DARPA BAA proposal:\n\n"${proposalTitle}"\n\nAccess the proposal here:\n${invitationLink}\n\nThis link is unique to ${toEmail}. Do not forward.`,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return false;
    }

    console.log('✅ Invitation email sent:', { to: toEmail, emailId: data?.id, from: fromEmail });
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}

function buildInvitationEmail({
  toEmail,
  proposalTitle,
  invitationLink,
  inviterEmail,
}: {
  toEmail: string;
  proposalTitle: string;
  invitationLink: string;
  inviterEmail: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Access — ${proposalTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#060a12;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#060a12;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#060c18;border:1px solid rgba(80,110,150,0.35);border-bottom:none;padding:20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7a8ca8;">LEIDOS</span>
                    <span style="font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#dce6f0;"> GENAI</span>
                    <span style="font-family:monospace;font-size:10px;color:rgba(107,124,150,0.8);margin-left:12px;">// PROPOSAL INTELLIGENCE PLATFORM</span>
                  </td>
                  <td align="right">
                    <span style="font-family:monospace;font-size:10px;color:rgba(107,124,150,0.6);letter-spacing:0.1em;">CONTROLLED ACCESS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Navy accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#0033a0 0%,#c5920a 100%);border-left:1px solid rgba(80,110,150,0.35);border-right:1px solid rgba(80,110,150,0.35);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#0c1422;border:1px solid rgba(80,110,150,0.35);border-top:none;border-bottom:none;padding:32px 28px;">

              <p style="margin:0 0 8px 0;font-family:monospace;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#6b7c96;">
                ACCESS NOTIFICATION
              </p>
              <h1 style="margin:0 0 24px 0;font-size:20px;font-weight:700;color:#dce6f0;letter-spacing:0.01em;line-height:1.2;">
                You've been granted<br>read access to a proposal
              </h1>

              <p style="margin:0 0 20px 0;font-size:13px;color:rgba(220,230,240,0.8);line-height:1.6;">
                <strong style="color:#dce6f0;">${inviterEmail}</strong> has shared a DARPA BAA proposal with you for review.
              </p>

              <!-- Proposal title block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#080e1a;border:1px solid rgba(80,110,150,0.35);border-left:3px solid #0033a0;padding:16px 18px;">
                    <p style="margin:0 0 4px 0;font-family:monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6b7c96;">PROPOSAL TITLE</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#dce6f0;line-height:1.4;">${proposalTitle}</p>
                  </td>
                </tr>
              </table>

              <!-- Access details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid rgba(80,110,150,0.25);">
                <tr>
                  <td width="50%" style="padding:12px 16px;border-right:1px solid rgba(80,110,150,0.25);">
                    <p style="margin:0 0 3px 0;font-family:monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6b7c96;">ACCESS LEVEL</p>
                    <p style="margin:0;font-size:12px;color:#dce6f0;font-weight:600;">VIEWER — Read Only</p>
                  </td>
                  <td width="50%" style="padding:12px 16px;">
                    <p style="margin:0 0 3px 0;font-family:monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6b7c96;">GRANTED TO</p>
                    <p style="margin:0;font-size:12px;color:#dce6f0;font-family:monospace;">${toEmail}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}"
                       style="display:inline-block;padding:12px 32px;background-color:#0033a0;color:#ffffff;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                      ACCESS PROPOSAL DOCUMENT &#8594;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:11px;color:#6b7c96;line-height:1.6;">
                This link is unique to <span style="color:#7a8ca8;font-family:monospace;">${toEmail}</span> and provides read-only access to the proposal document. Do not forward this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#060a12;border:1px solid rgba(80,110,150,0.35);border-top:1px solid rgba(80,110,150,0.2);padding:16px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:monospace;font-size:10px;color:rgba(107,124,150,0.5);letter-spacing:0.08em;">
                      LEIDOS GENAI · PROPOSAL INTELLIGENCE PLATFORM<br>
                      If the button does not work, copy this URL into your browser:<br>
                      <a href="${invitationLink}" style="color:rgba(107,124,150,0.7);word-break:break-all;">${invitationLink}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
