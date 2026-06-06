/**
 * Notification message builders shared across Edge Functions.
 */

/** Plain-text email body for birthday reminders. */
export function buildEmailBody(
    name: string,
    month: number,
    day: number,
    daysBefore: number,
): string {
    const dateStr = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const when =
        daysBefore === 0
            ? "today"
            : `in ${daysBefore} day${daysBefore > 1 ? "s" : ""}`;

    return [
        "Hi there! 👋",
        "",
        `This is your Remindify reminder: ${name}'s birthday is ${when} (${dateStr}).`,
        "",
        "Don't forget to reach out and celebrate! 🎉",
        "",
        "— Remindify",
    ].join("\n");
}

/** Telegram message body (Markdown) for birthday reminders. */
export function buildTelegramBody(
    name: string,
    month: number,
    day: number,
    daysBefore: number,
): string {
    const dateStr = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const when =
        daysBefore === 0
            ? "today"
            : `in ${daysBefore} day${daysBefore > 1 ? "s" : ""}`;

    return [
        "🎂 *Birthday Reminder*",
        "",
        `${name}'s birthday is *${when}* (${dateStr}).`,
        "Don't forget to reach out and celebrate! 🎉",
    ].join("\n");
}
