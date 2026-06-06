-- Grant table permissions to the authenticated role.
-- RLS policies handle row-level filtering; these grants give basic table access.
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

-- sent_notifications is intentionally NOT granted — only the edge function
-- (using service_role key, which bypasses RLS) writes to it.