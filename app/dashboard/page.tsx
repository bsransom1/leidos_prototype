import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './dashboard-client';

export interface EnrichedProposal {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  // extracted from baa_input
  baaTitle?: string;
  baaDeadline?: string;
  noticeNumber?: string;
  // extracted from generated_output
  confidence?: number;
  sectionCount?: number;
  // collaborators
  collaboratorCount: number;
  // awarded metadata
  contract_number?: string;
  period_of_performance_end?: string;
  total_contract_value?: number;
  awarded_at?: string;
  // misc
  pdf_file_name?: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: rawProposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const proposals = rawProposals || [];

  // Collaborator counts in a single query
  let collabCounts: Record<string, number> = {};
  if (proposals.length > 0) {
    const { data: collabRows } = await supabase
      .from('proposal_collaborators')
      .select('proposal_id')
      .in('proposal_id', proposals.map((p) => p.id))
      .in('status', ['pending', 'accepted']);

    collabCounts = (collabRows || []).reduce<Record<string, number>>((acc, c) => {
      acc[c.proposal_id] = (acc[c.proposal_id] || 0) + 1;
      return acc;
    }, {});
  }

  // Enrich each proposal
  const enriched: EnrichedProposal[] = proposals.map((p) => {
    let baaTitle: string | undefined;
    let baaDeadline: string | undefined;
    let noticeNumber: string | undefined;

    if (p.baa_input) {
      try {
        const baa = JSON.parse(p.baa_input);
        baaTitle = baa.title ?? undefined;
        // grab first deadline if present
        const dl = baa.deadlines;
        if (Array.isArray(dl) && dl.length > 0) {
          baaDeadline = dl[0]?.date ?? dl[0] ?? undefined;
        }
        // notice number array or single string
        const nn = baa.noticeNumbers;
        if (Array.isArray(nn) && nn.length > 0) noticeNumber = nn[0];
        else if (typeof nn === 'string') noticeNumber = nn;
      } catch {
        // malformed JSON — skip silently
      }
    }

    let confidence: number | undefined;
    let sectionCount: number | undefined;
    if (p.generated_output) {
      try {
        const gen = JSON.parse(p.generated_output);
        confidence = typeof gen.overallConfidence === 'number' ? gen.overallConfidence : undefined;
        sectionCount = Array.isArray(gen.sections) ? gen.sections.length : undefined;
      } catch {
        // malformed JSON — skip silently
      }
    }

    return {
      id: p.id,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      baaTitle,
      baaDeadline,
      noticeNumber,
      confidence,
      sectionCount,
      collaboratorCount: collabCounts[p.id] ?? 0,
      contract_number: p.contract_number ?? undefined,
      period_of_performance_end: p.period_of_performance_end ?? undefined,
      total_contract_value: p.total_contract_value ?? undefined,
      awarded_at: p.awarded_at ?? undefined,
      pdf_file_name: p.pdf_file_name ?? undefined,
    };
  });

  return <DashboardClient user={user} proposals={enriched} />;
}
