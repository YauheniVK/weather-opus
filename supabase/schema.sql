-- ============================================================
-- Weather Opus — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT,
  image                 TEXT,
  role                  TEXT NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin')),
  subscription_status   TEXT NOT NULL DEFAULT 'free'
                          CHECK (subscription_status IN ('free', 'premium')),
  subscription_start    TIMESTAMPTZ,
  subscription_end      TIMESTAMPTZ,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT,
  is_blocked            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_email_idx        ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_role_idx         ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_stripe_cid_idx   ON public.profiles (stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_sub_status_idx   ON public.profiles (subscription_status);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- We use the service-role key from the server, so RLS is optional here.
-- However, enabling it is good practice for extra safety.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default (used by our server code)
-- Allow public read of own profile would require Supabase Auth integration,
-- which we're not using here (we use NextAuth). So policies are for completeness.

-- ─── Initial Admin Setup ──────────────────────────────────────────────────────
-- After running this schema, run the following to set your first admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
--
-- Or use the ADMIN_EMAILS env variable — the app automatically grants admin
-- role on first sign-in if the email matches.

-- ─── Sample data (optional, for dev/testing) ─────────────────────────────────
-- INSERT INTO public.profiles (email, name, role, subscription_status)
-- VALUES ('admin@example.com', 'Admin User', 'admin', 'premium');
