import { useState, useEffect, type FormEvent } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
import type { Birthday, BirthdayInput } from "@/hooks/useBirthdays";

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (input: BirthdayInput & { id?: string }) => void;
    birthday?: Birthday | null; // null → add mode; Birthday → edit mode
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export function AddEditBirthdayDialog({
    open,
    onClose,
    onSave,
    birthday,
}: Props) {
    const isEdit = !!birthday;
    const [name, setName] = useState(birthday?.name ?? "");
    const [month, setMonth] = useState(String(birthday?.month ?? "1"));
    const [day, setDay] = useState(String(birthday?.day ?? "1"));
    const [error, setError] = useState("");

    // Reset form when dialog opens / birthday changes
    useEffect(() => {
        if (open) {
            setName(birthday?.name ?? "");
            setMonth(String(birthday?.month ?? "1"));
            setDay(String(birthday?.day ?? "1"));
            setError("");
        }
    }, [open, birthday]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Name is required.");
            return;
        }
        onSave({
            name: name.trim(),
            month: parseInt(month, 10),
            day: parseInt(day, 10),
            ...(isEdit ? { id: birthday!.id } : {}),
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Edit Birthday" : "Add Birthday"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Update the birthday details."
                            : "Add someone's birthday to your list."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {new Date(
                                                2024,
                                                parseInt(m) - 1,
                                            ).toLocaleString("en", {
                                                month: "long",
                                            })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Day</Label>
                            <Select value={day} onValueChange={setDay}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button type="submit" className="w-full">
                        {isEdit ? "Save Changes" : "Add Birthday"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
