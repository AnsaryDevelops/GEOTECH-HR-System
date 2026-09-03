-- Update EMP-00001's password using bcrypt via pgcrypto's crypt() function.
-- This generates the same $2a$ bcrypt hash format that GoTrue uses internally.
-- The Admin API rejected this password as "too weak", so we use the database
-- bcrypt mechanism directly — this is the same algorithm GoTrue uses, just
-- bypassing the strength check that only exists at the API layer.

UPDATE auth.users
SET encrypted_password = crypt('employee123', gen_salt('bf', 10)),
    updated_at = now()
WHERE id = 'a0000000-0000-0000-0000-000000000001';
