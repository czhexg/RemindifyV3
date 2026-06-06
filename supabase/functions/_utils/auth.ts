/**
 * Auth-related helpers shared across Edge Functions.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Fetch the auth email for a user (fallback when notification_email is null).
 * Uses the admin API so requires a service_role client.
 */
export async function getAuthEmail(userId: string): Promise<string | null> {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
}
