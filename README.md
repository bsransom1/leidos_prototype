# Leidos GenAI BAA & RFP Proposal Assistant

A web-based AI system that helps research organizations analyze government BAAs/RFPs, generate competitive proposals, assess proposal strength, and manage post-award project execution.

**Internal Platform** - Authentication and database storage via Supabase.

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

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React (icons)
- **PDF Processing**: pdf-parse
- **File Upload**: react-dropzone
- **Charts**: Recharts (for future enhancements)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

```bash
npm install
```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local`
3. Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run the database schema:
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `supabase/schema.sql`
   - This creates the `proposals` table with RLS policies

### Development

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
├── app/
│   ├── api/
│   │   ├── parse-pdf/          # PDF parsing endpoint
│   │   ├── generate-proposal/   # AI proposal generation endpoint
│   │   └── save-proposal/      # Save proposal to database
│   ├── login/                   # Authentication pages
│   ├── signup/
│   ├── dashboard/               # User dashboard with proposal list
│   ├── create/                  # Create new proposal flow
│   ├── proposal/[id]/            # Proposal detail view
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/
│   ├── PDFUpload.tsx            # PDF upload component
│   ├── OrganizationContextJSONUpload.tsx  # JSON context upload
│   ├── ProposalView.tsx         # Proposal display with feedback
│   ├── ConfidenceScore.tsx      # Confidence visualization
│   ├── CollaborationPanel.tsx   # User collaboration UI
│   └── ProjectSetup.tsx         # Post-award project setup
├── lib/
│   ├── supabase/                # Supabase client utilities
│   └── validation.ts            # JSON validation logic
├── middleware.ts                # Route protection
├── supabase/
│   └── schema.sql               # Database schema
├── types/
│   ├── index.ts                 # TypeScript type definitions
│   └── organization-context.ts # Organization context types
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

### POST `/api/generate-proposal`
Generates proposal draft based on BAA and organizational context.

**Request**: JSON with `baa` and `organizationContext`
**Response**: Proposal object with sections, confidence scores, and feedback

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

## Notes

- AI proposal generation is currently stubbed with simulated responses
- PDF parsing uses pdf2json for text extraction
- All proposals are saved to Supabase database
- Authentication required for all protected routes
- Collaboration features are UI-ready but need backend integration
- Project setup is functional but requires persistence layer

## Future Enhancements

- Real AI model integration
- Advanced PDF parsing with better structure detection
- Real-time collaboration with WebSockets
- Document versioning and history
- Export to Word/PDF formats
- Integration with government submission systems
- Advanced analytics and reporting

## License

Private prototype for Leidos GenAI BAA & RFP Proposal Assistant.
# Leidos-BAA-Gen-AI
