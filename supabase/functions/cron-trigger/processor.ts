/**
 * Core reminder processing — queries users & birthdays, iterates, delegates to dispatcher.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    computeTargetDate,
    getLocalHour,
    getLocalDate,
} from "../_utils/date.ts";
import { sendReminderIfNeeded } from "./dispatcher.ts";
import type { UserProfile, ProcessResult } from "./types.ts";

/**
 * Fetch all users who have at least one notification channel enabled,
 * along with their birthdays.
 */
export async function fetchUsersWithBirthdays(
    supabase: SupabaseClient,
): Promise<UserProfile[] | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select(
            `
            id,
            timezone,
            days_before,
            email_notifications,
            telegram_notifications,
            telegram_chat_id,
            notification_email,
            birthdays:birthdays(id, name, month, day)
        `,
        )
        .or("email_notifications.eq.true,telegram_notifications.eq.true");

    if (error) {
        console.error("Failed to fetch users:", error);
        return null;
    }

    return data;
}

/**
 * Main entry point: processes all users and dispatches notifications
 * for any birthday whose target date matches today at 8 AM local time.
 */
export async function processReminders(
    supabase: SupabaseClient,
): Promise<ProcessResult> {
    const users = await fetchUsersWithBirthdays(supabase);
    if (!users || users.length === 0) {
        console.log("cron-trigger: no users with notifications enabled");
        return { sent: 0, errors: 0 };
    }

    const now = new Date();
    let sent = 0;
    let errors = 0;

    for (const user of users) {
        try {
            const localHour = getLocalHour(now, user.timezone);
            if (localHour !== 8) continue;

            const todayLocal = getLocalDate(now, user.timezone);
            const year = parseInt(todayLocal.split("-")[0], 10);

            for (const bday of user.birthdays) {
                try {
                    const target = computeTargetDate(
                        bday.month,
                        bday.day,
                        user.days_before,
                        year,
                    );
                    if (!target || target !== todayLocal) continue;

                    const emailOk = await sendReminderIfNeeded(
                        supabase,
                        "email",
                        user,
                        bday,
                        target,
                    );
                    const telegramOk = await sendReminderIfNeeded(
                        supabase,
                        "telegram",
                        user,
                        bday,
                        target,
                    );

                    if (emailOk) sent++;
                    if (telegramOk) sent++;
                } catch (err) {
                    console.error(`Error processing birthday ${bday.id}:`, err);
                    errors++;
                }
            }
        } catch (err) {
            console.error(`Error processing user ${user.id}:`, err);
            errors++;
        }
    }

    return { sent, errors };
}
