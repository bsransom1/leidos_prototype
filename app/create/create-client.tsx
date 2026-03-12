'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Users, BarChart3, CheckCircle2, ArrowLeft } from 'lucide-react';
import PDFUpload from '@/components/PDFUpload';
import OrganizationContextJSONUpload from '@/components/OrganizationContextJSONUpload';
import ProposalView from '@/components/ProposalView';
import ProposalGenerationLoader from '@/components/ProposalGenerationLoader';
import CollaborationPanel from '@/components/CollaborationPanel';
import { BAA, OrganizationContext, Proposal, User } from '@/types';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface CreateProposalClientProps {
  user: SupabaseUser;
  existingProposal?: any;
}

export default function CreateProposalClient({ user, existingProposal }: CreateProposalClientProps) {
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
      let validatedStep: 'upload' | 'context' | 'proposal' | 'project' = 'upload';
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
  const [step, setStep] = useState<'upload' | 'context' | 'proposal' | 'project'>(initialState.step);
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
      role: 'admin',
      organizationId: 'org-1',
    },
  ]);

  // Load collaborators when proposalId is available
  useEffect(() => {
    const loadCollaborators = async () => {
      if (proposalId) {
        try {
          const response = await fetch(`/api/get-collaborators?proposalId=${proposalId}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            const owner: User = {
              id: user.id,
              name: user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: 'admin',
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
          }
        } catch (error) {
          console.error('Error loading collaborators:', error);
        }
      }
    };

    loadCollaborators();
  }, [proposalId, user.id, user.email]);

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
      // Save organization context to database
      if (proposalId) {
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

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa]">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-[#d1d5db]">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/dashboard" className="text-[#6b7280] hover:text-[#1a1a1a]">
                <ArrowLeft className="w-4 h-4" />
              </a>
              <div className="w-9 h-9 bg-[#1a1a1a] flex items-center justify-center border border-[#d1d5db]">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-[#1a1a1a] tracking-tight">Create Proposal</h1>
                <p className="text-xs text-[#6b7280] mt-0.5">Leidos GenAI • Internal Use</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Steps */}
      <div className="flex-shrink-0 border-b border-[#d1d5db] bg-white">
        <div className="w-full px-6 py-3">
          <div className="flex items-center gap-1">
            <StepIndicator
              number={1}
              label="Ingest Solicitation"
              active={step === 'upload'}
              completed={step !== 'upload'}
              icon={Upload}
            />
            <StepConnector completed={step !== 'upload'} />
            <StepIndicator
              number={2}
              label="Organization Context"
              active={step === 'context'}
              completed={step === 'proposal' || step === 'project'}
              icon={FileText}
            />
            <StepConnector completed={step === 'proposal' || step === 'project'} />
            <StepIndicator
              number={3}
              label="Review & Validate"
              active={step === 'proposal'}
              completed={step === 'project'}
              icon={BarChart3}
            />
            <StepConnector completed={step === 'project'} />
            <StepIndicator
              number={4}
              label="Execution Plan"
              active={step === 'project'}
              completed={false}
              icon={CheckCircle2}
            />
          </div>
        </div>
      </div>

      {/* Main Content Container - Fixed with Scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className={`${step === 'proposal' ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              <div className="bg-white border border-[#d1d5db] p-6">
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
                    {isGenerating ? (
                      <ProposalGenerationLoader
                        baa={baa}
                        organizationContext={organizationContext || undefined}
                        onComplete={handleProposalGenerated}
                        onError={handleGenerationError}
                      />
                    ) : proposal && proposal.sections && proposal.sections.length > 0 ? (
                      <>
                        <ProposalView
                          proposal={proposal}
                          baa={baa}
                          onAward={async () => {
                            setStep('project');
                            await updateProposalStep('project', baa, organizationContext || undefined, proposal);
                          }}
                        />
                        <div className="mt-4 pt-4 border-t border-[#d1d5db] flex justify-end gap-2">
                          <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-[#f3f4f6] text-[#374151] text-sm font-medium hover:bg-[#e5e7eb] transition-colors border border-[#d1d5db]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProposal}
                            className="px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]"
                          >
                            Save Proposal
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-[#6b7280] mb-4">Proposal loaded but has no sections.</p>
                        {proposal && (
                          <>
                            <p className="text-xs text-[#9ca3af]">BAA: {baa.title}</p>
                            <p className="text-xs text-[#9ca3af]">Proposal ID: {proposal.id}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {step === 'project' && proposal && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-[#059669] mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">Proposal Awarded</h2>
                    <p className="text-sm text-[#6b7280] mb-6">Project setup interface coming soon...</p>
                    <button
                      onClick={handleSaveProposal}
                      className="px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]"
                    >
                      Save & Return to Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {step === 'proposal' && proposalId && (
              <div className="lg:col-span-1">
                <CollaborationPanel
                  users={collaborators}
                  currentUser={collaborators[0]}
                  proposalId={proposalId}
                  onAddUser={async (email, role) => {
                    if (!proposalId) {
                      alert('Please save the proposal first before inviting collaborators.');
                      return;
                    }

                    try {
                      const response = await fetch('/api/invite-collaborator', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          proposalId,
                          email,
                          role: 'viewer', // Force viewer for now
                        }),
                      });

                      const result = await response.json();
                      
                      if (response.ok) {
                        // Refresh collaborators list
                        const collabResponse = await fetch(`/api/get-collaborators?proposalId=${proposalId}`);
                        const collabData = await collabResponse.json();
                        
                        if (collabData.success) {
                          const owner: User = {
                            id: user.id,
                            name: user.email?.split('@')[0] || 'User',
                            email: user.email || '',
                            role: 'admin',
                            organizationId: '',
                          };
                          
                          const invitedUsers: User[] = collabData.data.map((c: any) => ({
                            id: c.id,
                            name: c.email.split('@')[0],
                            email: c.email,
                            role: c.role as User['role'],
                            organizationId: '',
                          }));
                          
                          setCollaborators([owner, ...invitedUsers]);
                          
                          if (result.invitationLink) {
                            alert(`Invitation sent to ${email}!\n\nInvitation link: ${result.invitationLink}\n\n(Check server logs if email service is not configured)`);
                          } else {
                            alert(`Invitation sent to ${email}`);
                          }
                        }
                      } else {
                        if (result.error === 'Collaborator already invited') {
                          alert(`${email} has already been invited to this proposal.`);
                        } else {
                          alert(`Failed to invite collaborator: ${result.error}`);
                        }
                      }
                    } catch (error) {
                      console.error('Error inviting collaborator:', error);
                      alert('Failed to send invitation. Please try again.');
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <footer className="flex-shrink-0 border-t border-[#d1d5db] bg-white">
        <div className="w-full px-6 py-2">
          <div className="flex items-center justify-between text-xs text-[#6b7280]">
            <div className="flex items-center gap-4">
              <span>Build: v0.1.0-prototype</span>
              <span>•</span>
              <span>Environment: Development</span>
            </div>
            <div className="flex items-center gap-4">
              <span>System Status: Operational</span>
              <span>•</span>
              <span>Last Updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
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
        className={`w-7 h-7 flex items-center justify-center border text-xs font-medium ${
          active
            ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white'
            : completed
            ? 'bg-[#374151] border-[#374151] text-white'
            : 'bg-white border-[#d1d5db] text-[#6b7280]'
        }`}
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <span>{number}</span>
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? 'text-[#1a1a1a]' : completed ? 'text-[#374151]' : 'text-[#6b7280]'
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
      className={`w-12 h-px mx-2 ${
        completed ? 'bg-[#374151]' : 'bg-[#d1d5db]'
      }`}
    />
  );
}
