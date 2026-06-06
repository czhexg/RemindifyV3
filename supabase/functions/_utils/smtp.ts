/**
 * SMTP email helper.
 * Gracefully skips when SMTP is not yet configured (placeholder values).
 */

// @deno-types="https://deno.land/x/smtp@v0.7.0/mod.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

export async function sendEmail(
    to: string,
    subject: string,
    body: string,
): Promise<boolean> {
    const host = Deno.env.get("SMTP_HOST");

    // Not configured yet — skip silently
    if (!host || host === "your-smtp-host") {
        console.log(`SMTP not configured, skipping email to ${to}`);
        return false;
    }

    const client = new SmtpClient();

    try {
        await client.connectTLS({
            hostname: host,
            port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
            username: Deno.env.get("SMTP_USER")!,
            password: Deno.env.get("SMTP_PASS")!,
        });

        await client.send({
            from: Deno.env.get("FROM_EMAIL") || "noreply@example.com",
            to,
            subject,
            content: body,
        });

        console.log(`Email sent to ${to}`);
        return true;
    } catch (err) {
        console.error(`SMTP send failed: ${err}`);
        return false;
    } finally {
        await client.close();
    }
}
