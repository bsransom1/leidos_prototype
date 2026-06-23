'use client';

import { useState } from 'react';
import { Info, X } from '@phosphor-icons/react';
import { PassBrand } from '@/components/ui/app-shell';
import { ButtonLink } from '@/components/ui/button';

const steps = [
  { n: '01', title: 'Upload BAA', body: 'Drop in a government solicitation PDF' },
  { n: '02', title: 'Org Context', body: 'Provide your organization profile as JSON' },
  { n: '03', title: 'Generate', body: 'Claude streams a structured draft' },
  { n: '04', title: 'Export', body: 'Edit and download as Word (.docx)' },
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
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-ds-page text-ds-text">
      {/* Info trigger */}
      <button
        type="button"
        onClick={() => setInfoOpen(true)}
        className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-ds-border bg-ds-surface text-ds-text-muted transition-colors hover:border-ds-border-strong hover:text-ds-text"
        aria-label="About P.A.S.S."
      >
        <Info className="h-4 w-4" weight="bold" />
      </button>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-6">
        {/* Hero */}
        <section className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <PassBrand size="lg" />
          </div>
          <h1 className="mb-2 text-[24px] font-bold leading-tight tracking-tight text-ds-text">
            Proposal Automation Solicitation System
          </h1>
          <p className="mx-auto max-w-xl text-[13px] leading-relaxed text-ds-text-secondary">
            An AI-powered platform that parses government BAA/RFP solicitations and generates
            structured, submission-ready proposals.
          </p>
        </section>

        {/* How it works — compact */}
        <section className="mb-6">
          <p className="mb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ds-text-muted">
            How It Works
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="border border-ds-border bg-ds-surface px-3 py-3">
                <span className="font-mono text-[10px] font-semibold text-ds-accent">{s.n}</span>
                <h3 className="mt-1 text-[13px] font-semibold text-ds-text">{s.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-ds-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sample downloads */}
        <section className="mb-6">
          <div className="border border-ds-border bg-ds-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="/demo-assets/DARPA-PA-26-02Q.pdf"
                download
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-ds-sm border border-ds-border bg-ds-shell px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary transition-colors hover:bg-ds-surface hover:text-ds-text"
              >
                ↓ Sample BAA (PDF)
              </a>
              <a
                href="/demo-assets/org-context-sample.json"
                download
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-ds-sm border border-ds-border bg-ds-shell px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary transition-colors hover:bg-ds-surface hover:text-ds-text"
              >
                ↓ Sample Org Context (JSON)
              </a>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-ds-text-muted">
              DARPA Quantum Benchmarking Initiative (QBI) — DARPA-PA-26-02
            </p>
          </div>
        </section>

        {/* Single CTA */}
        <section className="text-center">
          <ButtonLink href="/demo/upload" variant="primary" prefetch={false}>
            Try the Demo →
          </ButtonLink>
        </section>
      </main>

      <footer className="shrink-0 border-t border-ds-border bg-ds-shell py-3 text-center">
        <p className="font-mono text-[10px] text-ds-text-muted">
          P.A.S.S. — Built by Leidos &amp; Gentlemen · UCI Informatics Capstone 2026
        </p>
      </footer>

      {/* Info overlay */}
      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setInfoOpen(false)}
          role="presentation"
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto border border-ds-border bg-ds-surface shadow-ds-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-info-title"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ds-border bg-ds-header px-5 py-3">
              <h2 id="demo-info-title" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-text">
                About P.A.S.S.
              </h2>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="flex h-7 w-7 items-center justify-center text-ds-text-muted hover:text-ds-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" weight="bold" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <p className="text-[13px] leading-relaxed text-ds-text-secondary">
                P.A.S.S. parses government BAA/RFP solicitations and generates structured,
                submission-ready proposals — built for defense contractors, research labs, and
                government acquisition teams.
              </p>

              <div>
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  How It Works
                </p>
                <ol className="space-y-2">
                  {steps.map((s) => (
                    <li key={s.n} className="flex gap-2 text-[12px] text-ds-text-secondary">
                      <span className="font-mono font-semibold text-ds-accent">{s.n}</span>
                      <span>
                        <strong className="text-ds-text">{s.title}</strong> — {s.body}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-text-muted">
                  Technical Capabilities
                </p>
                <ul className="space-y-2">
                  {capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2 text-[12px] leading-relaxed text-ds-text-secondary">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ds-accent" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
