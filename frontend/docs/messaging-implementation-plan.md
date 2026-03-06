# Messaging System Implementation Plan

## Goal

Implement real user-to-user messaging in the existing `/messages` UI while keeping an explicit **AI chatbot placeholder** that is visible but non-functional.

## Current State (from codebase)

- `frontend/src/views/Messages.tsx` is static mock data.
- The chat input is UI-only placeholder text.
- Message badges in `frontend/src/components/Layout.tsx` are hardcoded (`badge="3"`).
- Firebase Auth + Firestore are already used in the app.
- `firestore.rules` currently allows broad access until **April 2, 2026** and must be replaced for production-safe messaging.

## Scope

### In scope

- Direct messaging (1:1) between signed-in users.
- Conversation list + thread + send message + unread counts.
- Real-time updates with Firestore listeners.
- Mobile and desktop behavior preserved from existing `Messages` view.
- AI chatbot entry kept as a placeholder.

### Out of scope (phase 1)

- Fully functional AI assistant.
- End-to-end encryption.
- Push notifications.
- Media/file attachments in messages.
- Group chat.

## Data Model (Firestore)

### `conversations/{conversationId}`

Suggested fields:

- `type`: `"direct"` | `"ai_placeholder"`
- `participantIds`: `string[]` (UIDs)
- `participantSnapshot`: `{ [uid: string]: { username: string; email: string } }`
- `createdBy`: `string`
- `createdAt`: `Timestamp`
- `updatedAt`: `Timestamp`
- `lastMessageText`: `string`
- `lastMessageSenderId`: `string`
- `lastMessageAt`: `Timestamp`
- `unreadCountByUser`: `{ [uid: string]: number }`

For 1:1 chats, use deterministic IDs to avoid duplicates:

- `direct_${min(uidA, uidB)}_${max(uidA, uidB)}`

### `conversations/{conversationId}/messages/{messageId}`

Suggested fields:

- `senderId`: `string`
- `senderType`: `"user"` | `"ai_placeholder"`
- `text`: `string`
- `createdAt`: `Timestamp`
- `editedAt`: `Timestamp | null`
- `status`: `"sent"` | `"placeholder"`

## Security Rules (required before shipping)

Replace permissive rules with messaging-specific access:

- Only authenticated users can read/write messaging data.
- Read conversation/messages only if `request.auth.uid` is in `participantIds`.
- Create direct conversations only when `participantIds` includes caller and exactly 2 users.
- Message writes only by conversation participants.
- Validate text size and required fields.
- Restrict updates to server-managed metadata (or require Cloud Function path for writes).

## Indexes

Add indexes for:

1. `conversations`: `participantIds` (array contains) + `lastMessageAt desc`
2. `messages` subcollection query: `createdAt asc` (if Firestore requests composite for filters later)

Update `firestore.indexes.json` as soon as messaging queries are finalized.

## Backend/Write Strategy

Use **Cloud Functions** for message writes and read-state updates to keep metadata consistent.

Suggested new functions in `functions/src/index.ts`:

- `sendMessage` (callable or HTTPS):
  - verify auth
  - verify participant membership
  - create message doc
  - update conversation preview + timestamps
  - increment unread counters for recipients
- `markConversationRead`:
  - set caller unread count to `0`

Reason: avoids client-side race conditions and trust issues when updating unread counters and previews.

## Frontend Architecture Changes

### New types

Create `frontend/src/types/message.ts`:

- `Message`
- `Conversation`
- `ConversationType`
- helper view models for unread and timestamps

### New service

Create `frontend/src/services/messaging.service.ts`:

- `subscribeConversations(uid, onData)`
- `subscribeMessages(conversationId, onData, limit?)`
- `getOrCreateDirectConversation(currentUid, otherUid)`
- `sendMessage(conversationId, text)` (through function)
- `markConversationRead(conversationId)` (through function)

### New store

Create `frontend/src/stores/messaging.store.ts`:

- selected conversation ID
- conversation list state
- current thread state
- send state (`idle/sending/error`)
- unread total for nav badge

### Update existing UI

Update `frontend/src/views/Messages.tsx`:

- replace static `conversations` constant with store/service data
- keep current responsive behavior (mobile list/thread split)
- convert input placeholder to real form submit
- add loading, empty, and error states

Update `frontend/src/components/Layout.tsx`:

- replace hardcoded `"3"` badge with store-driven unread total

Update message entry points in:

- `frontend/src/views/Home.tsx`
- `frontend/src/views/Collaborations.tsx`

Use deep links like `/messages?userId=<hostUid>` so tapping “Message Host” opens or creates a direct thread.

## AI Chatbot Placeholder (explicit requirement)

Keep an AI row pinned at top of conversations, but do not connect it to backend yet.

Implementation rule:

- Show a static item: `Collab AI (Coming Soon)`.
- Selecting it opens a local placeholder thread with fixed messages.
- Composer input is disabled in this thread with helper text:
  - `"AI chatbot will be enabled in a future release."`
- Do not store AI placeholder conversation/messages in Firestore.

## Delivery Plan (phased)

1. **Phase 1: Schema + Rules + Indexes**
   - Add collections model and secure rules.
   - Deploy indexes.
2. **Phase 2: Functions**
   - Implement `sendMessage` and `markConversationRead`.
   - Add emulator tests for membership and validation.
3. **Phase 3: Frontend Data Layer**
   - Add message types, service, and Zustand store.
   - Add unit tests for data mapping/state transitions.
4. **Phase 4: UI Integration**
   - Wire `Messages.tsx` to real data.
   - Wire unread badge in `Layout.tsx`.
   - Keep AI placeholder branch.
5. **Phase 5: QA + Hardening**
   - Test mobile/desktop routing and read-state behavior.
   - Verify security rule denial cases in emulator.

## Testing Checklist

- `frontend/src/views/Messages.test.tsx`: preserve current responsive flow tests.
- Add tests for:
  - loading and empty states
  - sending message and optimistic UI
  - unread badge update in layout
  - AI placeholder disables composer
- Add Firestore rules tests (emulator):
  - non-participant cannot read/write
  - participant can send
  - invalid message payload rejected

## Suggested Implementation Order (small PRs)

1. PR A: `types + messaging.service + store` (no UI swap yet)
2. PR B: `Messages.tsx` integration + AI placeholder behavior
3. PR C: Cloud Functions for send/read + frontend hook-up
4. PR D: rules/indexes hardening + tests
