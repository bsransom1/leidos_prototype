import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, isAdmin } from '@/lib/pm-access';

const COLLAB_ROLES = ['viewer', 'editor', 'admin'] as const;

function normalizeInviteRole(value: unknown): (typeof COLLAB_ROLES)[number] {
  if (typeof value !== 'string') return 'viewer';
  const r = value.toLowerCase();
  return (COLLAB_ROLES as readonly string[]).includes(r) ? (r as (typeof COLLAB_ROLES)[number]) : 'viewer';
}

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
    const { proposalId, email } = body;
    const role = normalizeInviteRole(body.role);

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

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, title, user_id')
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found or access denied' },
        { status: 404 }
      );
    }

    const pmRole = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
    if (!isAdmin(pmRole)) {
      return NextResponse.json(
        { error: 'Only proposal admins can invite collaborators.' },
        { status: 403 }
      );
    }

    // Check if collaborator already exists
    const { data: existing, error: existingError } = await supabase
      .from('proposal_collaborators')
      .select('id, status, role, invitation_token')
      .eq('proposal_id', proposalId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // If error is not "not found", log it but continue
    if (existingError && existingError.code !== 'PGRST116') {
      console.warn('Error checking existing collaborator:', existingError);
    }

    if (existing) {
      if (existing.role === role) {
        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/proposal/shared/${existing.invitation_token}`;
        return NextResponse.json({
          success: true,
          data: existing,
          invitationLink,
          emailSent: false,
          roleUpdated: false,
          unchanged: true,
        });
      }

      const { data: updated, error: updateExistingError } = await supabase
        .from('proposal_collaborators')
        .update({ role })
        .eq('id', existing.id)
        .eq('proposal_id', proposalId)
        .select()
        .single();

      if (updateExistingError || !updated) {
        console.error('Error updating existing collaborator role:', updateExistingError);
        return NextResponse.json(
          { error: 'Collaborator already invited; could not update role.', details: updateExistingError?.message },
          { status: 500 }
        );
      }

      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/proposal/shared/${updated.invitation_token}`;

      try {
        const emailSent =
          updated.status === 'pending'
            ? await sendInvitationEmail(email, proposal.title, invitationLink, user.email || '', role)
            : false;

        return NextResponse.json({
          success: true,
          data: updated,
          invitationLink,
          emailSent,
          roleUpdated: true,
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return NextResponse.json({
          success: true,
          data: updated,
          invitationLink,
          emailSent: false,
          roleUpdated: true,
          warning: 'Role updated but email failed to send',
        });
      }
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
      
      // FK invited_by → auth.users triggers RLS on auth.users during INSERT (42501) or 23503.
      const msg = insertError.message ?? '';
      const fkBlocksInvite =
        insertError.code === '23503' ||
        (insertError.code === '42501' && /users|auth\.users|foreign key/i.test(msg));
      if (fkBlocksInvite) {
        return NextResponse.json(
          {
            error:
              'Database fix required: apply supabase/FIX_COLLABORATORS_NOW.sql in Supabase SQL Editor (or npm run db:fix-collaborators-invites with DATABASE_URL in .env.local). This drops the invited_by→auth.users FK that blocks inserts.',
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 },
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
            error:
              'Table does not exist. Run supabase/migrations/20260130120000_leidos_full_schema.sql in Supabase SQL Editor (or npm run db:migrate with DATABASE_URL).',
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 },
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
      const emailSent = await sendInvitationEmail(email, proposal.title, invitationLink, user.email || '', role);
      
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

function inviteRoleEmailLabel(r: (typeof COLLAB_ROLES)[number]): string {
  if (r === 'admin') return 'Admin · Full control & invites';
  if (r === 'editor') return 'Editor · Edit & AI assist';
  return 'Viewer · Read only';
}

async function sendInvitationEmail(
  toEmail: string,
  proposalTitle: string,
  invitationLink: string,
  inviterEmail: string,
  accessRole: (typeof COLLAB_ROLES)[number]
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

    const emailHtml = buildInvitationEmail({
      toEmail,
      proposalTitle,
      invitationLink,
      inviterEmail,
      accessRole,
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[P.A.S.S.] Proposal shared with you — ${proposalTitle}`,
      html: emailHtml,
      text: `${inviterEmail} has shared the following DARPA BAA proposal with you (${inviteRoleEmailLabel(accessRole)}):\n\n"${proposalTitle}"\n\nOpen the proposal:\n${invitationLink}\n\nThis link is unique to ${toEmail}. Do not forward.`,
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
  accessRole,
}: {
  toEmail: string;
  proposalTitle: string;
  invitationLink: string;
  inviterEmail: string;
  accessRole: (typeof COLLAB_ROLES)[number];
}): string {
  const accessLabel =
    accessRole === 'admin'
      ? 'Admin · Full control & invites'
      : accessRole === 'editor'
        ? 'Editor · Edit & AI assist'
        : 'Viewer · Read only';
  const accessIntro =
    accessRole === 'viewer'
      ? `${inviterEmail} has shared a proposal with you`
      : `${inviterEmail} has given you workspace access to a proposal`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal shared with you — ${proposalTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Brand header -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px 8px 0 0;padding:24px 32px;border-bottom:none;">
              <p style="margin:0;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#1d4ed8;">P.A.S.S.</p>
              <p style="margin:2px 0 0 0;font-size:11px;color:#6b7280;">Proposal Automation Solicitation System</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:none;border-bottom:none;padding:32px 32px 28px;">

              <p style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:#111827;line-height:1.4;">
                ${accessIntro}
              </p>

              <!-- Proposal title block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #2563eb;border-radius:0 4px 4px 0;padding:14px 16px;">
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Proposal</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#111827;line-height:1.4;">${proposalTitle}</p>
                  </td>
                </tr>
              </table>

              <!-- Access details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:4px;">
                <tr>
                  <td width="50%" style="padding:12px 16px;border-right:1px solid #e5e7eb;">
                    <p style="margin:0 0 3px 0;font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Access level</p>
                    <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${accessLabel}</p>
                  </td>
                  <td width="50%" style="padding:12px 16px;">
                    <p style="margin:0 0 3px 0;font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Granted to</p>
                    <p style="margin:0;font-size:13px;color:#374151;font-family:monospace;">${toEmail}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${invitationLink}"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
                      Open proposal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                This link is personal to <strong>${toEmail}</strong>. Sign in with this address to access your assigned role. Do not forward this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;padding:16px 32px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                P.A.S.S. &mdash; Proposal Automation Solicitation System<br>
                If the button above does not work, copy this URL into your browser:<br>
                <a href="${invitationLink}" style="color:#6b7280;word-break:break-all;">${invitationLink}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
