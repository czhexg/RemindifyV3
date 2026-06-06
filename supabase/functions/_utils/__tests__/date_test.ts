/**
 * Unit tests for shared date utilities.
 *
 * Run with: deno test supabase/functions/_utils/__tests__/date_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { computeTargetDate, getLocalHour, getLocalDate } from "../date.ts";

// =============================================================================
// computeTargetDate
// =============================================================================

Deno.test("computeTargetDate: simple case — Jan 5, 3 days before", () => {
    assertEquals(computeTargetDate(1, 5, 3, 2026), "2026-01-02");
});

Deno.test("computeTargetDate: month rollover — Jan 2, 3 days before", () => {
    assertEquals(computeTargetDate(1, 2, 3, 2026), "2025-12-30");
});

Deno.test("computeTargetDate: days_before = 0 (day of birthday)", () => {
    assertEquals(computeTargetDate(6, 15, 0, 2026), "2026-06-15");
});

Deno.test("computeTargetDate: leap day Feb 29 in leap year 2024", () => {
    assertEquals(computeTargetDate(2, 29, 3, 2024), "2024-02-26");
});

Deno.test(
    "computeTargetDate: leap day Feb 29 in non-leap year → clamps to Feb 28",
    () => {
        assertEquals(computeTargetDate(2, 29, 3, 2026), "2026-02-25");
    },
);

Deno.test("computeTargetDate: New Year's Eve with days_before = 1", () => {
    assertEquals(computeTargetDate(1, 1, 1, 2026), "2025-12-31");
});

Deno.test("computeTargetDate: Dec 31, 5 days before", () => {
    assertEquals(computeTargetDate(12, 31, 5, 2026), "2026-12-26");
});

// =============================================================================
// getLocalHour
// =============================================================================

Deno.test("getLocalHour: UTC timezone returns correct hour", () => {
    const d = new Date("2026-06-03T14:30:00Z");
    assertEquals(getLocalHour(d, "UTC"), 14);
});

Deno.test("getLocalHour: Asia/Singapore (UTC+8)", () => {
    const d = new Date("2026-06-03T00:30:00Z");
    assertEquals(getLocalHour(d, "Asia/Singapore"), 8);
});

Deno.test("getLocalHour: America/New_York behind UTC", () => {
    const d = new Date("2026-06-03T12:00:00Z");
    assertEquals(getLocalHour(d, "America/New_York"), 8);
});

// =============================================================================
// getLocalDate
// =============================================================================

Deno.test("getLocalDate: UTC date matches", () => {
    const d = new Date("2026-06-03T14:30:00Z");
    assertEquals(getLocalDate(d, "UTC"), "2026-06-03");
});

Deno.test("getLocalDate: Asia/Singapore crosses midnight", () => {
    const d = new Date("2026-06-02T20:30:00Z");
    assertEquals(getLocalDate(d, "Asia/Singapore"), "2026-06-03");
});
