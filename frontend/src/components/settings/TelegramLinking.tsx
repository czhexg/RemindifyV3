import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Link, Unlink } from "lucide-react";
import { toast } from "sonner";

// ⚠️ Update this to your actual bot username (from @BotFather)
const TELEGRAM_BOT_USERNAME = "RemindifyV3_bot";

export function TelegramLinking() {
    const { user } = useAuth();
    const { data: profile, refetch: refetchProfile } = useProfile();
    const updateProfile = useUpdateProfile();

    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [copied, setCopied] = useState(false);

    const isLinked = !!profile?.telegram_chat_id;

    // --- Link flow ---
    const handleLink = async () => {
        setLoading(true);
        // Insert a new linking token — the id IS the token
        const { data, error } = await supabase
            .from("telegram_linking_tokens")
            .insert({ user_id: user!.id })
            .select("id")
            .single();

        if (error || !data) {
            toast.error("Failed to generate link token. Try again.");
            setLoading(false);
            return;
        }

        setToken(data.id);
        setShowDialog(true);
        setLoading(false);
    };

    const handleCopy = () => {
        if (!token) return;
        navigator.clipboard.writeText(token);
        setCopied(true);
        toast.success("Token copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCheckStatus = async () => {
        await refetchProfile();
        const { data } = await supabase
            .from("profiles")
            .select("telegram_chat_id")
            .eq("id", user!.id)
            .single();
        if (data?.telegram_chat_id) {
            setShowDialog(false);
            setToken(null);
            toast.success("Telegram linked! 🎉");
        } else {
            toast.info("Not linked yet. Send the /start command in Telegram.");
        }
    };

    // --- Unlink ---
    const handleUnlink = () => {
        updateProfile.mutate(
            {
                telegram_chat_id: null,
                telegram_notifications: false,
            },
            {
                onSuccess: () => toast.success("Telegram unlinked."),
            },
        );
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Telegram</span>
                    {isLinked ? (
                        <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Linked
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                        >
                            Not linked
                        </Badge>
                    )}
                </div>
                {isLinked ? (
                    <Button variant="outline" size="sm" onClick={handleUnlink}>
                        <Unlink className="h-4 w-4 mr-1" />
                        Unlink
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLink}
                        disabled={loading}
                    >
                        <Link className="h-4 w-4 mr-1" />
                        {loading ? "Generating…" : "Link Telegram"}
                    </Button>
                )}
            </div>

            {/* Token display dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Link Your Telegram</DialogTitle>
                        <DialogDescription>
                            Send the command below to{" "}
                            <strong>@{TELEGRAM_BOT_USERNAME}</strong> on
                            Telegram.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Deep link */}
                        <Button variant="outline" className="w-full" asChild>
                            <a
                                href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open @{TELEGRAM_BOT_USERNAME} in Telegram
                            </a>
                        </Button>

                        {/* Manual copy */}
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                Or copy the token and send it manually:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                                    /start {token}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button
                            variant="default"
                            className="w-full"
                            onClick={handleCheckStatus}
                        >
                            Check Status
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
