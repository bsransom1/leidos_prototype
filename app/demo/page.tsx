import Link from 'next/link';
import { PassBrand } from '@/components/ui/app-shell';
import { ButtonLink } from '@/components/ui/button';

const steps = [
  {
    n: '01',
    title: 'Upload BAA',
    body: 'Drop in any DARPA or government solicitation PDF. The system extracts requirements, deadlines, structure, and tech signals.',
  },
  {
    n: '02',
    title: 'Inject Org Context',
    body: 'Provide your organization\u2019s profile as a JSON file — team, capabilities, prior work, and funding plan.',
  },
  {
    n: '03',
    title: 'Generate Proposal',
    body: 'Claude analyzes the BAA requirements and streams a structured, section-by-section draft tailored to your org.',
  },
  {
    n: '04',
    title: 'Export',
    body: 'Edit the proposal in the rich-text editor, review per-section confidence scores, and download as Word (.docx).',
  },
];

const capabilities = [
  'PDF ingestion with heading detection, requirement mining (shall/must/required), and deadline extraction',
  'Semantic document chunking for 100+ page solicitations',
  'Streaming proposal generation via Anthropic Claude (claude-sonnet-4-6) with SSE',
  'Section-level confidence scoring and inline quality feedback',
  'TipTap rich text editor with visual page-break overlays',
  'DARPA Stage 1-compliant .docx export (Times New Roman, 1" margins, proper heading hierarchy)',
  'Role-based access control (Admin / Editor / Viewer) with Supabase RLS — active in full version',
  'Collaboration invite flow with Resend email delivery — active in full version',
  'Post-award project management: milestones, budget allocation, CDRL deliverables — active in full version',
];

export default function DemoLandingPage() {
  return (
    <div className="min-h-screen bg-ds-page text-ds-text">
      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <header className="border-b border-ds-border bg-ds-header">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <PassBrand size="md" />
          <ButtonLink href="/demo/upload" variant="primary" prefetch={false}>
            Try the Demo →
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-20">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-24 text-center">
          <div className="mb-8 flex justify-center">
            <PassBrand size="lg" />
          </div>
          <h1 className="mb-4 text-[28px] font-bold leading-tight tracking-tight text-ds-text">
            Proposal Automation Solicitation System
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-[15px] leading-relaxed text-ds-text-secondary">
            An AI-powered platform that parses government BAA/RFP solicitations and generates
            structured, submission-ready proposals — built for defense contractors, research labs,
            and government acquisition teams.
          </p>
          <ButtonLink href="/demo/upload" variant="primary" prefetch={false}>
            Try the Demo →
          </ButtonLink>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="mb-24">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted">
            How It Works
          </h2>
          <div className="mb-8 h-px bg-ds-border" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.n}
                className="border border-ds-border bg-ds-surface p-5"
              >
                <span className="font-mono text-[11px] font-semibold text-ds-accent">{s.n}</span>
                <h3 className="mt-2 text-[14px] font-semibold text-ds-text">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ds-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Technical capabilities ───────────────────────────────────── */}
        <section className="mb-24">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted">
            Technical Capabilities
          </h2>
          <div className="mb-8 h-px bg-ds-border" />
          <ul className="space-y-3">
            {capabilities.map((cap) => (
              <li key={cap} className="flex items-start gap-3 text-[13px] leading-relaxed text-ds-text-secondary">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ds-accent" />
                {cap}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Sample downloads ─────────────────────────────────────────── */}
        <section className="mb-24">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted">
            Download Sample Files
          </h2>
          <div className="mb-8 h-px bg-ds-border" />
          <div className="border border-ds-border bg-ds-surface p-6">
            <div className="flex flex-wrap gap-4">
              <a
                href="/demo-assets/DARPA-PA-26-02Q.pdf"
                download
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-ds-sm border border-ds-border bg-ds-shell px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary transition-colors hover:bg-ds-surface hover:text-ds-text"
              >
                ↓ Download Sample BAA (PDF)
              </a>
              <a
                href="/demo-assets/org-context-sample.json"
                download
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-ds-sm border border-ds-border bg-ds-shell px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary transition-colors hover:bg-ds-surface hover:text-ds-text"
              >
                ↓ Download Sample Org Context (JSON)
              </a>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ds-text-muted">
              Use these files to run the full demo end-to-end. The BAA is the DARPA Quantum
              Benchmarking Initiative (QBI) Program Announcement DARPA-PA-26-02.
            </p>
          </div>
        </section>

        {/* ── CTA reprise ──────────────────────────────────────────────── */}
        <section className="text-center">
          <ButtonLink href="/demo/upload" variant="primary" prefetch={false}>
            Try the Demo →
          </ButtonLink>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-ds-border bg-ds-shell">
        <div className="mx-auto max-w-5xl px-6 py-4 text-center">
          <p className="font-mono text-[10px] text-ds-text-muted">
            P.A.S.S. — Built by Leidos &amp; Gentlemen · UCI Informatics Capstone 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
