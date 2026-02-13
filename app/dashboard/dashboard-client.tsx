'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FileText, Plus, LogOut, Calendar, Eye, Trash2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';

interface Proposal {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface DashboardClientProps {
  user: User;
  proposals: Proposal[];
}

export default function DashboardClient({ user, proposals }: DashboardClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleViewProposal = async (id: string) => {
    // Check if proposal is completed (has generated_output) or in progress
    const proposal = proposals.find(p => p.id === id);
    
    // If proposal has generated output and status is 'generated', show detail view
    // Otherwise, resume creation flow
    router.push(`/create?id=${id}`);
  };

  const handleDeleteProposal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);

    if (!error) {
      router.refresh();
    }
    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa]">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-[#d1d5db]">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1a1a1a] flex items-center justify-center border border-[#d1d5db]">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-[#1a1a1a] tracking-tight">BAA/RFP Proposal System</h1>
                <p className="text-xs text-[#6b7280] mt-0.5">Leidos GenAI • Internal Use</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#6b7280] mono">{user.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#374151] hover:text-[#1a1a1a] border border-[#d1d5db] hover:border-[#9ca3af] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1a1a1a]">Dashboard</h2>
            <a
              href="/create"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Proposal
            </a>
          </div>

          {/* Proposals List */}
          {proposals.length === 0 ? (
            <div className="bg-white border border-[#d1d5db] p-8 text-center">
              <p className="text-sm text-[#6b7280] mb-4">No proposals found</p>
              <a
                href="/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Your First Proposal
              </a>
            </div>
          ) : (
            <div className="bg-white border border-[#d1d5db]">
              <table className="w-full">
                <thead className="bg-[#f9fafb] border-b border-[#d1d5db]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#374151]">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#374151]">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#374151]">Created</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-[#374151]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr 
                      key={proposal.id} 
                      className="border-b border-[#d1d5db] hover:bg-[#f9fafb] cursor-pointer"
                      onClick={() => handleViewProposal(proposal.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#1a1a1a]">{proposal.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium border ${
                          proposal.status === 'generated' 
                            ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                            : 'bg-[#f3f4f6] text-[#374151] border-[#d1d5db]'
                        }`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(proposal.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleViewProposal(proposal.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1a1a1a] border border-[#d1d5db] hover:bg-[#f3f4f6] hover:border-[#9ca3af] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={(e) => handleDeleteProposal(proposal.id, e)}
                            disabled={deletingId === proposal.id}
                            className="p-1.5 text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors"
                            title="Delete proposal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
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
