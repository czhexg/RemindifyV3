/**
 * telegram-webhook — Handles incoming Telegram Bot messages.
 * Delegates /start command processing to handler.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegramMessage } from "../_utils/telegram.ts";
import { handleStartCommand } from "./handler.ts";

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const message = body.message;

    if (!message?.text) {
        return new Response("OK", { status: 200 });
    }

    const chatId: number = message.chat.id;
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (message.text.startsWith("/start ")) {
        await handleStartCommand(supabase, chatId, message.text);
    } else {
        await sendTelegramMessage(
            chatId,
            "👋 Send /start <token> to link your account. Get your token from the app settings.",
        );
    }

    return new Response("OK", { status: 200 });
});

// ---------------------------------------------------------------------------
// /start command handler
// ---------------------------------------------------------------------------

async function handleStartCommand(
    supabase: ReturnType<typeof createClient>,
    chatId: number,
    text: string,
): Promise<void> {
    const token = text.split(" ")[1]?.trim();
    if (!token) {
        await sendTelegramMessage(
            chatId,
            "❌ Missing token. Use /start <token> from the app.",
        );
        return;
    }

    // Look up & validate token
    const linkToken = await fetchLinkingToken(supabase, token);
    if (!linkToken) {
        await sendTelegramMessage(
            chatId,
            "❌ Invalid token. Please generate a new one from the app.",
        );
        return;
    }

    if (linkToken.used_at) {
        await sendTelegramMessage(
            chatId,
            "❌ This token has already been used.",
        );
        return;
    }

    if (isTokenExpired(linkToken.created_at)) {
        await sendTelegramMessage(
            chatId,
            "⌛ Token expired. Please generate a new one from the app.",
        );
        return;
    }

    // Link profile
    const { error: updateErr } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId })
        .eq("id", linkToken.user_id);

    if (updateErr) {
        console.error("Failed to update profile:", updateErr);
        await sendTelegramMessage(
            chatId,
            "❌ Something went wrong. Please try again.",
        );
        return;
    }

    // Mark token used
    await supabase
        .from("telegram_linking_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", token);

    await sendTelegramMessage(
        chatId,
        "✅ Your account is now linked! You'll receive birthday reminders here. 🎂",
    );
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

interface LinkingToken {
    id: string;
    user_id: string;
    used_at: string | null;
    created_at: string;
}

async function fetchLinkingToken(
    supabase: ReturnType<typeof createClient>,
    token: string,
): Promise<LinkingToken | null> {
    const { data } = await supabase
        .from("telegram_linking_tokens")
        .select("id, user_id, used_at, created_at")
        .eq("id", token)
        .single();
    return data;
}
