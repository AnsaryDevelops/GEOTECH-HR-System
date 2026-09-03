-- Create missing auth.identities rows for all existing auth.users
-- These users were created via raw SQL INSERT without corresponding identity rows,
-- which prevents GoTrue (Supabase Auth) from loading them via the Admin API
-- and causes password-based login to fail.

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
SELECT
  u.email,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true
  ),
  'email',
  u.created_at,
  u.updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);
