-- =============================================================================
-- Initial Schema: Birthday Reminder App
-- Tables: profiles, birthdays, telegram_linking_tokens, sent_notifications
-- Includes RLS policies and auto-create profile trigger
-- =============================================================================
-- ---------------------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_chat_id bigint,
    notification_email text,
    days_before smallint NOT NULL DEFAULT 3,
    timezone text NOT NULL DEFAULT 'UTC',
    email_notifications boolean NOT NULL DEFAULT TRUE,
    telegram_notifications boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. birthdays
-- ---------------------------------------------------------------------------
CREATE TABLE public.birthdays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    MONTH smallint NOT NULL CHECK (
        MONTH BETWEEN 1
        AND 12
    ),
    DAY smallint NOT NULL CHECK (
        DAY BETWEEN 1
        AND 31
    ),
    created_at timestamptz DEFAULT NOW()
);

CREATE INDEX birthdays_user_id_idx ON public.birthdays(user_id);

-- ---------------------------------------------------------------------------
-- 3. telegram_linking_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE public.telegram_linking_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW(),
    used_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 4. sent_notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.sent_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    birthday_id uuid NOT NULL REFERENCES public.birthdays(id),
    notify_date date NOT NULL,
    channel text NOT NULL CHECK (channel IN ('email', 'telegram')),
    sent_at timestamptz DEFAULT NOW(),
    -- Idempotency: one notification per user+birthday+date+channel
    CONSTRAINT sent_notifications_unique UNIQUE (user_id, birthday_id, notify_date, channel)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- --- profiles ---
ALTER TABLE
    public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR
SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- --- birthdays ---
ALTER TABLE
    public.birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own birthdays" ON public.birthdays FOR
SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own birthdays" ON public.birthdays FOR
INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own birthdays" ON public.birthdays FOR
UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own birthdays" ON public.birthdays FOR DELETE USING (user_id = auth.uid());

-- --- telegram_linking_tokens ---
ALTER TABLE
    public.telegram_linking_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.telegram_linking_tokens FOR
SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens" ON public.telegram_linking_tokens FOR
INSERT
    WITH CHECK (user_id = auth.uid());

-- --- sent_notifications ---
-- No direct user access — only the edge function (service_role) writes to this table.
-- Enable RLS and deny all to prevent any access via the anon/authenticated Data API.
ALTER TABLE
    public.sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all public access" ON public.sent_notifications FOR ALL USING (false);

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================================================
CREATE
OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = '' AS $ $ BEGIN
INSERT INTO
    public.profiles (id)
VALUES
    (NEW.id);

RETURN NEW;

END;

$ $;

CREATE
OR REPLACE TRIGGER on_auth_user_created
AFTER
INSERT
    ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- TABLE PERMISSIONS (required for Data API access through RLS)
-- =============================================================================
GRANT
SELECT
,
UPDATE
    ON public.profiles TO authenticated;

GRANT
SELECT
,
INSERT
,
UPDATE
,
    DELETE ON public.birthdays TO authenticated;

GRANT
SELECT
,
INSERT
    ON public.telegram_linking_tokens TO authenticated;

-- sent_notifications intentionally has no grants — only the service_role
-- edge function bypasses RLS and writes to it.