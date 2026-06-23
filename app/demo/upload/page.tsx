'use client';

import { useRouter } from 'next/navigation';
import { PassBrand, BackLink } from '@/components/ui/app-shell';
import PDFUpload from '@/components/PDFUpload';
import { saveDemoBaa } from '@/lib/demo-state';
import type { BAA } from '@/types';

export default function DemoUploadPage() {
  const router = useRouter();

  const handleUploadComplete = (baa: BAA) => {
    saveDemoBaa(baa as unknown as object);
  };

  const handleContinue = () => {
    router.push('/demo/context');
  };

  return (
    <div className="min-h-screen bg-ds-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-ds-border bg-ds-header">
        <div className="flex items-center justify-between px-6 py-3">
          <PassBrand size="sm" />
          <BackLink href="/demo">← Back to overview</BackLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
        <div className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-accent">
            Step 1 of 3
          </p>
          <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ds-text">Upload BAA</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ds-text-secondary">
            Upload a government BAA or RFP in PDF format. The system will extract requirements,
            deadlines, and structure.
          </p>
          <p className="mt-3 text-[12px] text-ds-text-muted">
            Don&apos;t have one?{' '}
            <a
              href="/demo-assets/DARPA-PA-26-02Q.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ds-accent underline underline-offset-2 hover:text-ds-text transition-colors"
            >
              Download the sample BAA
            </a>
          </p>
        </div>

        <PDFUpload onUploadComplete={handleUploadComplete} onContinue={handleContinue} />
      </main>
    </div>
  );
}
