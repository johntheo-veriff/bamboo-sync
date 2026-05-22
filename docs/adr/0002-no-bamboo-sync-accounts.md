# No bamboo-sync user accounts

bamboo-sync has no sign-up or login flow of its own. Users establish a Connection once (BambooHR Subdomain + API Key + Google OAuth) and bamboo-sync runs silently in the background from then on. The User's identity is their Google account — that's what identifies the Connection in storage.

This keeps onboarding to three steps and eliminates an entire auth surface. Adding bamboo-sync accounts later would require migrating existing Connections and building password/session infrastructure, so this is a deliberate long-term choice, not an oversight.

## Consequences

- No way for a User to "log in" to bamboo-sync from a new device to manage their Connection. The Management Page is tied to the Google OAuth session established at onboarding — if that session expires, re-auth via Google is the recovery path.
