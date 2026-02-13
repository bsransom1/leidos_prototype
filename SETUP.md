# Supabase Setup Guide

## Quick Start

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Wait for project to initialize

2. **Get Credentials**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon public` key

3. **Configure Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Set Up Database**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/schema.sql`
   - Paste and run in SQL Editor
   - Verify table was created: Table Editor → `proposals`

5. **Enable Email Auth (Optional)**
   - Go to Authentication → Providers
   - Ensure Email provider is enabled
   - Configure email templates if needed

6. **Test Authentication**
   - Run `npm run dev`
   - Visit http://localhost:3000
   - Click "Create Account"
   - Sign up with email/password
   - You should be redirected to dashboard

## Database Schema

The `proposals` table includes:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `title` (text)
- `baa_input` (text, JSON string)
- `generated_output` (text, JSON string)
- `status` (text, default: 'draft')
- `created_at` (timestamp)
- `updated_at` (timestamp, auto-updated)

## Row Level Security (RLS)

RLS policies ensure:
- Users can only SELECT their own proposals
- Users can only INSERT proposals with their own user_id
- Users can only UPDATE their own proposals
- Users can only DELETE their own proposals

## Troubleshooting

**"Unauthorized" errors:**
- Check that RLS policies are enabled
- Verify user is authenticated (check browser cookies)
- Ensure middleware is running

**Database connection errors:**
- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure table exists in Supabase dashboard

**Auth redirects not working:**
- Clear browser cookies
- Check middleware.ts is in project root
- Verify route paths match middleware matcher
