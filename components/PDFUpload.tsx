'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadSimple,
  CircleNotch,
  CheckCircle,
  FileText,
  CalendarBlank,
  Cpu,
  Hash,
  Tree,
  Target,
  ChartBar,
  BookOpen,
  ArrowRight,
} from '@phosphor-icons/react';
import { BAA, Deadline } from '@/types';
import { Badge } from '@/components/ui/badge';

interface PDFUploadProps {
  onUploadComplete: (baa: BAA) => void;
  onContinue?: () => void;
}

function formatDeadlineDay(isoLike: Deadline['date']): string {
  const d = typeof isoLike === 'string' ? new Date(isoLike) : isoLike;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function deadlineTone(t: Deadline['type']): 'positive' | 'info' | 'default' {
  if (t === 'submission') return 'positive';
  if (t === 'question') return 'info';
  return 'default';
}

function deadlineTypeLabel(t: Deadline['type']): string {
  if (t === 'submission') return 'SUBMIT';
  if (t === 'question') return 'Q&A';
  return 'SCHED';
}

export default function PDFUpload({ onUploadComplete, onContinue }: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedBAA, setUploadedBAA] = useState<BAA | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to parse PDF');

      const baa = await response.json();
      setUploadedBAA(baa);
    } catch (err) {
      setError('Failed to upload and parse PDF. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const chars  = uploadedBAA?.rawText?.length ?? 0;
  const pages  = uploadedBAA?.pageCount;
  const tech   = uploadedBAA?.technologySignals ?? [];
  const notices = uploadedBAA?.noticeNumbers ?? [];
  const summary = uploadedBAA?.ingestSummary?.trim();
  const deadlines = uploadedBAA?.deadlines ?? [];
  const reqs   = uploadedBAA?.requirements ?? [];
  const structure = uploadedBAA?.structure ?? [];

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-5">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-text">
          Ingest solicitation (PDF)
        </h2>
        <p className="mt-1.5 text-[13px] text-ds-text-muted">
          Extracts headings, requirement phrases, calendar cues, tech vocabulary, and program markers
          from the PDF text layer.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? 'border-ds-accent/70 bg-ds-accent/10'
            : uploadedBAA
              ? 'border-emerald-800/65 bg-emerald-950/30'
              : 'border-ds-border bg-ds-shell/35 hover:border-ds-border-strong hover:bg-white/[0.02]'
        } ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <CircleNotch className="h-5 w-5 animate-spin text-ds-primary" weight="bold" />
            <p className="mono text-[11px] uppercase tracking-[0.1em] text-ds-text-muted">
              Parsing PDF text layer…
            </p>
          </div>
        ) : uploadedBAA ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-400" weight="bold" aria-hidden />
            <div className="text-left">
              <p className="text-[13px] font-semibold text-emerald-700">Solicitation ingest complete</p>
              <p className="mono text-[11px] text-ds-text-muted">
                Review extract fidelity below — then continue to org context.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center border border-ds-border bg-ds-surface-elevated/40">
              <UploadSimple className="h-5 w-5 text-ds-text-muted" weight="bold" aria-hidden />
            </div>
            <p className="mb-2 text-[14px] font-semibold text-ds-text">
              {isDragActive ? 'Release to ingest' : 'Drag & drop solicitation PDF'}
            </p>
            <span className="mono border border-ds-primary bg-ds-primary px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              Browse file
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-600">{error}</p>
        </div>
      )}

      {/* ── Ingest profile ──────────────────────────────────────── */}
      {uploadedBAA && (
        <div className="mt-6 space-y-0 border border-ds-border bg-ds-surface shadow-ds-md">

          {/* ── Title + meta badges ─────────────────────────────── */}
          <div className="flex flex-col gap-2 border-b border-ds-border bg-ds-header/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-ds-accent" aria-hidden />
                <p className="truncate text-[13px] font-semibold leading-snug text-ds-text">
                  {uploadedBAA.title || uploadedBAA.fileName}
                </p>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-ds-text-muted">{uploadedBAA.fileName}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              {typeof pages === 'number' && pages > 0 && (
                <Badge tone="info">
                  <BookOpen className="mr-1 inline h-3 w-3" aria-hidden />{pages} pg
                </Badge>
              )}
              <Badge tone="default">
                <ChartBar className="mr-1 inline h-3 w-3" weight="bold" aria-hidden />{chars.toLocaleString()} ch
              </Badge>
              <Badge tone="accent">
                <Tree className="mr-1 inline h-3 w-3" weight="bold" aria-hidden />{structure.length} toc
              </Badge>
              <Badge tone="warning">
                <Target className="mr-1 inline h-3 w-3" aria-hidden />{reqs.length} req
              </Badge>
              <Badge tone="positive">
                <CalendarBlank className="mr-1 inline h-3 w-3" weight="bold" aria-hidden />{deadlines.length} dates
              </Badge>
            </div>
          </div>

          {/* ── Narrative + signals ─────────────────────────────── */}
          <div className="grid gap-0 border-b border-ds-border lg:grid-cols-[1fr_180px]">
            {/* Narrative + notices + tech */}
            <div className="space-y-4 border-b border-ds-border px-5 py-4 lg:border-b-0 lg:border-r">
              {summary ? (
                <div>
                  <p className="mono mb-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                    Opening corpus
                  </p>
                  <p className="text-[12px] leading-relaxed text-ds-text-secondary">{summary}</p>
                </div>
              ) : (
                <p className="text-[12px] italic text-ds-text-muted">
                  Narrative unavailable — PDF may be a scan with no text layer.
                </p>
              )}

              {notices.length > 0 && (
                <div>
                  <p className="mono mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                    <Hash className="h-3 w-3" aria-hidden />
                    Program / notice IDs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {notices.map((n) => (
                      <span
                        key={n}
                        className="mono border border-ds-border-strong bg-black/25 px-2 py-px text-[10px] text-ds-text-secondary"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tech.length > 0 && (
                <div>
                  <p className="mono mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                    <Cpu className="h-3 w-3" aria-hidden />
                    Mission-domain signals
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.map((t) => (
                      <Badge key={t} tone="accent" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compact stats column */}
            <div className="px-5 py-4">
              <p className="mono mb-2 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                Coverage
              </p>
              <table className="w-full text-[11px]">
                <tbody>
                  {([
                    ['Sections',  uploadedBAA.sections?.length ?? 0],
                    ['Req phrases', reqs.length],
                    ['Dates',     deadlines.length],
                    ['TOC nodes', structure.length],
                    ...(typeof pages === 'number' ? [['Pages' as string, pages as number]] : []),
                  ] as [string, number][]).map(([label, val]) => (
                    <tr key={label} className="border-b border-ds-border/40 last:border-none">
                      <td className="py-1.5 pr-3 font-mono text-ds-text-muted">{label}</td>
                      <td className="py-1.5 text-right font-mono font-semibold tabular-nums text-ds-text">
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Critical dates: compact table rows ──────────────── */}
          {deadlines.length > 0 && (
            <div className="border-b border-ds-border">
              <div className="border-b border-ds-border/50 bg-ds-header/40 px-5 py-2">
                <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                  <CalendarBlank className="h-3 w-3" weight="bold" aria-hidden />
                  Critical dates
                </p>
              </div>
              <table className="w-full">
                <tbody>
                  {deadlines.map((d, i) => (
                    <tr
                      key={d.id ?? i}
                      className="border-b border-ds-border/40 last:border-none hover:bg-white/[0.02]"
                    >
                      <td className="w-16 px-5 py-2.5">
                        <Badge tone={deadlineTone(d.type)} className="whitespace-nowrap">
                          {deadlineTypeLabel(d.type)}
                        </Badge>
                      </td>
                      <td className="w-48 px-3 py-2.5 font-mono text-[11px] tabular-nums text-ds-text">
                        {formatDeadlineDay(d.date)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] leading-snug text-ds-text-muted">
                        {d.description || 'Adjacent calendar language in solicitation.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TOC + Requirements ───────────────────────────────── */}
          {(structure.length > 0 || reqs.length > 0) && (
            <div className="grid gap-0 md:grid-cols-2">
              {structure.length > 0 && (
                <div className={reqs.length > 0 ? 'border-b border-ds-border md:border-b-0 md:border-r' : ''}>
                  <div className="border-b border-ds-border/50 bg-ds-header/40 px-5 py-2">
                    <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                      <Tree className="h-3 w-3" weight="bold" aria-hidden />
                      TOC scan ({structure.length} nodes)
                    </p>
                  </div>
                  <ul className="max-h-[180px] overflow-y-auto px-5 py-3">
                    {structure.slice(0, 14).map((line, idx) => (
                      <li
                        key={`${idx}-${line.slice(0, 40)}`}
                        className="flex gap-2.5 py-1 text-[11px] leading-snug text-ds-text-secondary"
                      >
                        <span className="mono w-5 shrink-0 text-right text-[10px] text-ds-accent/80">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 truncate">{line}</span>
                      </li>
                    ))}
                    {structure.length > 14 && (
                      <li className="mono py-1 text-[10px] text-ds-text-muted">
                        +{structure.length - 14} more…
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {reqs.length > 0 && (
                <div>
                  <div className="border-b border-ds-border/50 bg-ds-header/40 px-5 py-2">
                    <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ds-text-muted">
                      <Target className="h-3 w-3" aria-hidden />
                      Req phrases ({reqs.length} found)
                    </p>
                  </div>
                  <ul className="max-h-[180px] overflow-y-auto px-5 py-3 space-y-2">
                    {reqs.slice(0, 8).map((r) => (
                      <li
                        key={r.id}
                        className="border-l-2 border-ds-accent/50 pl-2.5 text-[11px] leading-snug text-ds-text-muted"
                      >
                        {r.text.slice(0, 200)}{r.text.length > 200 ? '…' : ''}
                      </li>
                    ))}
                    {reqs.length > 8 && (
                      <li className="mono text-[10px] text-ds-text-muted">
                        +{reqs.length - 8} additional phrases…
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Continue button */}
      {uploadedBAA && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onUploadComplete(uploadedBAA);
              if (onContinue) onContinue();
            }}
            className="mono inline-flex items-center gap-2 border border-emerald-800/65 bg-emerald-900/50 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-100 shadow-ds-sm transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ds-accent"
          >
            Continue to org context
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
