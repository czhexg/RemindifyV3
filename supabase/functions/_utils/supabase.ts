/**
 * Supabase admin client factory for Edge Functions.
 * Uses the auto-injected SUPABASE_URL and SUPABASE_SECRET_KEYS env vars.
 */

import {
    createClient,
    SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

/** Extracts the secret key from the auto-injected JSON dictionary. */
function getServiceRoleKey(): string {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!);
    return keys.default;
}

/** Creates a Supabase client with the service_role (secret) key — bypasses RLS. */
export function createAdminClient(): SupabaseClient {
    return createClient(Deno.env.get("SUPABASE_URL")!, getServiceRoleKey());
}
