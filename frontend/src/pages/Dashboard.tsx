import { useState } from "react";
import { Cake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirthdayCard } from "@/components/birthdays/BirthdayCard";
import { AddEditBirthdayDialog } from "@/components/birthdays/AddEditBirthdayDialog";
import {
    useBirthdays,
    useCreateBirthday,
    useUpdateBirthday,
    useDeleteBirthday,
    sortByUpcoming,
    type Birthday,
} from "@/hooks/useBirthdays";

export function Dashboard() {
    const { data: birthdays, isLoading, isError, refetch } = useBirthdays();
    const createBirthday = useCreateBirthday();
    const updateBirthday = useUpdateBirthday();
    const deleteBirthday = useDeleteBirthday();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Birthday | null>(null);

    const handleSave = (input: {
        name: string;
        month: number;
        day: number;
        id?: string;
    }) => {
        if (input.id) {
            updateBirthday.mutate(
                input as {
                    name: string;
                    month: number;
                    day: number;
                    id: string;
                },
            );
        } else {
            createBirthday.mutate(input);
        }
    };

    const handleEdit = (bday: Birthday) => {
        setEditing(bday);
        setDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteBirthday.mutate(id);
    };

    const handleOpenAdd = () => {
        setEditing(null);
        setDialogOpen(true);
    };

    // --- Loading ---
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Dashboard
                    </h1>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl bg-muted"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // --- Error ---
    if (isError) {
        return (
            <div className="space-y-4 text-center py-12">
                <p className="text-muted-foreground">
                    Failed to load birthdays.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                    Try again
                </Button>
            </div>
        );
    }

    const sorted = birthdays ? sortByUpcoming(birthdays) : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Dashboard
                </h1>
                <Button onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Birthday
                </Button>
            </div>

            {/* Empty state */}
            {sorted.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Cake className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">
                        No birthdays yet. Add your first one! 🎂
                    </p>
                    <Button variant="outline" onClick={handleOpenAdd}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Birthday
                    </Button>
                </div>
            )}

            {/* List */}
            {sorted.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {sorted.map((bday) => (
                        <BirthdayCard
                            key={bday.id}
                            birthday={bday}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Add / Edit dialog */}
            <AddEditBirthdayDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                birthday={editing}
            />
        </div>
    );
}
