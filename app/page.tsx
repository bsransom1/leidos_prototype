'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FileText } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="w-full max-w-2xl px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#1a1a1a] flex items-center justify-center border border-[#d1d5db]">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">BAA/RFP Proposal System</h1>
              <p className="text-xs text-[#6b7280] mt-0.5">Leidos GenAI • Internal Use</p>
            </div>
          </div>
          <p className="text-sm text-[#374151] mb-6 max-w-lg mx-auto">
            Internal system for solicitation analysis and proposal generation. 
            Generate compliant proposals from BAA/RFP documents using AI-powered analysis.
          </p>
        </div>

        <div className="bg-white border border-[#d1d5db] p-6">
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#374151] transition-colors text-center border border-[#1a1a1a]"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="block w-full px-4 py-2 bg-white text-[#374151] text-sm font-medium hover:bg-[#f9fafb] transition-colors text-center border border-[#d1d5db]"
            >
              Create Account
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#6b7280]">Unclassified Prototype • Internal Use Only</p>
        </div>
      </div>
    </div>
  );
}
