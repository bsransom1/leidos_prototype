'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassBrand } from '@/components/ui/app-shell';
import ProposalGenerationLoader from '@/components/ProposalGenerationLoader';
import { getDemoBaa, getDemoOrgContext, saveDemoProposal, clearDemoState } from '@/lib/demo-state';
import { Button } from '@/components/ui/button';

export default function DemoGeneratePage() {
  const router = useRouter();
  const [baa, setBaa] = useState<object | null>(null);
  const [orgContext, setOrgContext] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Guard: must have both prior steps completed
  useEffect(() => {
    const b = getDemoBaa();
    const o = getDemoOrgContext();
    if (!b || !o) {
      router.replace('/demo/upload');
      return;
    }
    setBaa(b);
    setOrgContext(o);
    setReady(true);
  }, [router]);

  const handleComplete = (proposal: any) => {
    saveDemoProposal(proposal);
    router.push('/demo/proposal');
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  const handleRetry = () => {
    clearDemoState();
    router.push('/demo/upload');
  };

  return (
    <div className="min-h-screen bg-ds-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-ds-border bg-ds-header">
        <div className="flex items-center justify-between px-6 py-3">
          <PassBrand size="sm" />
          {/* No back button during generation — intentional */}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ds-text-muted">
            Step 3 of 3
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ds-accent">
            Step 3 of 3
          </p>
          <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ds-text">
            Generating Proposal
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ds-text-secondary">
            Claude is analyzing the BAA requirements and generating a structured proposal draft
            tailored to your organization.
          </p>
        </div>

        {error ? (
          <div className="border border-red-800/50 bg-red-950/30 p-6 text-center">
            <p className="mb-1 text-[13px] font-semibold text-red-300">Generation failed</p>
            <p className="mb-5 text-[12px] text-ds-text-muted">{error}</p>
            <Button type="button" variant="secondary" onClick={handleRetry}>
              ← Try again
            </Button>
          </div>
        ) : ready && baa && orgContext ? (
          <ProposalGenerationLoader
            baa={baa}
            organizationContext={orgContext}
            demoMode
            onComplete={handleComplete}
            onError={handleError}
          />
        ) : null}
      </main>
    </div>
  );
}
