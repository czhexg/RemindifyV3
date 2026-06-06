/**
 * Unit tests for notification message builders.
 *
 * Run with: deno test supabase/functions/_utils/__tests__/messages_test.ts
 */

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buildEmailBody, buildTelegramBody } from "../messages.ts";

// =============================================================================
// buildEmailBody
// =============================================================================

Deno.test("buildEmailBody: includes name and date", () => {
    const body = buildEmailBody("Alice", 6, 15, 3);
    assertStringIncludes(body, "Alice");
    assertStringIncludes(body, "06-15");
});

Deno.test("buildEmailBody: daysBefore > 1 uses plural", () => {
    const body = buildEmailBody("Bob", 3, 10, 5);
    assertStringIncludes(body, "in 5 days");
    assertStringIncludes(body, "Remindify");
});

Deno.test("buildEmailBody: daysBefore = 1 uses singular", () => {
    const body = buildEmailBody("Charlie", 12, 25, 1);
    assertStringIncludes(body, "in 1 day");
});

Deno.test("buildEmailBody: daysBefore = 0 says today", () => {
    const body = buildEmailBody("Diana", 7, 4, 0);
    assertStringIncludes(body, "today");
});

Deno.test("buildEmailBody: pads single-digit month and day", () => {
    const body = buildEmailBody("Eve", 1, 5, 3);
    assertStringIncludes(body, "01-05");
});

// =============================================================================
// buildTelegramBody
// =============================================================================

Deno.test("buildTelegramBody: includes name and date with Markdown", () => {
    const body = buildTelegramBody("Alice", 6, 15, 3);
    assertStringIncludes(body, "*Birthday Reminder*");
    assertStringIncludes(body, "Alice");
    assertStringIncludes(body, "06-15");
});

Deno.test("buildTelegramBody: daysBefore > 1 uses bold plural", () => {
    const body = buildTelegramBody("Bob", 3, 10, 5);
    assertStringIncludes(body, "*in 5 days*");
});

Deno.test("buildTelegramBody: daysBefore = 1 uses bold singular", () => {
    const body = buildTelegramBody("Charlie", 12, 25, 1);
    assertStringIncludes(body, "*in 1 day*");
});

Deno.test("buildTelegramBody: daysBefore = 0 says today", () => {
    const body = buildTelegramBody("Diana", 7, 4, 0);
    assertStringIncludes(body, "*today*");
});
