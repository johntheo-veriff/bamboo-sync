# Firebase for infrastructure, behind adapter interfaces

Firebase is used for all infrastructure (Firestore for the Connection Store, Cloud Functions for the Scheduler, App Hosting for Next.js deployment) because it enables fast initial deployment with minimal ops overhead.

All Firebase-specific code is confined to adapter modules. The rest of the codebase (Sync Engine, BambooHR Client, Google Calendar Client, Sync Runner) depends only on TypeScript interfaces — never on Firebase directly. This means the Firebase adapters can be replaced with AWS (DynamoDB, Lambda, EventBridge) or any other provider without touching application logic.

## Considered options

- **Firebase throughout** — fast to ship, but creates lock-in if adapters are skipped. Rejected.
- **Firebase behind adapters** — chosen. Same deployment speed, but the interface boundary keeps the core logic portable.
- **AWS from the start** — more scalable long-term but significantly more configuration overhead for an early-stage project. Deferred.
