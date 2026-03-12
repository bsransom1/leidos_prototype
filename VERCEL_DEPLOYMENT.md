# Vercel Deployment Guide

## Quick Setup

1. **Push to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**:
   In Vercel Dashboard → Project Settings → Environment Variables, add:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   RESEND_API_KEY=your_resend_api_key
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Your app will be live at `https://your-project.vercel.app`

## Important Notes

- **NEXT_PUBLIC_APP_URL**: Update this to your actual Vercel URL after first deployment
- **Environment Variables**: All variables are encrypted and only available at build/runtime
- **Automatic Deployments**: Every push to `main` branch triggers a new deployment
- **Preview Deployments**: Pull requests get preview URLs automatically

## Troubleshooting

- **Build Failures**: Check build logs in Vercel dashboard
- **Environment Variables**: Ensure all required vars are set
- **API Routes**: Verify API routes are working in production
- **Database**: Ensure Supabase allows connections from Vercel IPs (should be automatic)
