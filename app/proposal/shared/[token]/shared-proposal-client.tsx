'use client';

import { useState, useEffect } from 'react';
import ProposalView from '@/components/ProposalView';
import { Proposal, BAA } from '@/types';
import { LogIn, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SharedProposalViewProps {
  proposal: any;
  collaboratorEmail: string;
  invitationToken: string;
  isAuthenticated: boolean;
}

export default function SharedProposalView({
  proposal,
  collaboratorEmail,
  invitationToken,
  isAuthenticated,
}: SharedProposalViewProps) {
  const router = useRouter();
  const [proposalData, setProposalData] = useState<Proposal | null>(null);
  const [baaData, setBaaData] = useState<BAA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProposal = async () => {
      try {
        // Parse proposal data
        if (proposal.generated_output) {
          const parsed = JSON.parse(proposal.generated_output);
          setProposalData(parsed);
        }

        // Parse BAA data
        if (proposal.baa_input) {
          const parsed = JSON.parse(proposal.baa_input);
          setBaaData(parsed);
        }
      } catch (error) {
        console.error('Error parsing proposal data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProposal();
  }, [proposal]);

  const handleSignIn = () => {
    // Redirect to login with return URL
    const returnUrl = `/proposal/shared/${invitationToken}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleAcceptInvitation = async () => {
    try {
      const response = await fetch(`/api/accept-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken }),
      });

      if (response.ok) {
        // Refresh page to show authenticated state
        window.location.reload();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#059669] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#6b7280]">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposalData || !baaData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="bg-white border border-[#d1d5db] p-6 max-w-md w-full">
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">Proposal Not Available</h1>
          <p className="text-sm text-[#6b7280]">
            This proposal is not yet generated or the data is unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f9fafb] overflow-hidden">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 bg-white border-b border-[#d1d5db] z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-[#1a1a1a]">{proposal.title}</h1>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Shared with {collaboratorEmail} • Viewer Access
              </p>
            </div>
            {!isAuthenticated && (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] transition-colors border border-[#059669]"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f4f6] text-[#374151] text-xs border border-[#d1d5db]">
                <Eye className="w-3.5 h-3.5" />
                Viewing as {collaboratorEmail}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white border border-[#d1d5db] p-6">
            <ProposalView
              proposal={proposalData}
              baa={baaData}
              onAward={() => {
                // Viewers can't award proposals
                alert('Only proposal owners can mark proposals as awarded.');
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
