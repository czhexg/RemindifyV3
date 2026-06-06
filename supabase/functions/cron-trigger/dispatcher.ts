/**
 * Notification dispatcher — sends reminders via email and Telegram.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTelegramMessage } from "../_utils/telegram.ts";
import { sendEmail } from "../_utils/smtp.ts";
import { buildEmailBody, buildTelegramBody } from "../_utils/messages.ts";
import { getAuthEmail } from "../_utils/auth.ts";
import type { Birthday, UserProfile, NotificationChannel } from "./types.ts";

/**
 * Checks idempotency (sent_notifications), dispatches the reminder,
 * and records it. Returns true if a notification was actually sent.
 */
export async function sendReminderIfNeeded(
    supabase: SupabaseClient,
    channel: NotificationChannel,
    user: UserProfile,
    bday: Birthday,
    targetDate: string,
): Promise<boolean> {
    if (!isChannelEnabled(channel, user)) return false;

    const alreadySent = await wasAlreadySent(
        supabase,
        channel,
        user.id,
        bday.id,
        targetDate,
    );
    if (alreadySent) return false;

    const ok =
        channel === "email"
            ? await dispatchEmail(user, bday)
            : await dispatchTelegram(user, bday);

    if (!ok) return false;

    await recordNotification(supabase, channel, user.id, bday.id, targetDate);
    console.log(`${channel} sent to user ${user.id} for ${bday.name}`);
    return true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isChannelEnabled(
    channel: NotificationChannel,
    user: UserProfile,
): boolean {
    if (channel === "email") return user.email_notifications;
    return user.telegram_notifications && user.telegram_chat_id != null;
}

async function wasAlreadySent(
    supabase: SupabaseClient,
    channel: NotificationChannel,
    userId: string,
    birthdayId: string,
    targetDate: string,
): Promise<boolean> {
    const { data } = await supabase
        .from("sent_notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("birthday_id", birthdayId)
        .eq("notify_date", targetDate)
        .eq("channel", channel)
        .maybeSingle();
    return data != null;
}

async function recordNotification(
    supabase: SupabaseClient,
    channel: NotificationChannel,
    userId: string,
    birthdayId: string,
    targetDate: string,
): Promise<void> {
    const { error } = await supabase.from("sent_notifications").insert({
        user_id: userId,
        birthday_id: birthdayId,
        notify_date: targetDate,
        channel,
    });
    if (error) {
        console.error(`Failed to record ${channel} notification:`, error);
    }
}

async function dispatchEmail(
    user: UserProfile,
    bday: Birthday,
): Promise<boolean> {
    const to = user.notification_email || (await getAuthEmail(user.id));
    if (!to) {
        console.log(`No email address for user ${user.id}, skipping`);
        return false;
    }
    const body = buildEmailBody(
        bday.name,
        bday.month,
        bday.day,
        user.days_before,
    );
    return sendEmail(to, `🎂 Birthday Reminder: ${bday.name}`, body);
}

async function dispatchTelegram(
    user: UserProfile,
    bday: Birthday,
): Promise<boolean> {
    const body = buildTelegramBody(
        bday.name,
        bday.month,
        bday.day,
        user.days_before,
    );
    await sendTelegramMessage(user.telegram_chat_id!, body);
    return true;
}
