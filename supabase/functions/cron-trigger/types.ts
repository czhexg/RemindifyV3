/**
 * Types shared by cron-trigger modules.
 */

export interface Birthday {
    id: string;
    name: string;
    month: number;
    day: number;
}

export interface UserProfile {
    id: string;
    timezone: string;
    days_before: number;
    email_notifications: boolean;
    telegram_notifications: boolean;
    telegram_chat_id: number | null;
    notification_email: string | null;
    birthdays: Birthday[];
}

export type NotificationChannel = "email" | "telegram";

export interface ProcessResult {
    sent: number;
    errors: number;
}
