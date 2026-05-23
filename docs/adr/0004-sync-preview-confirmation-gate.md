# Sync Preview as a confirmation gate before the first Sync

The first Sync does not fire automatically when a Connection is saved. Instead, onboarding includes a Sync Preview step: BambooHR credentials are validated and the upcoming Time-off Entries and Holidays are fetched and shown to the User. The Connection is saved and the first Sync fires only after the User confirms.

This gives the User confidence that bamboo-sync has read the right BambooHR data before anything is written to their Google Calendar.

## Considered options

- **Fire immediately on connect** — the original behaviour. Connection is saved and the first Sync runs in the background as soon as credentials are submitted. Simpler, but the User has no visibility into what will be synced until they open Google Calendar and check. Rejected because the confirmation step is low-cost and meaningfully increases trust.
- **Sync Preview as informational only** — show the preview after the Connection is saved and the Sync has already started, as a loading screen. Rejected because it provides no real confirmation: the Sync runs regardless of what the User sees.
- **Sync Preview as a confirmation gate** — chosen. The Connection is not saved until the User confirms the preview. The BambooHR data fetched during credential validation is reused for the preview, so no extra API call is needed.
