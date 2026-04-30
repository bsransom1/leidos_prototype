import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
      <path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z" />
    </svg>
  );
}

function FileDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
      <path d="M216,112V88a56.06,56.06,0,0,0-56-56H88A56.06,56.06,0,0,0,32,88V168a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V136A8,8,0,0,0,216,112ZM176,216H112V144h64Zm32-56a40,40,0,0,1-8,23.93V143.31A15.86,15.86,0,0,0,192,128H112a16,16,0,0,0-16,16v75.93A40,40,0,0,1,88,32h72a40,40,0,0,1,40,40Z" />
    </svg>
  );
}

export default async function ProjectHubPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: proposal, error } = await supabase.from('proposals').select('id, title, status').eq('id', projectId).single();

  if (error || !proposal) redirect('/dashboard');

  if (proposal.status === 'awarded') {
    redirect(`/dashboard/projects/${projectId}/pm`);
  }

  return (
    <div className="min-h-screen bg-ds-page">
      <header className="border-b border-ds-border bg-ds-header/90 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-base font-semibold tracking-tight text-ds-text">{proposal.title}</h1>
        <p className="mt-1 mono text-[11px] uppercase tracking-[0.1em] text-ds-text-muted">Pre-award workspace</p>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-ds-lg border border-ds-border bg-ds-surface p-8 shadow-ds-md">
          <p className="mb-6 text-[15px] leading-relaxed text-ds-text-secondary">
            This solicitation is not flagged as awarded yet. Resume drafting or open the generated proposal
            package.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/create?id=${projectId}`}
              className="inline-flex items-center gap-2 rounded-ds-sm border border-ds-primary bg-ds-primary px-5 py-2.5 text-xs font-semibold text-white shadow-ds-sm hover:brightness-110"
            >
              Continue drafting
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/proposal/${projectId}`}
              className="inline-flex items-center gap-2 rounded-ds-sm border border-ds-border bg-transparent px-5 py-2.5 text-xs font-semibold text-ds-text-secondary hover:border-ds-border-strong hover:bg-white/[0.03]"
            >
              <FileDocIcon className="h-3.5 w-3.5" />
              Open proposal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
