/**
 * Shared date utilities for Edge Functions.
 * Uses native Intl.DateTimeFormat for timezone conversion — no extra libraries needed.
 */

/**
 * Returns the current hour (0-23) in the given IANA timezone.
 */
export function getLocalHour(utcDate: Date, timezone: string): number {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
    });
    return parseInt(formatter.format(utcDate), 10);
}

/**
 * Returns today's date as "YYYY-MM-DD" in the given IANA timezone.
 */
export function getLocalDate(utcDate: Date, timezone: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(utcDate); // en-CA formats as YYYY-MM-DD
}

/**
 * Computes the target notification date for a birthday.
 *
 * Given a birthday (month, day), the number of days before to notify,
 * and a reference year — returns the target date as "YYYY-MM-DD".
 *
 * Handles:
 *   - Month rollover (Jan 2, daysBefore=3 → Dec 30 of previous year)
 *   - Leap day clamping (Feb 29 in non-leap year → Feb 28)
 *
 * Returns null if the birthday date itself is invalid after clamping
 * (e.g., day > 28 for February after clamping). In practice this shouldn't
 * happen because the DB CHECK constraint enforces 1-31.
 */
export function computeTargetDate(
    month: number,
    day: number,
    daysBefore: number,
    year: number,
): string | null {
    // Clamp Feb 29 in non-leap years to Feb 28
    let m = month;
    let d = day;
    if (month === 2 && day === 29) {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (!isLeap) d = 28;
    }

    // Create the birthday date at noon UTC (safe from DST edge cases)
    const birthday = new Date(Date.UTC(year, m - 1, d, 12, 0, 0));

    // Subtract daysBefore days
    const target = new Date(birthday);
    target.setUTCDate(target.getUTCDate() - daysBefore);

    // Format as YYYY-MM-DD
    const y = target.getUTCFullYear();
    const mo = String(target.getUTCMonth() + 1).padStart(2, "0");
    const da = String(target.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
}
