import crypto from "node:crypto";

/**
 * Self-service manage-booking tokens.
 *
 * The raw token (32 bytes, base64url) lives only with the client — in
 * their confirmation email and manage URL. The database stores only a
 * SHA-256 hash, so a database leak cannot be used to manage bookings.
 */

export function generateManageToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** TSM-XXXXXXXX — unambiguous alphabet, crypto-random, non-sequential. */
export function generateBookingReference(): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L
  let ref = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    ref += alphabet[bytes[i] % alphabet.length];
  }
  return `TSM-${ref}`;
}
