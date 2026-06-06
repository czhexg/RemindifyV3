import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { startOfDay } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Birthday {
    id: string;
    user_id: string;
    name: string;
    month: number;
    day: number;
    created_at: string;
}

export interface BirthdayInput {
    name: string;
    month: number;
    day: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the next occurrence of a birthday (wraps to next year if passed). */
export function getNextOccurrence(month: number, day: number): Date {
    const today = startOfDay(new Date());
    const thisYear = new Date(today.getFullYear(), month - 1, day);
    if (thisYear < today) {
        return new Date(today.getFullYear() + 1, month - 1, day);
    }
    return thisYear;
}

/** Sort birthdays by upcoming occurrence (closest first). */
export function sortByUpcoming(birthdays: Birthday[]): Birthday[] {
    return [...birthdays].sort((a, b) => {
        const aNext = getNextOccurrence(a.month, a.day).getTime();
        const bNext = getNextOccurrence(b.month, b.day).getTime();
        return aNext - bNext;
    });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useBirthdays() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["birthdays", user?.id],
        queryFn: async (): Promise<Birthday[]> => {
            const { data, error } = await supabase
                .from("birthdays")
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });

            if (error) throw new Error(error.message);
            return data ?? [];
        },
        enabled: !!user,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateBirthday() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: BirthdayInput) => {
            const { data, error } = await supabase
                .from("birthdays")
                .insert({ ...input, user_id: user!.id })
                .select("*")
                .single();

            if (error) throw new Error(error.message);
            return data as Birthday;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["birthdays", user?.id],
            });
            toast.success("Birthday added!");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });
}

export function useUpdateBirthday() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            ...input
        }: BirthdayInput & { id: string }) => {
            const { data, error } = await supabase
                .from("birthdays")
                .update(input)
                .eq("id", id)
                .select("*")
                .single();

            if (error) throw new Error(error.message);
            return data as Birthday;
        },
        onMutate: async (updated) => {
            // Optimistic: cancel outgoing refetch, snapshot current cache, apply update
            await queryClient.cancelQueries({
                queryKey: ["birthdays", user?.id],
            });
            const previous = queryClient.getQueryData<Birthday[]>([
                "birthdays",
                user?.id,
            ]);
            queryClient.setQueryData<Birthday[]>(
                ["birthdays", user?.id],
                (old) =>
                    old?.map((b) =>
                        b.id === updated.id ? { ...b, ...updated } : b,
                    ),
            );
            return { previous };
        },
        onError: (err: Error, _vars, ctx) => {
            // Rollback
            queryClient.setQueryData(["birthdays", user?.id], ctx?.previous);
            toast.error(err.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ["birthdays", user?.id],
            });
        },
    });
}

export function useDeleteBirthday() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("birthdays")
                .delete()
                .eq("id", id);
            if (error) throw new Error(error.message);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({
                queryKey: ["birthdays", user?.id],
            });
            const previous = queryClient.getQueryData<Birthday[]>([
                "birthdays",
                user?.id,
            ]);
            queryClient.setQueryData<Birthday[]>(
                ["birthdays", user?.id],
                (old) => old?.filter((b) => b.id !== id),
            );
            return { previous };
        },
        onError: (err: Error, _vars, ctx) => {
            queryClient.setQueryData(["birthdays", user?.id], ctx?.previous);
            toast.error(err.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ["birthdays", user?.id],
            });
        },
    });
}
