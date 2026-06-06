/**
 * cron-trigger — Called hourly by cron-job.org.
 * Delegates processing to processor.ts and dispatching to dispatcher.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_utils/supabase.ts";
import { processReminders } from "./processor.ts";

serve(async (req) => {
    if (!isAuthorized(req)) {
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("cron-trigger: started");

    const supabase = createAdminClient();

    const result = await processReminders(supabase);

    console.log(
        `cron-trigger: done — ${result.sent} sent, ${result.errors} errors`,
    );
    return Response.json(result);
});

function isAuthorized(req: Request): boolean {
    const secret = req.headers.get("X-Cron-Secret");
    return secret === Deno.env.get("CRON_SECRET");
}
