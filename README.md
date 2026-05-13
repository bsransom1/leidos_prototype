# P.A.S.S. — Proposal Automation Service System

A web-based AI assistant for research organizations to analyze government BAAs/RFPs, generate structured proposal drafts, score confidence, collaborate with viewers, and manage post-award program data.

**Internal prototype** — Authentication and persistence via Supabase.

## Features

### Core Functionality

1. **PDF Upload & Parsing**
   - Upload BAA/RFP documents (PDF format, supports 100+ pages)
   - Automatic extraction of sections, requirements, deadlines, and structure

2. **Organizational Context Input**
   - Capture organization/lab information
   - Research focus and prior work
   - Team members and roles
   - Funding allocation plans

3. **AI Proposal Generation**
   - Generates structured proposal drafts aligned to BAA outline
   - Uses organizational context to tailor content
   - Section-by-section generation with compliance checking
   - **Export**: Download the full proposal as a Word (`.docx`) file formatted for DARPA Stage 1 review (Times New Roman, 1" margins); edit in Word before final submission

4. **Proposal Quality Feedback**
   - Grammarly-like inline highlights
   - Section status indicators (strong, needs-improvement, weak, missing)
   - Specific feedback and suggestions for improvement

5. **Confidence Scoring**
   - Overall proposal confidence score
   - Section-level confidence scores
   - Benchmarking against historical successful proposals

6. **Collaboration Features**
   - Multi-user workspace support
   - Role-based access control (admin, editor, viewer)
   - User management interface

7. **Post-Award Project Setup**
   - Project timeline configuration
   - Milestone and deliverable management
   - Budget allocation across teams and time periods
   - Cross-document confidence tracking

## Tech Stack

- **Framework**: Next.js 16 with App Router (single app in `app/`; no separate Vite bundle)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Phosphor React (Bold)
- **PDF Processing**: pdf2json
- **File Upload**: react-dropzone

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env.local` and set values (see **Environment Variables** below).

2. Apply SQL migrations (Supabase **SQL Editor**, or from the repo with `DATABASE_URL` in `.env.local`):
   - **Base:** `supabase/migrations/20260130120000_leidos_full_schema.sql` (`npm run db:migrate`)
   - **Post-award PM:** `supabase/migration_pm_post_award.sql` (only if you use awarding / PM dashboard)
   - **Anonymous shared links:** `supabase/fix_shared_proposal_anon_access.sql` (viewers hitting `/proposal/shared/...` without login)
   - If shared links error with invalid invitation / RLS recursion: `supabase/migrations/20260513000000_fix_anon_shared_proposal_rls_recursion.sql`
   - **Collaborator edits:** `supabase/migrations/20260513120000_proposal_collaborator_update_delete_rls.sql` (editors saving document; admins deleting proposal)
   - **Admin role changes on collaborators:** `supabase/migrations/20260513140000_collaborator_admin_update_collaborators_rls.sql`
   - **Invitees resolving roles:** `supabase/migrations/20260514120000_collaborators_select_own_rows_rls.sql`
   - **Invite FK / admin invites:** `npm run db:fix-collaborators-invites` or `supabase/FIX_COLLABORATORS_NOW.sql`

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**First Time Setup:**
1. Visit the landing page
2. Click "Create Account" to sign up
3. After signup, you'll be redirected to the dashboard
4. Click "Create New Proposal" to start generating proposals

### Build

```bash
npm run build
npm start
```

## Project Structure

```
leidos_prototype/
├── app/                 # Next.js App Router (pages + API routes)
├── components/          # ProposalEditor, PDF upload, org context UI, etc.
├── lib/                 # Supabase helpers, pm-access, export, validation
├── middleware.ts
├── supabase/
│   ├── migrations/      # Ordered SQL migrations
│   ├── migration_pm_post_award.sql
│   ├── fix_shared_proposal_anon_access.sql
│   ├── FIX_COLLABORATORS_NOW.sql
│   └── config.toml      # Supabase CLI (after supabase init / link)
├── design-system/
├── types/
└── package.json
```

## User Flow

1. **Landing Page**: Public landing page with sign in/sign up
2. **Authentication**: Email/password authentication via Supabase
3. **Dashboard**: View all user's proposals, create new proposals
4. **Create Proposal**:
   - Upload BAA/RFP PDF document
   - Upload organization context JSON
   - Generate AI-powered proposal draft
   - Review with feedback and confidence scores
   - Save to database
5. **Proposal Detail**: View, edit title, or delete saved proposals
6. **Post-Award**: Configure project timelines, budgets, and deliverables (future)

## API Endpoints

### POST `/api/parse-pdf`
Parses uploaded PDF and extracts structure, requirements, and deadlines.

**Request**: FormData with `file` field
**Response**: BAA object with parsed sections and metadata

### POST `/api/generate-proposal-stream`
Generates proposal draft using OpenAI with real-time progress updates via Server-Sent Events (SSE).

**Request**: JSON with `baa` and `organizationContext`
**Response**: SSE stream with progress updates (0-100%) and final proposal object with sections, confidence scores, and feedback

## Database Schema

The `proposals` table stores:
- `id`: UUID primary key
- `user_id`: Foreign key to authenticated user
- `title`: Proposal title
- `baa_input`: JSON string of parsed BAA data
- `generated_output`: JSON string of generated proposal
- `status`: Proposal status (draft/generated)
- `created_at`: Timestamp
- `updated_at`: Auto-updated timestamp

**Row Level Security (RLS)** is enabled - users can only access their own proposals.

## Environment Variables

Required environment variables (add to `.env.local`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# Resend Email Configuration (for collaboration invitations)
RESEND_API_KEY=your_resend_api_key  # Optional: Get from https://resend.com
# RESEND_FROM_EMAIL=noreply@yourdomain.com  # Optional: Requires domain verification

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

## Collaboration Features

- **Share** in the proposal editor (admins): invite by email with viewer / editor / admin roles
- **Resend** (optional): invitation emails when `RESEND_API_KEY` is set
- **Shared links**: `/proposal/shared/[token]` for invited emails; sign-in unlocks editor/admin per role

**Setup Email Sending:**
1. Sign up at https://resend.com
2. Get your API key from https://resend.com/api-keys
3. Add `RESEND_API_KEY` to `.env.local`
4. For custom domains, verify at https://resend.com/domains

## Notes

- AI proposal generation uses OpenAI GPT-4o-mini with streaming for real-time progress
- Generates comprehensive ~10-page Stage 1 BAA proposals (5,000-6,000 words, 10 sections)
- PDF parsing uses pdf2json for text extraction with raw text preservation
- All proposals are saved to Supabase database with auto-save functionality
- Authentication required for all protected routes
- Users can resume proposals from any step
- Markdown rendering for proposal content (bold, bullets, headers, etc.)

## Post-award program management (PM)

After **Mark awarded**, navigate to **`/dashboard/projects/[proposalId]/pm`**. Owners can still open the proposal document view from PM or `/proposal/[id]`.

1. Run `supabase/migration_pm_post_award.sql` in Supabase SQL Editor where applicable.

2. Proposal owner operates as PM admin; collaborator roles map from `proposal_collaborators`.

3. **PM API** routes live under `/api/projects/[projectId]/...` (overview, milestones, risks, budget, deliverables).

4. **Award**: `POST /api/proposals/[proposalId]/award` seeds baseline PM data where implemented.

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Required Vercel Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY` (optional)
- `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)

## Future Enhancements

- Advanced PDF parsing with better structure detection
- Real-time collaboration with WebSockets
- Document versioning and history
- Export to PDF (Word export exists today)
- Integration with government submission systems
- Advanced analytics and reporting

## License

Private prototype — P.A.S.S. (Proposal Automation Service System).
