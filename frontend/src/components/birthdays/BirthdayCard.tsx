import { differenceInDays } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getNextOccurrence, type Birthday } from "@/hooks/useBirthdays";

interface Props {
    birthday: Birthday;
    onEdit: (birthday: Birthday) => void;
    onDelete: (id: string) => void;
}

export function BirthdayCard({ birthday, onEdit, onDelete }: Props) {
    const next = getNextOccurrence(birthday.month, birthday.day);
    const daysUntil = differenceInDays(next, new Date());

    const dateLabel = `${String(birthday.day).padStart(2, "0")}-${String(birthday.month).padStart(2, "0")}`;

    return (
        <Card className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                    <p className="font-medium">{birthday.name}</p>
                    <p className="text-sm text-muted-foreground">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">
                        {daysUntil === 0
                            ? "🎂 Today!"
                            : daysUntil === 1
                              ? "🎂 Tomorrow"
                              : `In ${daysUntil} days`}
                    </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(birthday)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(birthday.id)}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
