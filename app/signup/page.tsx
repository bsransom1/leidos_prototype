'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required
        setError('Please check your email to confirm your account before signing in.');
        // Show success message instead of error
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      // If session exists, user is auto-confirmed (email confirmation disabled)
      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#d1d5db] p-6">
          <div className="mb-4">
            <h1 className="text-base font-semibold text-[#1a1a1a] mb-1">Create Account</h1>
            <p className="text-xs text-[#6b7280]">BAA/RFP Proposal System</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
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

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#d1d5db] text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={`p-2 border ${
                error.includes('check your email') || error.includes('confirm')
                  ? 'bg-[#eff6ff] border-[#bfdbfe]'
                  : 'bg-[#fef2f2] border-[#fecaca]'
              }`}>
                <p className={`text-xs ${
                  error.includes('check your email') || error.includes('confirm')
                    ? 'text-[#1e40af]'
                    : 'text-[#991b1b]'
                }`}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#374151] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#1a1a1a]"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#d1d5db]">
            <p className="text-xs text-[#6b7280] text-center">
              Already have an account?{' '}
              <a href="/login" className="text-[#2563eb] hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
