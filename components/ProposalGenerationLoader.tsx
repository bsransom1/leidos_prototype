'use client';

import { useEffect, useState, useRef } from 'react';
import { CircleNotch, CheckCircle } from '@phosphor-icons/react';

interface ProposalGenerationLoaderProps {
  onComplete: (proposal: any) => void;
  onError: (error: string) => void;
  baa: any;
  organizationContext: any;
  /** When set, server enforces editor/admin role before streaming generation. */
  proposalId?: string;
}

/** A log entry is either a section header or a chunk line under a section */
type LogEntry =
  | { kind: 'section'; title: string; index: number; total: number }
  | { kind: 'chunk'; text: string; partial?: boolean };

export default function ProposalGenerationLoader({
  onComplete,
  onError,
  baa,
  organizationContext,
  proposalId,
}: ProposalGenerationLoaderProps) {
  const [progress, setProgress]       = useState(0);
  const [message, setMessage]         = useState('Initializing proposal generation...');
  const [isGenerating, setIsGenerating] = useState(true);
  const [log, setLog]                 = useState<LogEntry[]>([]);
  const logRef                        = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever log changes
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    const generateProposal = async () => {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        setProgress(5);
        setMessage('Connecting to API...');

        const response = await fetch('/api/generate-proposal-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baa, organizationContext, proposalId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to start proposal generation: ${response.status} ${errorText}`);
        }

        reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response stream available');

        timeoutId = setTimeout(() => {
          reader?.cancel();
        }, 300000);

        let buffer = '';
        let hasReceivedData = false;
        let lastProgressTime = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (timeoutId) clearTimeout(timeoutId);
            break;
          }

          hasReceivedData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              lastProgressTime = Date.now();

              if (data.type === 'progress') {
                setProgress(data.progress);
                setMessage(data.message);

              } else if (data.type === 'section-start') {
                // New section banner in the log
                setLog((prev) => [
                  ...prev,
                  {
                    kind: 'section',
                    title: data.sectionTitle,
                    index: data.sectionIndex,
                    total: data.totalSections,
                  },
                ]);

              } else if (data.type === 'chunk-update') {
                // Append or update the last chunk line under the current section
                const text = `chunks ${data.chunkCount}  /  ${Number(data.totalChars).toLocaleString()} chars`;
                setLog((prev) => {
                  const last = prev[prev.length - 1];
                  // Replace last chunk line (same section) so the count rolls up, not appends
                  if (last?.kind === 'chunk') {
                    return [...prev.slice(0, -1), { kind: 'chunk', text }];
                  }
                  return [...prev, { kind: 'chunk', text }];
                });

              } else if (data.type === 'complete') {
                setProgress(100);
                setMessage('Proposal generation complete');
                setIsGenerating(false);
                if (timeoutId) clearTimeout(timeoutId);
                setTimeout(() => onComplete(data.data), 500);
                return;

              } else if (data.type === 'error') {
                if (timeoutId) clearTimeout(timeoutId);
                throw new Error(data.error || data.details || 'Failed to generate proposal');
              }
            } catch (e: any) {
              // Skip invalid JSON lines silently
            }
          }

          if (hasReceivedData && Date.now() - lastProgressTime > 30000) {
            setMessage('Stream appears stuck — waiting…');
          }
        }

        if (!hasReceivedData) throw new Error('No data received from stream');

      } catch (error: any) {
        setIsGenerating(false);
        if (timeoutId) clearTimeout(timeoutId);
        onError(error.message || 'Failed to generate proposal');
      } finally {
        try { reader?.releaseLock(); } catch { /* ignore */ }
      }
    };

    generateProposal();
  }, [baa, organizationContext, onComplete, onError]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-text-muted">
              Generation progress
            </span>
            <span className="mono text-[11px] font-semibold tabular-nums text-ds-text-secondary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden border border-ds-border bg-ds-shell/65">
            <div
              className="h-2 bg-emerald-500/85 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status line */}
        <div className="mb-5 flex items-center gap-2.5">
          {isGenerating ? (
            <CircleNotch className="h-4 w-4 shrink-0 animate-spin text-emerald-400" weight="bold" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" weight="bold" />
          )}
          <p className="mono text-[11px] text-ds-text-secondary">{message}</p>
          {isGenerating && baa?.structure && (
            <span className="mono ml-auto text-[10px] text-ds-text-muted">
              {baa.structure.length} sections
            </span>
          )}
        </div>

        {/* Stream log — visible once any section-start fires */}
        {log.length > 0 && (
          <div className="border border-ds-border bg-ds-page shadow-ds-md">
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 border-b border-ds-border bg-ds-header/80 px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/75" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <span className="mono text-[10px] uppercase tracking-[0.1em] text-ds-text-subtle">
                generation · stream log
              </span>
            </div>

            <div
              ref={logRef}
              className="max-h-52 overflow-y-auto px-4 py-3"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(80,110,150,0.5) transparent',
              }}
            >
              {log.map((entry, i) =>
                entry.kind === 'section' ? (
                  /* Section header row */
                  <div
                    key={i}
                    className="mt-3 first:mt-0 mb-1 flex items-center gap-2"
                  >
                    <span className="mono shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-ds-accent/80">
                      {String(entry.index).padStart(2, '0')}/{String(entry.total).padStart(2, '0')}
                    </span>
                    <div className="h-px flex-1 bg-ds-border/60" />
                    <span className="mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary">
                      {entry.title}
                    </span>
                    <div className="h-px flex-1 bg-ds-border/60" />
                  </div>
                ) : (
                  /* Chunk line */
                  <div
                    key={i}
                    className="mono flex items-center gap-2 py-0.5 text-[10px] text-emerald-300/80"
                  >
                    <span className="text-emerald-500/60">▸</span>
                    <span className="tabular-nums">{entry.text}</span>
                    {i === log.length - 1 && isGenerating && (
                      <span className="animate-pulse text-emerald-400">▋</span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Pulse dots while generating */}
        {isGenerating && (
          <div className="mt-5 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500/70"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
