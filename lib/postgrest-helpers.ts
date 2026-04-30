/**
 * PostgREST rejects selects/updates that reference columns missing from its schema cache
 * (PGRST204) or Postgres unknown column (42703).
 */
export function isPostgrestMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === 'PGRST204' || err.code === '42703') return true;
  const m = err.message ?? '';
  return (
    /Could not find the .* column/i.test(m) ||
    /column .* does not exist/i.test(m)
  );
}
