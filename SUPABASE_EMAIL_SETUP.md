# Fixing "Email Not Confirmed" Issue

## Problem
Supabase requires email confirmation by default. Users must click a confirmation link in their email before they can sign in.

## Solution Options

### Option 1: Disable Email Confirmation (Recommended for Internal Tools)

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Email Auth" section
3. **Disable "Confirm email"** toggle
4. Save changes

After disabling, users can sign up and immediately sign in without email confirmation.

### Option 2: Keep Email Confirmation Enabled

If you want to keep email confirmation:

1. **Configure Email Templates** (Supabase Dashboard → Authentication → Email Templates):
   - Customize confirmation email template
   - Set redirect URL to: `http://localhost:3000/auth/callback` (dev) or your production URL

2. **Users must:**
   - Sign up
   - Check email inbox
   - Click confirmation link
   - Then sign in

3. **For Development/Testing:**
   - Use Supabase Dashboard → Authentication → Users
   - Manually confirm user emails
   - Or use a test email service

### Option 3: Auto-Confirm in Development

For development environments, you can auto-confirm users:

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", enable "Enable email confirmations"
3. But also enable "Enable custom SMTP" and use a development email service
4. Or manually confirm users in the dashboard

## Recommended: Disable for Internal Platform

Since this is an **internal DoD platform**, email confirmation adds unnecessary friction. 

**Recommended action:**
1. Go to Supabase Dashboard
2. Authentication → Settings → Email Auth
3. **Turn OFF "Confirm email"**
4. Save

Users can now sign up and immediately access the platform.

## Testing After Fix

1. Sign up with a new account
2. You should be immediately redirected to dashboard (no email check needed)
3. Sign out and sign back in - should work immediately
