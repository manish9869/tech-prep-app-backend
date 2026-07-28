-- The custom JWT auth system (see authSession.js) generates its own user IDs and no longer
-- creates rows in Supabase's auth.users — profiles is the sole source of truth now, so the
-- old FK tying profile rows to auth.users rejects every new registration. Safe to run
-- multiple times.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Old rows used Supabase Auth's role model ('admin' / 'viewer'); this app's role model is
-- ('admin' / 'user'). Both sets are allowed so existing accounts keep working unchanged.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin', 'viewer', 'user']));
