/**
 * Auth-related helpers shared across Edge Functions.
 */

import { createAdminClient } from "./supabase.ts";

/**
 * Fetch the auth email for a user (fallback when notification_email is null).
 * Uses the admin API so requires a service_role client.
 */
export async function getAuthEmail(userId: string): Promise<string | null> {
    const supabase = createAdminClient();
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
}
