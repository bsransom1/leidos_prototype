'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DownloadSimple, ArrowLeft, ListNumbers } from '@phosphor-icons/react';
import ProposalEditor, { type ProposalEditorHandle } from '@/components/ProposalEditor';
import { Button } from '@/components/ui/button';
import { PassBrand } from '@/components/ui/app-shell';
import { getDemoProposal, clearDemoState } from '@/lib/demo-state';
import { buildProposalSubmissionDocx } from '@/lib/proposal-export-docx';
import type { Proposal, BAA } from '@/types';

// Minimal stub BAA so ProposalEditor's required `baa` prop is satisfied
const STUB_BAA: BAA = {
  id: 'demo',
  title: '',
  fileName: '',
  uploadedAt: new Date(),
  sections: [],
  requirements: [],
  deadlines: [],
  structure: [],
};

export default function DemoProposalPage() {
  const router = useRouter();
  const editorRef = useRef<ProposalEditorHandle>(null);

  const [proposalData, setProposalData] = useState<Proposal | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  // Guard: must have generated proposal in state
  useEffect(() => {
    const raw = getDemoProposal();
    if (!raw) {
      router.replace('/demo');
      return;
    }
    setProposalData(raw as Proposal);
  }, [router]);

  const handleStartOver = () => {
    clearDemoState();
    router.push('/demo');
  };

  const handleExportDocx = useCallback(async () => {
    if (!proposalData?.sections?.length) {
      alert('No proposal sections to export yet.');
      return;
    }
    setExportBusy(true);
    try {
      const blob = await buildProposalSubmissionDocx(proposalData, STUB_BAA);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PASS_Proposal_${timestamp}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Could not generate the Word document. Try again.');
    } finally {
      setExportBusy(false);
    }
  }, [proposalData]);

  const handleScrollToSection = (sectionId: string) => {
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.innerWidth < 1024) setOutlineOpen(false);
  };

  if (!proposalData) return null;

  const sections = proposalData.sections || [];

  return (
    <div className="flex h-screen flex-col bg-ds-page">
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-ds-border bg-ds-header/95 backdrop-blur-sm">
        <div className="px-5 py-2 flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <PassBrand size="sm" />
          </div>

          {/* Center — proposal title */}
          <div className="min-w-0 flex-1 flex flex-col items-center justify-center px-4">
            <p className="text-[13px] font-semibold text-ds-text truncate max-w-[52rem]">
              {proposalData.title || 'Generated Proposal'}
            </p>
            {proposalData.overallConfidence != null && (
              <p className="mt-0.5 font-mono text-[10px] text-ds-text-subtle">
                {proposalData.overallConfidence}% confidence
              </p>
            )}
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
              onClick={() => setOutlineOpen((v) => !v)}
              title="Toggle outline"
            >
              <ListNumbers className="h-3.5 w-3.5" weight="bold" aria-hidden />
              Outline
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
              onClick={handleExportDocx}
              disabled={exportBusy}
            >
              <DownloadSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
              {exportBusy ? 'Preparing…' : 'Download .docx'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
              onClick={handleStartOver}
            >
              <ArrowLeft className="h-3 w-3" weight="bold" aria-hidden />
              Start over
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body: canvas + outline sidebar ────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-ds-page">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[780px]">
            <ProposalEditor
              ref={editorRef}
              proposal={proposalData}
              baa={STUB_BAA}
              onSave={async () => {}}
              readOnly={false}
              effectiveRole="admin"
              disableFloatingSelectionToolbar={false}
            />
          </div>
        </div>

        {/* Outline sidebar */}
        {outlineOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 bg-black/30 lg:hidden"
              onClick={() => setOutlineOpen(false)}
              aria-label="Close outline"
            />
            <aside className="fixed right-0 top-[57px] z-30 h-[calc(100vh-57px)] w-[280px] border-l border-ds-border bg-ds-surface overflow-y-auto lg:static lg:top-0 lg:h-auto lg:z-auto">
              <div className="px-4 py-4 border-b border-ds-border">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
                  Outline
                </p>
              </div>
              <ul className="py-2">
                {sections.map((s, idx) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleScrollToSection(s.id)}
                      className="w-full px-4 py-2 text-left hover:bg-ds-shell/60 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-[2px] font-mono text-[10px] text-ds-text-subtle tabular-nums w-6 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-ds-text truncate">{s.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {s.confidence != null && (
                              <span className="font-mono text-[10px] text-ds-text-muted">
                                {s.confidence}% confidence
                              </span>
                            )}
                            {s.required && (
                              <span className="border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
