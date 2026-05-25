# Bamboo Sync

Automatically mirrors your BambooHR time-off and company holidays into Google Calendar as **Out of Office** events.
Events are kept in sync daily. BambooHR is always the source of truth: when an entry is added, updated, or cancelled, the calendar event follows.

---

## How it works

1. **Sign in with Google** — no bamboo-sync account needed.
2. **Confirm the sync preview** — see exactly which time-off entries and holidays will be created before anything touches your calendar.
3. **Done.** Events appear in your primary Google Calendar and sync automatically every day.

You can manage or disconnect at any time from the Management page.

---

## Features

- **Out of Office events** — created with the `outOfOffice` event type so Slack and other integrations respect your availability
- **Daily background sync** — runs at 2 AM UTC via a Firebase scheduled function; creates, updates, and deletes events to match BambooHR's current state
- **Sync preview** — shows all upcoming time-off and a holiday summary before the first sync fires
- **Timezone-aware events** — configurable per-user timezone so events land at midnight–midnight in the right zone regardless of Google Calendar's account settings
- **Manual sync & clear** — trigger a sync on demand or wipe all synced events and start fresh
- **Disconnect options** — disconnect only (keeps events) or disconnect and delete

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend runtime | Firebase App Hosting (Cloud Run) |
| Scheduled sync | Firebase Cloud Functions v2 (Gen 2) |
| Database | Firestore (server-side only — all client access denied) |
| Auth | Google OAuth 2.0 (no third-party auth library) |
| Tests | Vitest |

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Google OAuth callback + BambooHR connect/preview
│   │   ├── connection/    # GET connection info, DELETE (disconnect)
│   │   └── sync/          # POST manual sync, GET/DELETE synced events
│   ├── connect/           # Onboarding UI (sync preview + confirm)
│   └── management/        # Management page (status, timezone, sync, danger zone)
├── lib/
│   ├── google-config.ts   # Shared GoogleCalendarConfig factory
│   ├── google-oauth.ts    # OAuth URL builder, code exchange, token refresh
│   ├── scheduler.ts       # Firebase scheduled function with idempotency lock
│   └── stores.ts          # Firestore store factory
└── modules/
    ├── bamboo-hr-client/         # BambooHR REST API client
    ├── connection-store/         # Firestore adapter for Connection documents
    ├── google-calendar-client/   # Google Calendar REST API client
    ├── google-identity-store/    # Firestore adapter for Google Identity documents
    ├── sync-engine/              # Pure diff logic (no I/O)
    └── sync-runner/              # Orchestrates a full sync end-to-end
```

---

## Local development

### Prerequisites

- Node.js 20+
- A Firebase project with Firestore, App Hosting, and Cloud Functions enabled
- A Google Cloud OAuth 2.0 client (Web application type)
- A BambooHR account with API access

### Environment variables

Create a `.env.local` file at the project root:

```env
BAMBOOHR_SUBDOMAIN=your-company
BAMBOOHR_API_KEY=your-bamboohr-api-key

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> In production these are stored as Firebase secrets (`bamboohr-api-key`, `google-oauth-client-id`, `google-oauth-client-secret`) and injected via `apphosting.yaml`.

### Install and run

```bash
npm install
npm run dev
```

App is available at [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

---

## Deployment

The app is deployed to **Firebase App Hosting** (Next.js runs on Cloud Run). The scheduled sync function is deployed separately via **Firebase Cloud Functions**.

```bash
firebase deploy --only hosting,functions
```

For App Hosting backend deployments, push to `main` — App Hosting picks up the branch automatically.

---

## Architecture notes

### Sync engine

`src/modules/sync-engine` contains the pure diff logic with no I/O. It takes BambooHR entries and existing Google Calendar events and returns three lists: events to create, update, and delete. This is fully unit-tested in isolation.

### Token refresh

Google access tokens expire after one hour. When a request returns 401, the client refreshes the token and retries once. A `WeakMap`-based promise cache ensures concurrent requests (fired in `Promise.all`) share a single refresh call rather than each independently hitting the token endpoint. After a successful refresh, the config object is mutated in-place so subsequent operations in the same sync use the new token directly.

### Idempotency lock

The scheduled function writes a `syncLocks/{date}` document before running. If a lock younger than 30 minutes already exists, the function exits early — preventing duplicate syncs if Cloud Scheduler fires twice. The lock is marked `completed` when done.

### Firestore access

All Firestore reads and writes go through the Firebase Admin SDK in Next.js API routes and Cloud Functions. Client-side Firestore access is blocked entirely by security rules. The browser never touches Firestore directly.

---

## License

Private — internal tooling.
