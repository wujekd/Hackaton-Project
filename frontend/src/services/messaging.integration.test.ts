import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { afterEach, describe, expect, it } from "vitest";
import { auth, db } from "./firebase";
import { AuthService } from "./auth.service";
import { MessagingService } from "./messaging.service";
import { seedEmulatorUser, uniqueEmail } from "../test/firebaseEmulatorAdmin";

type SeededUser = Awaited<ReturnType<typeof seedEmulatorUser>>;

async function signInAs(user: SeededUser): Promise<void> {
  await AuthService.signIn(user.email, user.password);
}

function messageSenderIdentity(user: SeededUser, username: string) {
  return {
    uid: user.uid,
    username,
    email: user.email,
  };
}

describe("MessagingService integration with Firebase emulators", () => {
  afterEach(async () => {
    if (auth.currentUser) {
      await AuthService.signOut();
    }

    window.localStorage.clear();
  });

  it("creates a deterministic direct conversation and sends a message", async () => {
    const alice = await seedEmulatorUser({
      uid: "msg-alice",
      email: uniqueEmail("msg-alice"),
      username: "Alice",
      verified: true,
    });
    const bob = await seedEmulatorUser({
      uid: "msg-bob",
      email: uniqueEmail("msg-bob"),
      username: "Bob",
      verified: true,
    });

    await signInAs(alice);

    const conversationId = await MessagingService.ensureDirectConversation(
      messageSenderIdentity(alice, "Alice"),
      bob.uid,
      { username: "Bob", email: bob.email },
    );

    expect(conversationId).toBe("direct_msg-alice_msg-bob");

    const sameConversationId = await MessagingService.ensureDirectConversation(
      messageSenderIdentity(alice, "Alice"),
      bob.uid,
      { username: "Bob", email: bob.email },
    );

    expect(sameConversationId).toBe(conversationId);

    await MessagingService.sendMessage(conversationId, "  Hello Bob from Alice  ");

    const conversationSnap = await getDoc(doc(db, "conversations", conversationId));
    expect(conversationSnap.exists()).toBe(true);
    expect(conversationSnap.data()).toMatchObject({
      type: "direct",
      participantIds: ["msg-alice", "msg-bob"],
      createdBy: "msg-alice",
      lastMessageText: "Hello Bob from Alice",
      lastMessageSenderId: "msg-alice",
      unreadCountByUser: {
        "msg-alice": 0,
        "msg-bob": 1,
      },
      participantSnapshot: {
        "msg-alice": {
          username: "Alice",
          email: alice.email,
        },
        "msg-bob": {
          username: "Bob",
          email: bob.email,
        },
      },
    });

    const messagesSnap = await getDocs(
      query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "asc"),
      ),
    );

    expect(messagesSnap.docs).toHaveLength(1);
    expect(messagesSnap.docs[0].data()).toMatchObject({
      senderId: "msg-alice",
      senderType: "user",
      text: "Hello Bob from Alice",
      status: "sent",
    });
  });

  it("resets only the current user's unread count when marking a conversation as read", async () => {
    const alice = await seedEmulatorUser({
      uid: "read-alice",
      email: uniqueEmail("read-alice"),
      username: "Alice Read",
      verified: true,
    });
    const bob = await seedEmulatorUser({
      uid: "read-bob",
      email: uniqueEmail("read-bob"),
      username: "Bob Read",
      verified: true,
    });

    await signInAs(alice);
    const conversationId = await MessagingService.ensureDirectConversation(
      messageSenderIdentity(alice, "Alice Read"),
      bob.uid,
      { username: "Bob Read", email: bob.email },
    );
    await MessagingService.sendMessage(conversationId, "First");
    await AuthService.signOut();

    await signInAs(bob);
    await MessagingService.sendMessage(conversationId, "Reply");

    let conversationSnap = await getDoc(doc(db, "conversations", conversationId));
    expect(conversationSnap.data()).toMatchObject({
      unreadCountByUser: {
        "read-alice": 1,
        "read-bob": 0,
      },
      lastMessageSenderId: "read-bob",
      lastMessageText: "Reply",
    });

    await AuthService.signOut();
    await signInAs(alice);
    await MessagingService.markConversationRead(conversationId);

    conversationSnap = await getDoc(doc(db, "conversations", conversationId));
    expect(conversationSnap.data()).toMatchObject({
      unreadCountByUser: {
        "read-alice": 0,
        "read-bob": 0,
      },
    });
  });

  it("rejects non-participants trying to send messages into an existing conversation", async () => {
    const alice = await seedEmulatorUser({
      uid: "deny-alice",
      email: uniqueEmail("deny-alice"),
      username: "Deny Alice",
      verified: true,
    });
    const bob = await seedEmulatorUser({
      uid: "deny-bob",
      email: uniqueEmail("deny-bob"),
      username: "Deny Bob",
      verified: true,
    });
    const eve = await seedEmulatorUser({
      uid: "deny-eve",
      email: uniqueEmail("deny-eve"),
      username: "Deny Eve",
      verified: true,
    });

    await signInAs(alice);
    const conversationId = await MessagingService.ensureDirectConversation(
      messageSenderIdentity(alice, "Deny Alice"),
      bob.uid,
      { username: "Deny Bob", email: bob.email },
    );
    await MessagingService.sendMessage(conversationId, "Private thread");
    await AuthService.signOut();

    await signInAs(eve);

    await expect(MessagingService.sendMessage(conversationId, "I should not be here")).rejects
      .toMatchObject({
        code: "functions/permission-denied",
      });

    await expect(getDoc(doc(db, "conversations", conversationId))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("rejects unverified users before starting direct conversations", async () => {
    const unverified = await seedEmulatorUser({
      uid: "unverified-msg",
      email: uniqueEmail("unverified-msg"),
      username: "Unverified User",
      verified: false,
    });
    const verified = await seedEmulatorUser({
      uid: "verified-msg",
      email: uniqueEmail("verified-msg"),
      username: "Verified User",
      verified: true,
    });

    await signInAs(unverified);

    await expect(
      MessagingService.ensureDirectConversation(
        messageSenderIdentity(unverified, "Unverified User"),
        verified.uid,
        { username: "Verified User", email: verified.email },
      ),
    ).rejects.toMatchObject({
      code: "functions/permission-denied",
    });
  });

  it("rejects self-conversations and empty messages on the client before calling Firebase", async () => {
    const alice = await seedEmulatorUser({
      uid: "client-guard-alice",
      email: uniqueEmail("client-guard-alice"),
      username: "Client Guard Alice",
      verified: true,
    });

    await signInAs(alice);

    await expect(
      MessagingService.ensureDirectConversation(
        messageSenderIdentity(alice, "Client Guard Alice"),
        alice.uid,
      ),
    ).rejects.toThrow("You can't message yourself.");

    await expect(MessagingService.sendMessage("conversation-id", "   ")).rejects.toThrow(
      "Message cannot be empty.",
    );
  });
});
