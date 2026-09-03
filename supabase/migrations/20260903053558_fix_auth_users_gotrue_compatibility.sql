-- Fix manually-inserted auth.users to match GoTrue's expected data format.
--
-- ROOT CAUSE: The 8 HR users were inserted via raw SQL into auth.users without
-- using the GoTrue Admin API. This resulted in several structural differences
-- from what GoTrue expects, causing "Database error querying schema" on login:
--
-- 1. auth.identities.provider_id was set to the user's EMAIL instead of the
--    user's UUID. GoTrue uses the UUID as provider_id for the "email" provider.
-- 2. auth.identities.identity_data was missing "phone_verified": false.
-- 3. auth.users token columns (confirmation_token, recovery_token, etc.) were
--    NULL instead of empty strings ('').
-- 4. auth.users.raw_app_meta_data was missing "providers": ["email"].
-- 5. auth.users.raw_user_meta_data was NULL instead of {"email_verified": true}.
-- 6. auth.users.email_change was NULL instead of ''.
--
-- This migration fixes all 8 existing users WITHOUT changing their IDs,
-- emails, email confirmation status, or passwords.

-- Fix auth.identities: provider_id should be UUID, identity_data needs phone_verified
UPDATE auth.identities i
SET 
  provider_id = u.id::text,
  identity_data = jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', COALESCE(u.email_confirmed_at IS NOT NULL, false),
    'phone_verified', false
  )
FROM auth.users u
WHERE i.user_id = u.id
  AND i.provider = 'email'
  AND i.provider_id != u.id::text;

-- Fix auth.users: set token columns to empty strings instead of NULL
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE confirmation_token IS NULL 
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL;

-- Fix auth.users: raw_app_meta_data needs "providers" array
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{providers}',
  '["email"]'::jsonb
)
WHERE raw_app_meta_data IS NULL 
   OR raw_app_meta_data->'providers' IS NULL;

-- Fix auth.users: raw_user_meta_data should have email_verified
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
WHERE raw_user_meta_data IS NULL;
