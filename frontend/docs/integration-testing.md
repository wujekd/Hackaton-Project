# Integration Testing

This project uses Firebase emulators for integration tests that need real Auth, Firestore rules, and callable Cloud Functions.

## Commands

Run the full emulator-backed integration suite:

```bash
cd /Users/dw/hackaton/frontend
npm run test:integration
```

Run only the integration Vitest config without starting emulators:

```bash
cd /Users/dw/hackaton/frontend
npm run test:integration:vitest
```

`npm run test:integration` does the following:

1. Builds Cloud Functions from `/Users/dw/hackaton/functions`
2. Starts the Firebase `auth`, `firestore`, and `functions` emulators
3. Runs `vitest` with `vitest.integration.config.ts`
4. Shuts the emulators down when the test run finishes

## Files

- Test config: [frontend/vitest.integration.config.ts](/Users/dw/hackaton/frontend/vitest.integration.config.ts)
- Firebase bootstrap: [frontend/src/services/firebase.ts](/Users/dw/hackaton/frontend/src/services/firebase.ts)
- Emulator admin helpers: [frontend/src/test/firebaseEmulatorAdmin.ts](/Users/dw/hackaton/frontend/src/test/firebaseEmulatorAdmin.ts)
- Firebase emulator config: [firebase.json](/Users/dw/hackaton/firebase.json)

## Current Coverage

### Auth and profile

Covered in [frontend/src/services/auth.integration.test.ts](/Users/dw/hackaton/frontend/src/services/auth.integration.test.ts):

- email/password sign-up
- sign-in after sign-up
- missing profile creation on sign-in
- duplicate sign-up error mapping
- resend verification precondition
- verified-email access checks
- profile updates
- denial of cross-user writes
- denial of `admin` field escalation

### User-owned Firestore data

Covered in [frontend/src/services/user-data.integration.test.ts](/Users/dw/hackaton/frontend/src/services/user-data.integration.test.ts):

- verified users can create, list, and delete timetable entries
- unverified users cannot create timetable entries
- users cannot read another user’s timetable
- verified users can create and remove event signups
- unverified users cannot sign up to events
- users cannot read another user’s event signups

### Messaging and callables

Covered in [frontend/src/services/messaging.integration.test.ts](/Users/dw/hackaton/frontend/src/services/messaging.integration.test.ts):

- deterministic direct-conversation creation
- message persistence through callable functions
- participant snapshot population
- unread count updates
- `markConversationRead`
- non-participant denial
- verified-email gating
- client-side guards for self-chat and empty messages

## Test Helpers

`firebaseEmulatorAdmin.ts` uses the Admin SDK against the local emulators to seed data that is hard or impossible to create through the client SDK alone during tests.

Current helpers:

- `seedEmulatorUser(...)`
- `setEmulatorDocument(...)`
- `deleteEmulatorDocument(...)`
- `uniqueEmail(...)`

Use these helpers when a test needs:

- a verified user
- a pre-seeded admin user
- setup that bypasses client-side Firestore rules

## Adding New Integration Tests

Put new emulator-backed tests under `src/**/*.integration.test.ts`.

Prefer these rules:

1. Use the real client services instead of mocking Firebase.
2. Seed prerequisite users and documents with the admin helper only when needed.
3. Test both the allowed path and at least one denied path for security-sensitive features.
4. Keep one integration suite focused on one domain, for example `auth`, `messaging`, `polls`, or `feedback`.
5. Assert real Firestore state after callable operations, not just returned values.

## Environment Notes

- The Functions emulator currently warns that the host runtime is Node 20 while `functions/package.json` targets Node 22.
- `firebase-tools` currently warns that future versions will require JDK 21 or newer.
- The Functions emulator warns when some Firebase products are not emulated. That is expected for the current integration suite because these tests only rely on Auth, Firestore, and Functions.
