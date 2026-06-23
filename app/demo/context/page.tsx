'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PassBrand, BackLink } from '@/components/ui/app-shell';
import OrganizationContextJSONUpload from '@/components/OrganizationContextJSONUpload';
import { getDemoBaa, saveDemoOrgContext } from '@/lib/demo-state';
import type { BAA, OrganizationContext } from '@/types';
import type { OrganizationContextJSON } from '@/types/organization-context';

export default function DemoContextPage() {
  const router = useRouter();
  const [baa, setBaa] = useState<BAA | null>(null);
  const [validatedJson, setValidatedJson] = useState<OrganizationContextJSON | null>(null);

  useEffect(() => {
    const stored = getDemoBaa();
    if (!stored) {
      router.replace('/demo/upload');
      return;
    }
    setBaa(stored as BAA);
  }, [router]);

  const handleContinue = () => {
    if (!validatedJson) return;
    saveDemoOrgContext(validatedJson);
    router.push('/demo/generate');
  };

  if (!baa) return null;

  return (
    <div className="min-h-screen bg-ds-page">
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

        <OrganizationContextJSONUpload
          baa={baa}
          hideTemplateDownload
          continueLabel="Continue to generation →"
          onValidatedJson={setValidatedJson}
          onSubmit={(_context: OrganizationContext) => {
            /* full JSON saved via onValidatedJson on continue */
          }}
          onContinue={handleContinue}
        />
      </main>
    </div>
  );
}
