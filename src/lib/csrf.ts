import crypto from "crypto";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function validateCsrfToken(token: string, cookieValue: string): boolean {
  if (!token || !cookieValue) return false;
  if (token.length !== cookieValue.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cookieValue));
  } catch {
    return false;
  }
}
