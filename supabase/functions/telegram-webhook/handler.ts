/**
 * Telegram /start command handler — token validation and account linking.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegramMessage } from "../_utils/telegram.ts";
import { isTokenExpired } from "../_utils/tokens.ts";

interface LinkingToken {
    id: string;
    user_id: string;
    used_at: string | null;
    created_at: string;
}

/**
 * Handles the /start <token> command from Telegram.
 * Validates the token, links the chat to the user's profile, and confirms.
 */
export async function handleStartCommand(
    supabase: ReturnType<typeof createClient>,
    chatId: number,
    text: string,
): Promise<void> {
    const token = text.split(" ")[1]?.trim();
    console.log("handleStartCommand — raw text:", text);
    console.log("handleStartCommand — token:", token);

    if (!token) {
        await sendTelegramMessage(
            chatId,
            "❌ Missing token. Use /start <token> from the app.",
        );
        return;
    }

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

    const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId })
        .eq("id", linkToken.user_id);

    if (error) {
        console.error("Failed to update profile:", error);
        await sendTelegramMessage(
            chatId,
            "❌ Something went wrong. Please try again.",
        );
        return;
    }

    await supabase
        .from("telegram_linking_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", token);

    await sendTelegramMessage(
        chatId,
        "✅ Your account is now linked! You'll receive birthday reminders here. 🎂",
    );
}

async function fetchLinkingToken(
    supabase: ReturnType<typeof createClient>,
    token: string,
): Promise<LinkingToken | null> {
    console.log("fetchLinkingToken — searching for token:", token);
    const { data, error } = await supabase
        .from("telegram_linking_tokens")
        .select("id, user_id, used_at, created_at")
        .eq("id", token)
        .single();

    console.log("fetchLinkingToken — data:", JSON.stringify(data));
    console.log("fetchLinkingToken — error:", JSON.stringify(error));
    return data;
}
