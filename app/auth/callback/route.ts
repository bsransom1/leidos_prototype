import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard after email confirmation
  return redirect('/dashboard');
}
