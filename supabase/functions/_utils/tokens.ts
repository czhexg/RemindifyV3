/**
 * Token-related utilities shared across Edge Functions.
 */

const TOKEN_EXPIRY_MINUTES = 15;

/** Returns true if the token (identified by its created_at timestamp) has expired. */
export function isTokenExpired(createdAt: string): boolean {
    const created = new Date(createdAt).getTime();
    return Date.now() - created > TOKEN_EXPIRY_MINUTES * 60 * 1000;
}
