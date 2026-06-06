/**
 * Telegram Bot API helper.
 */

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(
    chatId: number,
    text: string,
): Promise<void> {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN not set");
        return;
    }

    const resp = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!resp.ok) {
        const err = await resp.text();
        console.error(`Telegram send failed (${resp.status}): ${err}`);
    }
}
