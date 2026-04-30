/**
 * Single entry for Supabase clients (per project convention).
 * Prefer these imports over ad-hoc createClient duplicates.
 */
export { createClient } from './supabase/client';
export { createClient as createServerClient } from './supabase/server';
