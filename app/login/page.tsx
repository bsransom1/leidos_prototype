'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for error in URL params (from redirect)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam === 'email_not_confirmed') {
        setError('Please confirm your email address before signing in.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for email confirmation error
        if (error.message.includes('email') && error.message.includes('confirm')) {
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        } else {
          setError(error.message || 'Failed to sign in');
        }
        return;
      }

      // Verify user email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        return;
      }

      // Check for redirect parameter
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      
      if (redirectUrl) {
        router.push(decodeURIComponent(redirectUrl));
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#d1d5db] p-6">
          <div className="mb-4">
            <h1 className="text-base font-semibold text-[#1a1a1a] mb-1">BAA/RFP Proposal System</h1>
            <p className="text-xs text-[#6b7280]">Sign in to access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#d1d5db] text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#d1d5db] text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-2 bg-[#fef2f2] border border-[#fecaca]">
                <p className="text-xs text-[#991b1b]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#374151] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#1a1a1a]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#d1d5db]">
            <p className="text-xs text-[#6b7280] text-center">
              Don't have an account?{' '}
              <a href="/signup" className="text-[#2563eb] hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
