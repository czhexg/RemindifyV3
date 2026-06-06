import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";

// ---------------------------------------------------------------------------
// Curated timezone list
// ---------------------------------------------------------------------------

const TIMEZONES = [
    "Asia/Singapore",
    "Asia/Kuala_Lumpur",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Jakarta",
    "Asia/Bangkok",
    "Asia/Kolkata",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Pacific/Auckland",
    "Australia/Sydney",
    "UTC",
];

// ---------------------------------------------------------------------------

export function NotificationForm() {
    const { data: profile, isLoading } = useProfile();
    const updateProfile = useUpdateProfile();

    const [daysBefore, setDaysBefore] = useState(3);
    const [timezone, setTimezone] = useState("Asia/Singapore");
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [telegramEnabled, setTelegramEnabled] = useState(false);
    const [notificationEmail, setNotificationEmail] = useState("");
    const [saved, setSaved] = useState(false);

    // Sync local state when profile loads
    useEffect(() => {
        if (profile) {
            setDaysBefore(profile.days_before);
            setTimezone(profile.timezone);
            setEmailEnabled(profile.email_notifications);
            setTelegramEnabled(profile.telegram_notifications);
            setNotificationEmail(profile.notification_email ?? "");
        }
    }, [profile]);

    if (isLoading) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
            </div>
        );
    }

    const handleSave = () => {
        updateProfile.mutate({
            days_before: daysBefore,
            timezone,
            email_notifications: emailEnabled,
            telegram_notifications: telegramEnabled,
            notification_email: notificationEmail || null,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const isLinked = !!profile?.telegram_chat_id;

    return (
        <div className="space-y-5">
            {/* Days before */}
            <div className="space-y-2">
                <Label htmlFor="daysBefore">Notify me (days before)</Label>
                <Input
                    id="daysBefore"
                    type="number"
                    min={0}
                    max={30}
                    value={daysBefore}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDaysBefore(parseInt(e.target.value, 10) || 0)
                    }
                />
                <p className="text-xs text-muted-foreground">
                    How many days in advance to send the reminder (0 = day of).
                </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                                {tz}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Email notifications */}
            <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={emailEnabled}
                        onChange={(e) => setEmailEnabled(e.target.checked)}
                    />
                    <span className="text-sm font-medium">
                        Email notifications
                    </span>
                </label>
                {emailEnabled && (
                    <div className="space-y-2 pl-7">
                        <Label htmlFor="notificationEmail">
                            Notification email (optional)
                        </Label>
                        <Input
                            id="notificationEmail"
                            type="email"
                            placeholder="Uses your account email if blank"
                            value={notificationEmail}
                            onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                            ) => setNotificationEmail(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Telegram notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={telegramEnabled}
                    disabled={!isLinked}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                />
                <span className="text-sm font-medium">
                    Telegram notifications
                    {!isLinked && (
                        <span className="text-muted-foreground ml-1">
                            (link your Telegram first)
                        </span>
                    )}
                </span>
            </label>

            {/* Save */}
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending
                    ? "Saving…"
                    : saved
                      ? "✓ Saved"
                      : "Save Settings"}
            </Button>
        </div>
    );
}
