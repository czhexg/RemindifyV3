/**
 * Unit tests for token utilities.
 *
 * Run with: deno test supabase/functions/_utils/__tests__/tokens_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isTokenExpired } from "../tokens.ts";

Deno.test("isTokenExpired: token created just now is not expired", () => {
    const justNow = new Date().toISOString();
    assertEquals(isTokenExpired(justNow), false);
});

Deno.test("isTokenExpired: token created 16 minutes ago is expired", () => {
    const sixteenMinAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    assertEquals(isTokenExpired(sixteenMinAgo), true);
});

Deno.test(
    "isTokenExpired: token created exactly 15 minutes ago is not expired",
    () => {
        const fifteenMinAgo = new Date(
            Date.now() - 15 * 60 * 1000,
        ).toISOString();
        assertEquals(isTokenExpired(fifteenMinAgo), false);
    },
);

Deno.test("isTokenExpired: token created 14 minutes ago is not expired", () => {
    const fourteenMinAgo = new Date(Date.now() - 14 * 60 * 1000).toISOString();
    assertEquals(isTokenExpired(fourteenMinAgo), false);
});

Deno.test("isTokenExpired: token created 1 hour ago is expired", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assertEquals(isTokenExpired(oneHourAgo), true);
});
