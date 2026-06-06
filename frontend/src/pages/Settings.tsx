import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotificationForm } from "@/components/settings/NotificationForm";
import { TelegramLinking } from "@/components/settings/TelegramLinking";

export function Settings() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

            {/* Notification Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                        Choose how and when you want to be reminded.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NotificationForm />
                </CardContent>
            </Card>

            <Separator />

            {/* Telegram Linking */}
            <Card>
                <CardHeader>
                    <CardTitle>Telegram</CardTitle>
                    <CardDescription>
                        Link your Telegram account to receive reminders via
                        Telegram.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TelegramLinking />
                </CardContent>
            </Card>
        </div>
    );
}
