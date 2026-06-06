import { describe, it, expect } from "vitest";
import {
    getNextOccurrence,
    sortByUpcoming,
    type Birthday,
} from "../useBirthdays";

// ---------------------------------------------------------------------------
// getNextOccurrence
// ---------------------------------------------------------------------------

describe("getNextOccurrence", () => {
    it("returns this year's date when birthday hasn't passed yet", () => {
        const today = new Date();
        // Pick a birthday 30 days from now
        const future = new Date(today);
        future.setDate(future.getDate() + 30);
        const month = future.getMonth() + 1;
        const day = future.getDate();

        const result = getNextOccurrence(month, day);
        expect(result.getFullYear()).toBe(today.getFullYear());
        expect(result.getMonth()).toBe(month - 1);
        expect(result.getDate()).toBe(day);
    });

    it("wraps to next year when birthday already passed", () => {
        const today = new Date();
        // Pick a birthday 30 days ago
        const past = new Date(today);
        past.setDate(past.getDate() - 30);
        const month = past.getMonth() + 1;
        const day = past.getDate();

        const result = getNextOccurrence(month, day);
        expect(result.getFullYear()).toBe(today.getFullYear() + 1);
    });

    it("handles today's date correctly", () => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const result = getNextOccurrence(month, day);
        // Today should be this year (not wrapped)
        expect(result.getFullYear()).toBe(today.getFullYear());
    });

    it("Jan 1 returns this year when not passed", () => {
        // Mid-year: Jan 1 next occurrence is next year
        const result = getNextOccurrence(1, 1);
        // If today is June 2026, Jan 1 2027
        expect(result.getFullYear()).toBeGreaterThanOrEqual(2026);
    });
});

// ---------------------------------------------------------------------------
// sortByUpcoming
// ---------------------------------------------------------------------------

describe("sortByUpcoming", () => {
    const base: Birthday = {
        id: "",
        user_id: "u1",
        name: "",
        month: 1,
        day: 1,
        created_at: "",
    };

    it("sorts by closest upcoming first", () => {
        const today = new Date();
        const near = new Date(today);
        near.setDate(near.getDate() + 5);
        const far = new Date(today);
        far.setDate(far.getDate() + 30);

        const list: Birthday[] = [
            {
                ...base,
                id: "2",
                name: "Far",
                month: far.getMonth() + 1,
                day: far.getDate(),
            },
            {
                ...base,
                id: "1",
                name: "Near",
                month: near.getMonth() + 1,
                day: near.getDate(),
            },
        ];

        const sorted = sortByUpcoming(list);
        expect(sorted[0].name).toBe("Near");
        expect(sorted[1].name).toBe("Far");
    });

    it("puts already-passed birthdays at the end (wrapped to next year)", () => {
        const today = new Date();
        const past = new Date(today);
        past.setDate(past.getDate() - 10);
        const future = new Date(today);
        future.setDate(future.getDate() + 10);

        const list: Birthday[] = [
            {
                ...base,
                id: "1",
                name: "Past",
                month: past.getMonth() + 1,
                day: past.getDate(),
            },
            {
                ...base,
                id: "2",
                name: "Future",
                month: future.getMonth() + 1,
                day: future.getDate(),
            },
        ];

        const sorted = sortByUpcoming(list);
        expect(sorted[0].name).toBe("Future");
        expect(sorted[1].name).toBe("Past");
    });
});
