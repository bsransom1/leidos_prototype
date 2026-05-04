'use client';

import { useState } from 'react';
import { CheckCircle, WarningCircle, XCircle, TrendUp, Medal, ChatText, DownloadSimple } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import type { Proposal, BAA, ProposalSection } from '@/types';
import ConfidenceScore from './ConfidenceScore';
import { buildProposalSubmissionDocx, downloadProposalDocx } from '@/lib/proposal-export-docx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface ProposalViewProps {
  proposal: Proposal;
  baa: BAA;
  onAward: () => void;
}

export default function ProposalView({ proposal, baa, onAward }: ProposalViewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const handleDownloadSubmission = async () => {
    if (!proposal.sections?.length) {
      alert('No proposal sections to export yet.');
      return;
    }
    setDownloadBusy(true);
    try {
      const blob = await buildProposalSubmissionDocx(proposal, baa);
      downloadProposalDocx(blob, proposal.title);
    } catch (e) {
      console.error(e);
      alert('Could not generate the Word document. Try again.');
    } finally {
      setDownloadBusy(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'strong':
        return <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" weight="bold" />;
      case 'needs-improvement':
        return <WarningCircle className="h-5 w-5 shrink-0 text-amber-300" weight="bold" />;
      case 'weak':
        return <XCircle className="h-5 w-5 shrink-0 text-orange-400" weight="bold" />;
      default:
        return <XCircle className="h-5 w-5 shrink-0 text-red-400" weight="bold" />;
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-ds-border pb-6">
        <div className="mb-4 flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="ds-h3 mb-2 text-ds-text">{proposal.title}</h2>
            <p className="mono text-[13px] text-ds-text-muted">Source solicitation: {baa.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" disabled={downloadBusy || !proposal.sections?.length} className="!text-xs" onClick={handleDownloadSubmission}>
              <DownloadSimple className="h-3.5 w-3.5" weight="bold" />
              {downloadBusy ? 'Preparing…' : 'Export submission package'}
            </Button>
            <Button type="button" variant="primary" className="!border-emerald-600 !bg-emerald-600 !shadow-none hover:!bg-emerald-700" onClick={onAward}>
              <Medal className="h-3.5 w-3.5" weight="bold" />
              Mark awarded
            </Button>
          </div>
        </div>

        <ConfidenceScore score={proposal.overallConfidence} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-ds-md border border-ds-border bg-ds-surface-elevated/50 p-3 shadow-ds-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ds-text-muted">
              Proposal sections
            </h3>
            <div className="space-y-2">
              {proposal.sections && proposal.sections.length > 0 ? (
                proposal.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSection(section.id)}
                    className={cn(
                      'w-full rounded-ds-sm border p-3 text-left transition-colors',
                      selectedSection === section.id
                        ? 'border-ds-accent/60 bg-ds-accent/10 shadow-ds-sm'
                        : 'border-ds-border bg-ds-page/25 hover:border-ds-border-strong'
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-xs font-medium text-ds-text">{section.title}</span>
                      <span className="ml-1 shrink-0">{getStatusIcon(section.status)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="mono text-[11px] text-ds-text-muted">{section.confidence || 0}%</span>
                      {section.feedback && section.feedback.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ds-info">
                          <ChatText className="h-3 w-3" weight="bold" />
                          {section.feedback.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-ds-text-muted">
                  No sections yet — generation may still be running.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedSection ? (
            (() => {
              const section = proposal.sections?.find((s) => s.id === selectedSection);
              if (!section) {
                return (
                  <EmptyPanel>
                    Section not found.
                  </EmptyPanel>
                );
              }
              return <SectionDetail section={section} />;
            })()
          ) : (
            <EmptyPanel>Select a section to inspect drafting quality and citations.</EmptyPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-ds-md border border-dashed border-ds-border bg-ds-page/30 py-12 text-center">
      <p className="text-sm text-ds-text-muted">{children}</p>
    </div>
  );
}

function SectionDetail({ section }: { section: ProposalSection }) {
  const getLocalStatusColor = (status: string) => {
    switch (status) {
      case 'strong':
        return 'border-emerald-300 bg-emerald-50 text-emerald-700';
      case 'needs-improvement':
        return 'border-amber-300 bg-amber-50 text-amber-700';
      case 'weak':
        return 'border-orange-300 bg-orange-50 text-orange-700';
      default:
        return 'border-red-300 bg-red-50 text-red-600';
    }
  };

  return (
    <div className="rounded-ds-md border border-ds-border bg-ds-page/35 p-5 shadow-ds-sm">
      <div className="mb-4 pb-4 border-b border-ds-border">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ds-text">{section.title}</h3>
          <span className={`rounded-ds-sm border px-2 py-0.5 text-xs font-medium ${getLocalStatusColor(section.status)}`}>
            {section.status.replace('-', ' ')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendUp className="h-3.5 w-3.5 text-ds-text-muted" weight="bold" />
            <span className="text-xs text-ds-text-muted">
              Confidence: <span className="mono font-semibold text-ds-text">{section.confidence ?? 0}%</span>
            </span>
          </div>
          {section.required && (
            <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
              Required
            </span>
          )}
        </div>
      </div>

      <div className="mb-5">
        <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">Draft body</h4>
        <div className="rounded-ds-md border border-ds-border bg-ds-shell/40 p-4">
          <div className="leading-relaxed [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-ds-text [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ds-text [&_h3]:mt-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-ds-text text-[13px] text-ds-text-secondary">
            {section.content ? (
              <ReactMarkdown
                components={{
                  strong: ({ children }) => <strong className="font-semibold text-ds-text">{children}</strong>,
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  ul: ({ children, ...props }: { children?: React.ReactNode; depth?: number }) => {
                    const depth = (props as { depth?: number }).depth || 0;
                    const indentClass = depth === 0 ? 'ml-6' : depth === 1 ? 'ml-10' : 'ml-14';
                    return (
                      <ul className={`list-outside list-disc ${indentClass} mb-3 space-y-1.5 last:mb-0`}>{children}</ul>
                    );
                  },
                  ol: ({ children, ...props }: { children?: React.ReactNode; depth?: number }) => {
                    const depth = (props as { depth?: number }).depth || 0;
                    const indentClass = depth === 0 ? 'ml-6' : depth === 1 ? 'ml-10' : 'ml-14';
                    return (
                      <ol className={`list-outside list-decimal ${indentClass} mb-3 space-y-1.5 last:mb-0`}>{children}</ol>
                    );
                  },
                  li: ({ children }) => <li className="pl-1.5 leading-relaxed">{children}</li>,
                  h1: ({ children }) => (
                    <h1 className="mb-2 mt-4 text-base font-semibold text-ds-text first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-2 mt-3 text-sm font-semibold text-ds-text first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-1.5 mt-2 text-xs font-semibold text-ds-text first:mt-0">{children}</h3>
                  ),
                  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-700">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-4 border-ds-border pl-3 italic text-ds-text-muted">{children}</blockquote>
                  ),
                  hr: () => <hr className="my-4 border-t border-ds-border" />,
                }}
              >
                {section.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-ds-text-muted">No draft text for this section.</p>
            )}
          </div>
        </div>
      </div>

      {section.feedback && section.feedback.length > 0 && (
        <div>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
            Analysis & recommendations
          </h4>
          <div className="space-y-3">
            {section.feedback.map((fb, index) => (
              <div
                key={fb.id || `feedback-${section.id}-${index}`}
                className={cn(
                  'rounded-ds-sm border p-3',
                  fb.type === 'strength' && 'border-emerald-200 bg-emerald-50',
                  fb.type === 'improvement' && 'border-blue-200 bg-blue-50',
                  fb.type === 'removal' && 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start gap-2">
                  {fb.type === 'strength' && <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" weight="bold" />}
                  {fb.type === 'improvement' && <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" weight="bold" />}
                  {fb.type === 'removal' && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" weight="bold" />}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-xs leading-relaxed',
                        fb.type === 'strength' && 'text-emerald-100',
                        fb.type === 'improvement' && 'text-blue-100',
                        fb.type === 'removal' && 'text-red-100'
                      )}
                    >
                      {fb.text}
                    </p>
                    {fb.suggestion && (
                      <p className="mt-2 text-[11px] text-ds-text-muted">Recommendation: {fb.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
