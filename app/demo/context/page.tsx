'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { UploadSimple, CheckCircle, FileText } from '@phosphor-icons/react';
import { PassBrand, BackLink } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { getDemoBaa, saveDemoOrgContext } from '@/lib/demo-state';

export default function DemoContextPage() {
  const router = useRouter();
  const [parsed, setParsed] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Guard: must have BAA from previous step
  useEffect(() => {
    if (typeof window !== 'undefined' && !getDemoBaa()) {
      router.replace('/demo/upload');
    }
  }, [router]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const obj = JSON.parse(text);
        if (!obj || typeof obj !== 'object' || !('organization' in obj)) {
          setError('Invalid org context file. Must contain an "organization" key.');
          setParsed(null);
          setFileName(null);
          return;
        }
        setParsed(obj);
        setFileName(file.name);
      } catch {
        setError('Could not parse JSON. Make sure the file is valid JSON.');
        setParsed(null);
        setFileName(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    maxFiles: 1,
  });

  const handleContinue = () => {
    if (!parsed) return;
    saveDemoOrgContext(parsed);
    router.push('/demo/generate');
  };

  return (
    <div className="min-h-screen bg-ds-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-ds-border bg-ds-header">
        <div className="flex items-center justify-between px-6 py-3">
          <PassBrand size="sm" />
          <BackLink href="/demo/upload">← Back to BAA upload</BackLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
        <div className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-accent">
            Step 2 of 3
          </p>
          <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ds-text">
            Organization Context
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ds-text-secondary">
            Upload your organization context as a JSON file. This tells the AI about your team,
            capabilities, and research focus.
          </p>
          <p className="mt-3 text-[12px] text-ds-text-muted">
            Don&apos;t have one?{' '}
            <a
              href="/demo-assets/org-context-sample.json"
              download
              className="text-ds-accent underline underline-offset-2 hover:text-ds-text transition-colors"
            >
              Download the sample org context JSON
            </a>
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-ds-accent/70 bg-ds-accent/10'
              : parsed
                ? 'border-emerald-800/65 bg-emerald-950/30'
                : 'border-ds-border bg-ds-shell/35 hover:border-ds-border-strong hover:bg-white/[0.02]'
          }`}
        >
          <input {...getInputProps()} />

          {parsed ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" weight="bold" aria-hidden />
              <div className="text-left">
                <p className="text-[13px] font-semibold text-emerald-700">
                  Context loaded — {fileName}
                </p>
                <p className="font-mono text-[11px] text-ds-text-muted">
                  Drop a different file to replace
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center border border-ds-border bg-ds-surface-elevated/40">
                <FileText className="h-5 w-5 text-ds-text-muted" weight="bold" aria-hidden />
              </div>
              <p className="mb-2 text-[14px] font-semibold text-ds-text">
                {isDragActive ? 'Release to load' : 'Drag & drop org context JSON'}
              </p>
              <span className="font-mono border border-ds-primary bg-ds-primary px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Browse file
              </span>
            </div>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-red-400">
            <span className="font-semibold">Error:</span> {error}
          </p>
        )}

        {/* Continue */}
        {parsed && (
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="primary" onClick={handleContinue}>
              Continue to generation →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
