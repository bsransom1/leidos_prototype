'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Trash2, Edit2, Save, X } from 'lucide-react';
import ProposalView from '@/components/ProposalView';
import { BAA, Proposal } from '@/types';
import { User } from '@supabase/supabase-js';

interface ProposalDetailClientProps {
  proposal: any;
  user: User;
}

export default function ProposalDetailClient({ proposal, user }: ProposalDetailClientProps) {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [isDeleting, setIsDeleting] = useState(false);

  const proposalData: Proposal = JSON.parse(proposal.generated_output);
  const baaData: BAA = JSON.parse(proposal.baa_input);

  const handleSaveTitle = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from('proposals')
      .update({ title })
      .eq('id', proposal.id);

    if (!error) {
      setIsEditingTitle(false);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposal.id);

    if (!error) {
      router.push('/dashboard');
    } else {
      setIsDeleting(false);
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
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="px-2 py-1 border border-[#d1d5db] text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1 text-[#059669] hover:bg-[#ecfdf5]"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setTitle(proposal.title);
                      setIsEditingTitle(false);
                    }}
                    className="p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="text-base font-semibold text-[#1a1a1a] tracking-tight flex items-center gap-2">
                    {proposal.title}
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="text-[#6b7280] hover:text-[#1a1a1a]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </h1>
                  <p className="text-xs text-[#6b7280] mt-0.5">Proposal Detail</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium border ${
                proposal.status === 'generated' 
                  ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                  : 'bg-[#f3f4f6] text-[#374151] border-[#d1d5db]'
              }`}>
                {proposal.status}
              </span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-4">
          <div className="bg-white border border-[#d1d5db] p-6">
            <ProposalView
              proposal={proposalData}
              baa={baaData}
              onAward={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-[#d1d5db] bg-white">
        <div className="w-full px-6 py-2">
          <div className="flex items-center justify-between text-xs text-[#6b7280]">
            <div className="flex items-center gap-4">
              <span>Created: {new Date(proposal.created_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>System Status: Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
