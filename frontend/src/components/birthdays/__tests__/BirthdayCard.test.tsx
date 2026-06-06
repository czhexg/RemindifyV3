import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BirthdayCard } from "../BirthdayCard";
import type { Birthday } from "@/hooks/useBirthdays";

// Mock date-fns to make "days until" deterministic
vi.mock("date-fns", async () => {
    const actual = await vi.importActual("date-fns");
    return { ...actual };
});

const birthday: Birthday = {
    id: "b1",
    user_id: "u1",
    name: "Alice",
    month: 6,
    day: 15,
    created_at: "2026-01-01T00:00:00Z",
};

describe("BirthdayCard", () => {
    it("renders name and formatted date (DD-MM)", () => {
        render(
            <BirthdayCard
                birthday={birthday}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("15-06")).toBeInTheDocument();
    });

    it("shows 'Today!' when birthday is today", () => {
        const today = new Date();
        const todayBirthday = {
            ...birthday,
            month: today.getMonth() + 1,
            day: today.getDate(),
        };

        render(
            <BirthdayCard
                birthday={todayBirthday}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText(/Today!/)).toBeInTheDocument();
    });

    it("calls onEdit when edit button is clicked", async () => {
        const onEdit = vi.fn();
        render(
            <BirthdayCard
                birthday={birthday}
                onEdit={onEdit}
                onDelete={vi.fn()}
            />,
        );

        const user = userEvent.setup();
        // Edit button appears on hover — but it's always in the DOM
        const buttons = screen.getAllByRole("button");
        await user.click(buttons[0]); // First button is Edit
        expect(onEdit).toHaveBeenCalledWith(birthday);
    });

    it("calls onDelete when delete button is clicked", async () => {
        const onDelete = vi.fn();
        render(
            <BirthdayCard
                birthday={birthday}
                onEdit={vi.fn()}
                onDelete={onDelete}
            />,
        );

        const user = userEvent.setup();
        const buttons = screen.getAllByRole("button");
        await user.click(buttons[1]); // Second button is Delete
        expect(onDelete).toHaveBeenCalledWith("b1");
    });
});
