/**
 * cron-trigger — Called hourly by cron-job.org.
 * Delegates processing to processor.ts and dispatching to dispatcher.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processReminders } from "./processor.ts";

serve(async (req) => {
    if (!isAuthorized(req)) {
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("cron-trigger: started");

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
