'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadSimple, FileText, ChartBar, CheckCircle, ArrowLeft } from '@phosphor-icons/react';
import { AppFooter, AppHeader, BackLink } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import PDFUpload from '@/components/PDFUpload';
import OrganizationContextJSONUpload from '@/components/OrganizationContextJSONUpload';
import ProposalEditor, { type ProposalEditorHandle } from '@/components/ProposalEditor';
import ConfidenceScore from '@/components/ConfidenceScore';
import { DownloadSimple, FloppyDisk, Medal, ListNumbers } from '@phosphor-icons/react';
import type { Editor } from '@tiptap/core';
import ProposalGenerationLoader from '@/components/ProposalGenerationLoader';
import { BAA, OrganizationContext, Proposal, User } from '@/types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { canEdit, isAdmin, type PmRole } from '@/lib/pm-access';
import { buildProposalSubmissionDocx, downloadProposalDocx } from '@/lib/proposal-export-docx';

interface CreateProposalClientProps {
  user: SupabaseUser;
  existingProposal?: any;
  effectiveRole: PmRole;
}

export default function CreateProposalClient({ user, existingProposal, effectiveRole }: CreateProposalClientProps) {
  const router = useRouter();
  const [proposalId, setProposalId] = useState<string | null>(existingProposal?.id || null);
  
  // Initialize state from existing proposal if available
  const initializeFromProposal = () => {
    if (existingProposal) {
      console.log('Initializing from existing proposal:', {
        id: existingProposal.id,
        current_step: existingProposal.current_step,
        has_baa: !!existingProposal.baa_input,
        has_proposal: !!existingProposal.generated_output,
      });
      
      let parsedBAA: BAA | null = null;
      let parsedProposal: Proposal | null = null;
      
      if (existingProposal.baa_input) {
        try {
          parsedBAA = JSON.parse(existingProposal.baa_input);
          console.log('✅ Parsed BAA successfully');
          console.log('  BAA title:', parsedBAA?.title);
          console.log('  BAA has rawText:', !!(parsedBAA?.rawText));
          console.log('  BAA rawText length:', (parsedBAA?.rawText && typeof parsedBAA.rawText === 'string') ? parsedBAA.rawText.length : 0);
          console.log('  BAA sections count:', (parsedBAA?.sections && Array.isArray(parsedBAA.sections)) ? parsedBAA.sections.length : 0);
          console.log('  BAA structure count:', (parsedBAA?.structure && Array.isArray(parsedBAA.structure)) ? parsedBAA.structure.length : 0);
          
          // Warn if rawText is missing
          if (!parsedBAA?.rawText || parsedBAA.rawText.length < 100) {
            console.warn('⚠️  WARNING: BAA rawText is missing or too short!');
            console.warn('  This will cause proposal generation to fail to use BAA content.');
            console.warn('  rawText length:', parsedBAA?.rawText?.length || 0);
          }
        } catch (e) {
          console.error('❌ Failed to parse BAA:', e);
        }
      }
      
      if (existingProposal.generated_output) {
        try {
          const parsed: Proposal = JSON.parse(existingProposal.generated_output);
          parsedProposal = parsed;
          console.log('Parsed proposal successfully');
          console.log('Proposal sections:', parsed.sections?.length || 0);
          
          // Validate proposal structure
          if (!parsed.sections || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
            console.warn('⚠️ Proposal has no sections, creating from BAA structure');
            // Create sections from BAA structure if available
            if (parsedBAA && parsedBAA.structure) {
              parsed.sections = parsedBAA.structure.map((title: string, index: number) => ({
                id: `section-${index + 1}`,
                title,
                content: `Content for ${title} section.`,
                confidence: 75,
                status: 'needs-improvement',
                feedback: [],
                required: true,
              }));
              parsed.overallConfidence = parsed.overallConfidence || 75;
            }
            parsedProposal = parsed;
          }
        } catch (e: any) {
          console.error('Failed to parse proposal:', e);
          console.error('Proposal JSON:', existingProposal.generated_output?.substring(0, 500));
          // Create fallback proposal
          if (parsedBAA && parsedBAA.structure) {
            parsedProposal = {
              id: `proposal-${Date.now()}`,
              baaId: parsedBAA.id,
              organizationContextId: 'context-1',
              title: `Proposal for ${parsedBAA.title}`,
              sections: parsedBAA.structure.map((title: string, index: number) => ({
                id: `section-${index + 1}`,
                title,
                content: `Content for ${title} section.`,
                confidence: 75,
                status: 'needs-improvement' as const,
                feedback: [],
                required: true,
              })),
              overallConfidence: 75,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            console.log('Created fallback proposal with', parsedProposal.sections.length, 'sections');
          }
        }
      }
      
      // Parse organization context (but don't set state here - return it)
      let parsedContext: OrganizationContext | null = null;
      if (existingProposal.organization_context_json) {
        try {
          parsedContext = JSON.parse(existingProposal.organization_context_json);
        } catch (e) {
          console.error('Failed to parse organization context:', e);
        }
      }
      
      // Validate and determine the correct step based on available data
      let validatedStep: 'upload' | 'context' | 'proposal' = 'upload';
      const savedStep = existingProposal.current_step;
      
      if (parsedProposal && parsedBAA) {
        // We have both proposal and BAA - show the proposal view
        // Always show proposal step so user can view it (even if saved as 'project')
        validatedStep = 'proposal';
      } else if (parsedBAA) {
        // We have BAA but no proposal - should be at context step
        validatedStep = 'context';
      } else {
        // No BAA - should be at upload step
        validatedStep = 'upload';
      }
      
      console.log('Validated step:', validatedStep, 'from saved step:', savedStep);
      if (parsedProposal) {
        console.log('Parsed proposal sections count:', parsedProposal.sections?.length || 0);
      }
      
      const initialState = {
        step: validatedStep,
        baa: parsedBAA,
        proposal: parsedProposal,
        pdfFileName: existingProposal.pdf_file_name || null,
        organizationContext: parsedContext,
      };
      
      console.log('Initial state:', initialState);
      return initialState;
    }
    console.log('No existing proposal, starting fresh');
    return {
      step: 'upload' as const,
      baa: null,
      proposal: null,
      pdfFileName: null,
      organizationContext: null,
    };
  };

  const initialState = initializeFromProposal();
  const [step, setStep] = useState<'upload' | 'context' | 'proposal'>(initialState.step);
  const [baa, setBAA] = useState<BAA | null>(initialState.baa);
  const [organizationContext, setOrganizationContext] = useState<OrganizationContext | null>(initialState.organizationContext || null);
  const [proposal, setProposal] = useState<Proposal | null>(initialState.proposal);
  const [pdfFileName, setPdfFileName] = useState<string | null>(initialState.pdfFileName || null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Debug: Log current state when component mounts
  useEffect(() => {
    if (existingProposal) {
      console.log('CreateProposalClient mounted with existing proposal:', {
        proposalId,
        step,
        hasBAA: !!baa,
        hasProposal: !!proposal,
        existingProposalId: existingProposal?.id,
        currentStep: existingProposal.current_step,
      });
    }
  }, [existingProposal]);
  
  // Load collaborators from database
  const [collaborators, setCollaborators] = useState<User[]>([
    {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role:
        effectiveRole === 'admin' ? 'admin' : effectiveRole === 'editor' ? 'editor' : 'viewer',
      organizationId: 'org-1',
    },
  ]);

  const mergeCollaboratorsFromApi = useCallback(async () => {
    if (!proposalId) return;
    const chip: User['role'] =
      effectiveRole === 'admin' ? 'admin' : effectiveRole === 'editor' ? 'editor' : 'viewer';
    try {
      const response = await fetch(`/api/get-collaborators?proposalId=${proposalId}`, {
        cache: 'no-store',
      });
      const result = await response.json();

      if (result.success && result.data) {
        const owner: User = {
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: chip,
          organizationId: 'org-1',
        };

        const invitedUsers: User[] = result.data.map((c: any) => ({
          id: c.id,
          name: c.email.split('@')[0],
          email: c.email,
          role: c.role as User['role'],
          organizationId: 'org-1',
        }));

        setCollaborators([owner, ...invitedUsers]);
      } else if (response.status === 403) {
        setCollaborators([
          {
            id: user.id,
            name: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: chip,
            organizationId: 'org-1',
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  }, [proposalId, user.id, user.email, effectiveRole]);

  // Load collaborators when proposalId is available
  useEffect(() => {
    void mergeCollaboratorsFromApi();
  }, [mergeCollaboratorsFromApi]);

  const updateProposalStep = async (newStep: string, baaData?: BAA, orgContext?: OrganizationContext, proposalData?: Proposal) => {
    if (!proposalId) return;

    try {
      await fetch('/api/update-proposal-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          step: newStep,
          baaInput: baaData ? JSON.stringify(baaData) : undefined,
          generatedOutput: proposalData ? JSON.stringify(proposalData) : undefined,
        }),
      });
    } catch (error) {
      console.error('Failed to update proposal step:', error);
    }
  };

  const createInitialProposal = async (baaData: BAA) => {
    try {
      const response = await fetch('/api/save-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: baaData.title || 'Untitled Proposal',
          baaInput: JSON.stringify(baaData),
          status: 'draft',
          currentStep: 'context',
          pdfFileName: baaData.fileName || null,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data?.id) {
          setProposalId(result.data.id);
        }
      }
    } catch (error) {
      console.error('Failed to create initial proposal:', error);
    }
  };

  const handleBAAUploaded = async (uploadedBAA: BAA) => {
    setBAA(uploadedBAA);
    setPdfFileName(uploadedBAA.fileName || null);
    // Don't auto-advance - user clicks button in PDFUpload component
    
    // Auto-save progress
    if (proposalId) {
      await updateProposalStep('context', uploadedBAA);
    } else {
      // Create initial proposal record
      await createInitialProposal(uploadedBAA);
    }
  };

  const handleContextSubmitted = async (context: OrganizationContext) => {
    setOrganizationContext(context);
    if (baa) {
      if (proposalId && canEdit(effectiveRole)) {
        try {
          await fetch('/api/save-proposal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proposalId,
              organizationContextJson: context,
              currentStep: 'proposal',
            }),
          });
        } catch (error) {
          console.error('Failed to save organization context:', error);
        }
      }

      if (!canEdit(effectiveRole)) {
        setStep('proposal');
        setIsGenerating(false);
        return;
      }

      await updateProposalStep('proposal', baa, context);
      setIsGenerating(true);
      setStep('proposal'); // Show loading screen
    }
  };

  const handleProposalGenerated = async (proposalData: Proposal) => {
    console.log('📦 Received proposal data:', {
      title: proposalData.title,
      sectionsCount: proposalData.sections?.length || 0,
      overallConfidence: proposalData.overallConfidence,
    });
    
    // Validate proposal structure
    if (!proposalData.sections || !Array.isArray(proposalData.sections) || proposalData.sections.length === 0) {
      console.error('❌ Proposal has no sections!', proposalData);
      // Create fallback sections from BAA structure
      if (baa) {
        proposalData.sections = (baa.structure || []).map((title: string, index: number) => ({
          id: `section-${index + 1}`,
          title,
          content: `Content for ${title} section.`,
          confidence: 75,
          status: 'needs-improvement',
          feedback: [],
          required: true,
        }));
        proposalData.overallConfidence = proposalData.overallConfidence || 75;
      }
    }
    
    setProposal(proposalData);
    setIsGenerating(false);
    
    // Auto-save generated proposal
    if (proposalId && baa && organizationContext) {
      await updateProposalStep('proposal', baa, organizationContext, proposalData);
    }
  };

  const handleGenerationError = (error: string) => {
    console.error('Failed to generate proposal:', error);
    setIsGenerating(false);
    
    // Create fallback proposal so user can still see something
    if (baa) {
      const fallbackProposal: Proposal = {
        id: `proposal-${Date.now()}`,
        baaId: baa.id,
        organizationContextId: organizationContext?.id || 'context-1',
        title: `Proposal for ${baa.title}`,
        sections: (baa.structure || []).map((title: string, index: number) => ({
          id: `section-${index + 1}`,
          title,
          content: `Proposal content for ${title}. Error occurred during generation.`,
          confidence: 75,
          status: 'needs-improvement' as const,
          feedback: [],
          required: true,
        })),
        overallConfidence: 75,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProposal(fallbackProposal);
    }
  };

  const handleSaveProposal = async () => {
    if (!proposal || !baa) return;

    try {
      const response = await fetch('/api/save-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          title: proposal.title,
          baaInput: JSON.stringify(baa),
          generatedOutput: JSON.stringify(proposal),
          status: 'generated',
          currentStep: step,
          organizationContextJson: organizationContext,
          pdfFileName: pdfFileName,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to save proposal:', error);
    }
  };

  const [exportBusy, setExportBusy] = useState(false);
  const editorRef = useRef<ProposalEditorHandle>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  const handleExportDocx = async () => {
    if (!proposal || !baa || !proposal.sections?.length) {
      alert('No proposal sections to export yet.');
      return;
    }
    setExportBusy(true);
    try {
      const blob = await buildProposalSubmissionDocx(proposal, baa);
      downloadProposalDocx(blob, proposal.title);
    } catch (e) {
      console.error(e);
      alert('Could not generate the Word document. Try again.');
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-ds-page">
      <AppHeader className="sticky top-0 z-30 bg-ds-header/95 backdrop-blur-sm">
        <div className="px-5 py-2 flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex min-w-0 items-start gap-3">
            <BackLink href="/dashboard" className="mt-1.5 shrink-0">
              <ArrowLeft className="h-4 w-4" weight="bold" />
            </BackLink>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ds-text">
                {existingProposal ? 'View Proposal' : 'Create Proposal'}
              </p>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.12em] text-ds-text-muted">
                {existingProposal ? 'OPENED FROM DASHBOARD' : 'INGEST • CONTEXT • VALIDATION'}
              </p>
            </div>
          </div>

          {/* Center */}
          {step === 'proposal' && proposal && baa ? (
            <div className="min-w-0 flex-1 flex flex-col items-center justify-center px-4">
              <p className="ds-h3 truncate text-ds-text max-w-[42rem]">{proposal.title}</p>
              <div className="mt-1 flex items-center gap-2">
                {(baa.noticeNumbers?.[0] ?? '') && (
                  <span className="border border-ds-border bg-ds-shell/60 px-1.5 py-0.5 font-mono text-[9px] text-ds-text-muted uppercase tracking-wide">
                    {baa.noticeNumbers?.[0]}
                  </span>
                )}
                <span className="font-mono text-[10px] text-ds-text-subtle truncate max-w-[48rem]">
                  {baa.title || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          {/* Right */}
          {step === 'proposal' && proposal ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden lg:inline font-mono text-[10px] text-ds-text-muted">
                {proposal.overallConfidence}% confidence
              </span>
              {collaborators.length > 0 && (
                <button
                  type="button"
                  title="Collaborators"
                  onClick={(e) => editorRef.current?.openCollaborators((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
                  onDoubleClick={(e) => editorRef.current?.openCollaborators((e.currentTarget as HTMLButtonElement).getBoundingClientRect())}
                  className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-ds-sm border border-ds-border bg-ds-primary font-mono text-[10px] font-bold uppercase text-white"
                >
                  {collaborators[0]?.name?.charAt(0) ?? 'U'}
                </button>
              )}
              {canEdit(effectiveRole) && activeEditor && (
                <div className="hidden lg:flex items-center gap-1 rounded-ds-sm border border-ds-border bg-ds-surface px-1 py-0.5">
                  <button
                    type="button"
                    className="h-6 w-6 font-mono text-[11px] font-semibold text-ds-text-muted hover:text-ds-text"
                    onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleBold().run(); }}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 font-mono text-[11px] font-semibold text-ds-text-muted hover:text-ds-text italic"
                    onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleItalic().run(); }}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 font-mono text-[11px] font-semibold text-ds-text-muted hover:text-ds-text underline"
                    onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleUnderline().run(); }}
                    title="Underline"
                  >
                    U
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
                onClick={() => setOutlineOpen((v) => !v)}
              >
                <ListNumbers className="h-3.5 w-3.5" weight="bold" aria-hidden />
                Outline
              </Button>
              <div className="hidden md:flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
                  onClick={() => void handleExportDocx()}
                  disabled={exportBusy}
                >
                  <DownloadSimple className="h-3.5 w-3.5" weight="bold" aria-hidden />
                  {exportBusy ? 'Preparing…' : 'Export'}
                </Button>
                {canEdit(effectiveRole) && (
                  <Button
                    type="button"
                    variant="primary"
                    className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
                    onClick={() => void editorRef.current?.save()}
                  >
                    <FloppyDisk className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    Save
                  </Button>
                )}
                {isAdmin(effectiveRole) && proposalId && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 !text-[10px] !font-mono !uppercase !tracking-[0.1em]"
                    onClick={async () => {
                      const res = await fetch(`/api/proposals/${proposalId}/award`, { method: 'POST' });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        alert(data.error ?? 'Could not mark as awarded');
                        return;
                      }
                      router.push(data.redirectTo ?? `/dashboard/projects/${proposalId}/pm`);
                      router.refresh();
                    }}
                  >
                    <Medal className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    Mark Awarded
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ds-sm border border-ds-border bg-ds-primary shadow-ds-sm">
                <FileText className="h-5 w-5 text-white" weight="bold" aria-hidden />
              </div>
            </div>
          )}
        </div>
      </AppHeader>

      {!existingProposal && (
        <div className="shrink-0 border-b border-ds-border bg-ds-shell/80 backdrop-blur-sm">
          <div className="w-full px-6 py-3">
            <div className="flex items-center gap-1">
              <StepIndicator
                number={1}
                label="Ingest Solicitation"
                active={step === 'upload'}
                completed={step !== 'upload'}
                icon={UploadSimple}
              />
              <StepConnector completed={step !== 'upload'} />
              <StepIndicator
                number={2}
                label="Organization Context"
                active={step === 'context'}
                completed={step === 'proposal'}
                icon={FileText}
              />
              <StepConnector completed={step === 'proposal'} />
              <StepIndicator
                number={3}
                label="Review & Validate"
                active={step === 'proposal'}
                completed={false}
                icon={ChartBar}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-8">
          <div className="w-full">
            <div>
              {/* Upload/context keep their container; proposal view becomes full document shell */}
              <div className={step === 'proposal' ? '' : 'overflow-hidden rounded-ds-md border border-ds-border bg-ds-surface p-8 shadow-ds-md'}>
                {step === 'upload' && (
                  <PDFUpload 
                    onUploadComplete={async (uploadedBAA) => {
                      await handleBAAUploaded(uploadedBAA);
                    }}
                    onContinue={() => setStep('context')}
                  />
                )}
                {step === 'context' && baa && (
                  <OrganizationContextJSONUpload
                    baa={baa}
                    onSubmit={async (context) => {
                      await handleContextSubmitted(context);
                    }}
                    onContinue={() => setStep('proposal')}
                  />
                )}
                {step === 'proposal' && baa && (
                  <div>
                    {isGenerating && canEdit(effectiveRole) ? (
                      <ProposalGenerationLoader
                        baa={baa}
                        organizationContext={organizationContext || undefined}
                        proposalId={proposalId ?? undefined}
                        onComplete={handleProposalGenerated}
                        onError={handleGenerationError}
                      />
                    ) : proposal && proposal.sections && proposal.sections.length > 0 ? (
                      <div className="flex min-h-0 bg-ds-page">
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                          <div className="mx-auto w-full max-w-[816px]">
                            <div className="doc-page-breaks shadow-[0_1px_4px_rgba(0,0,0,0.10)] border border-ds-border/60 rounded-[4px]">
                              <div className="px-8 py-12 sm:px-16 sm:py-16 lg:px-24 lg:py-24">
                                <ProposalEditor
                                  ref={editorRef}
                                  proposal={proposal}
                                  baa={baa}
                                  proposalId={proposalId || undefined}
                                  collaborators={collaborators}
                                  ownerUserId={user.id}
                                  onActiveEditorChange={setActiveEditor}
                                  disableFloatingSelectionToolbar
                                  onCollaboratorRoleChange={
                                    isAdmin(effectiveRole) && proposalId
                                      ? async (collaboratorId, role) => {
                                          const res = await fetch(
                                            `/api/proposals/${proposalId}/collaborators/${collaboratorId}`,
                                            {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ role }),
                                            },
                                          );
                                          const j = await res.json().catch(() => ({}));
                                          if (!res.ok) {
                                            alert(j.error ?? 'Could not update collaborator role');
                                            return;
                                          }
                                          await mergeCollaboratorsFromApi();
                                        }
                                      : undefined
                                  }
                                  onCollaboratorRemove={
                                    isAdmin(effectiveRole) && proposalId
                                      ? async (collaboratorId) => {
                                          setCollaborators((prev) => prev.filter((u) => u.id !== collaboratorId));
                                          try {
                                            const res = await fetch(
                                              `/api/proposals/${proposalId}/collaborators/${collaboratorId}`,
                                              { method: 'DELETE' },
                                            );
                                            const j = await res.json().catch(() => ({}));
                                            if (!res.ok) {
                                              await mergeCollaboratorsFromApi();
                                              alert(j.error ?? 'Could not remove collaborator');
                                              return;
                                            }
                                            await mergeCollaboratorsFromApi();
                                          } catch {
                                            await mergeCollaboratorsFromApi();
                                            alert('Could not remove collaborator');
                                          }
                                        }
                                      : undefined
                                  }
                                  readOnly={!canEdit(effectiveRole)}
                                  effectiveRole={effectiveRole}
                                  onExportDocx={handleExportDocx}
                                  exportBusy={exportBusy}
                                  onAddCollaborator={async (email, role) => {
                                    if (!proposalId) {
                                      alert('Save the proposal first before inviting collaborators.');
                                      return;
                                    }
                                    try {
                                      const response = await fetch('/api/invite-collaborator', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ proposalId, email, role }),
                                      });
                                      const result = await response.json();
                                      if (response.ok) {
                                        await mergeCollaboratorsFromApi();
                                        if (result.unchanged) {
                                          // Already this role — list refreshed only
                                        } else if (result.roleUpdated) {
                                          alert(
                                            result.emailSent
                                              ? `Access updated to ${role}. A new invitation email was sent.`
                                              : `Access updated to ${role}.`,
                                          );
                                        } else if (result.invitationLink) {
                                          alert(`Invitation sent!\n\nLink: ${result.invitationLink}`);
                                        } else {
                                          alert(`Invitation sent to ${email}`);
                                        }
                                      } else {
                                        alert(`Failed: ${result.error ?? response.statusText}`);
                                      }
                                    } catch {
                                      alert('Failed to send invitation. Please try again.');
                                    }
                                  }}
                                  onSave={async (updated) => {
                                    setProposal(updated);
                                    if (proposalId) {
                                      await fetch('/api/save-proposal', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          proposalId,
                                          generatedOutput: JSON.stringify(updated),
                                        }),
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

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
                                <div className="mt-3">
                                  <ConfidenceScore score={proposal.overallConfidence} />
                                </div>
                              </div>
                              <ul className="py-2">
                                {(proposal.sections || []).map((s, idx) => (
                                  <li key={s.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        document
                                          .getElementById(`section-${s.id}`)
                                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        if (window.innerWidth < 1024) setOutlineOpen(false);
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-ds-shell/60 transition-colors"
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="mt-[2px] font-mono text-[10px] text-ds-text-subtle tabular-nums w-6 shrink-0">
                                          {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[12px] font-semibold text-ds-text truncate">{s.title}</p>
                                          <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-[10px] text-ds-text-muted">
                                              {s.confidence}% confidence
                                            </span>
                                            {s.required && (
                                              <span className="border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                                                Required
                                              </span>
                                            )}
                                            <span className="font-mono text-[10px] text-ds-text-subtle">{s.status}</span>
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
                    ) : (
                      <div className="p-8 text-center">
                        <p className="mb-5 text-[15px] text-ds-text-muted">Proposal loaded without sections.</p>
                        {proposal && (
                          <>
                            <p className="mono text-xs text-ds-text-subtle">BAA: {baa.title}</p>
                            <p className="mono mt-2 text-xs text-ds-text-subtle">Proposal ID: {proposal.id}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <AppFooter>
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3 text-[11px] uppercase tracking-[0.06em] text-ds-text-subtle">
          <div className="flex flex-wrap gap-4">
            <span>Build v0.1.0</span>
            <span>/</span>
            <span>Development sandbox</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <span>Operational</span>
            <span>/</span>
            <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </AppFooter>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
  icon: Icon,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
  icon: any;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-ds-sm border text-xs font-semibold ${
          active
            ? 'border-ds-accent bg-ds-accent text-white shadow-ds-sm'
            : completed
              ? 'border-ds-primary bg-ds-primary text-white shadow-ds-sm'
              : 'border-ds-border bg-ds-surface-elevated/40 text-ds-text-muted'
        }`}
      >
        {completed ? (
          <CheckCircle className="w-4 h-4" weight="bold" />
        ) : (
          <span>{number}</span>
        )}
      </div>
      <span
        className={`font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
          active ? 'text-ds-text' : completed ? 'text-ds-text-secondary' : 'text-ds-text-muted'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`mx-2 h-px w-12 ${
        completed ? 'bg-ds-accent/80' : 'bg-ds-border'
      }`}
    />
  );
}
