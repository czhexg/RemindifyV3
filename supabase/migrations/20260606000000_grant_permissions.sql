-- Grant table permissions to the authenticated role (frontend Data API).
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

-- Grant full access to the service_role (edge functions with secret key).
GRANT ALL ON public.profiles TO service_role;

GRANT ALL ON public.birthdays TO service_role;

GRANT ALL ON public.telegram_linking_tokens TO service_role;

GRANT ALL ON public.sent_notifications TO service_role;

-- sent_notifications intentionally has no authenticated grants — only
-- the edge function (via service_role) reads/writes to it.