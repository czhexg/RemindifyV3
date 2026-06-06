-- Fix: Grant table access to the service_role PostgreSQL role.
-- Edge functions use the secret key which maps to this role.
-- RLS is still enforced for authenticated/anonymous roles.
GRANT ALL ON public.profiles TO service_role;

GRANT ALL ON public.birthdays TO service_role;

GRANT ALL ON public.telegram_linking_tokens TO service_role;

GRANT ALL ON public.sent_notifications TO service_role;