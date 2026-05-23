# Google Identity persists independently of the Connection

Google credentials (refresh token + email) are stored in a separate Firestore collection (`google-identities`, keyed by `googleAccountId`) that is never deleted on disconnect or logout. The Connection document no longer owns the Google refresh token.

This means a User who disconnects or logs out does not need to go through Google OAuth again to reconnect. On return, bamboo-sync finds the Google Identity, exchanges the refresh token for a fresh access token, and redirects straight to `/connect`.

## Considered options

- **Tokens embedded in the Connection** — the original design. Simple, but deleting the Connection destroys the refresh token. Every reconnect requires a full Google OAuth round-trip. Rejected because it creates unnecessary friction for a common flow (disconnect → reconnect after an API key change).
- **Tokens in a separate Firestore document, deleted on logout** — logout becomes a heavier operation (Firestore write), and the benefit of skipping OAuth disappears after the first logout. Rejected because logout in this app means "leave this device", not "forget me" — the Google Identity should survive it.
- **Tokens in a separate Firestore document, never deleted by bamboo-sync** — chosen. Logout only clears the `google-account-id` cookie. Disconnect only removes the Connection. The Google Identity is owned by the authentication layer, not the sync layer. Users can revoke bamboo-sync's Google access from their own Google account settings if they want a true clean break.
