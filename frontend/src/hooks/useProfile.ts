import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Profile {
    id: string;
    telegram_chat_id: number | null;
    notification_email: string | null;
    days_before: number;
    timezone: string;
    email_notifications: boolean;
    telegram_notifications: boolean;
    created_at: string;
}

export interface ProfileUpdate {
    days_before?: number;
    timezone?: string;
    email_notifications?: boolean;
    telegram_notifications?: boolean;
    notification_email?: string | null;
    telegram_chat_id?: number | null;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export function useProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async (): Promise<Profile> => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user!.id)
                .single();

            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!user,
    });
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

export function useUpdateProfile() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (update: ProfileUpdate) => {
            const { data, error } = await supabase
                .from("profiles")
                .update(update)
                .eq("id", user!.id)
                .select("*")
                .single();

            if (error) throw new Error(error.message);
            return data as Profile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
            toast.success("Settings saved!");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });
}
