import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { deleteObject, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, functions, storage } from "./firebase";
import type { EventItem, EventProposal, EventSignup } from "../types/event";

const EVENTS = "events";
const PROPOSALS = "eventProposals";
const USERS = "users";
const EVENT_SIGNUPS = "eventSignups";

const deleteEventCallable = httpsCallable<
  { eventId: string },
  { status: string; deletedSignupCount: number }
>(
  functions,
  "deleteEvent",
);

async function uploadEventImage(image: File): Promise<string> {
  const path = `events/${Date.now()}_${image.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, image);
  return getDownloadURL(storageRef);
}

export const EventService = {
  async getApproved(): Promise<EventItem[]> {
    const q = query(collection(db, EVENTS), orderBy("date", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventItem);
  },

  async getAllEvents(): Promise<EventItem[]> {
    const q = query(collection(db, EVENTS), orderBy("date", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventItem);
  },

  async getById(id: string): Promise<EventItem | null> {
    const snap = await getDoc(doc(db, EVENTS, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as EventItem;
  },

  async submitProposal(
    data: {
      name: string;
      description: string;
      date: Date;
      authorId: string;
      authorName: string;
    },
    image: File | null,
  ): Promise<string> {
    let imageUrl = "";

    if (image) {
      imageUrl = await uploadEventImage(image);
    }

    const docRef = await addDoc(collection(db, PROPOSALS), {
      name: data.name,
      description: data.description,
      imageUrl,
      date: Timestamp.fromDate(data.date),
      authorId: data.authorId,
      authorName: data.authorName,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  },

  async getProposalsByAuthor(authorId: string): Promise<EventProposal[]> {
    const q = query(
      collection(db, PROPOSALS),
      where("authorId", "==", authorId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventProposal);
  },

  async getPendingProposals(): Promise<EventProposal[]> {
    const q = query(
      collection(db, PROPOSALS),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventProposal);
  },

  async approveProposal(proposal: EventProposal): Promise<void> {
    await addDoc(collection(db, EVENTS), {
      name: proposal.name,
      description: proposal.description,
      imageUrl: proposal.imageUrl,
      date: proposal.date,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, PROPOSALS, proposal.id), { status: "approved" });
  },

  async rejectProposal(id: string): Promise<void> {
    await updateDoc(doc(db, PROPOSALS, id), { status: "rejected" });
  },

  async signUp(userId: string, event: EventItem): Promise<void> {
    const signupRef = doc(db, USERS, userId, EVENT_SIGNUPS, event.id);
    await setDoc(signupRef, {
      eventId: event.id,
      eventName: event.name,
      eventDescription: event.description,
      eventImageUrl: event.imageUrl,
      eventDate: event.date,
      signedUpAt: serverTimestamp(),
    });
  },

  async cancelSignUp(userId: string, eventId: string): Promise<void> {
    await deleteDoc(doc(db, USERS, userId, EVENT_SIGNUPS, eventId));
  },

  async isSignedUp(userId: string, eventId: string): Promise<boolean> {
    const snap = await getDoc(doc(db, USERS, userId, EVENT_SIGNUPS, eventId));
    return snap.exists();
  },

  async getSignups(userId: string): Promise<EventSignup[]> {
    const snap = await getDocs(collection(db, USERS, userId, EVENT_SIGNUPS));
    return snap.docs.map((d) => ({ ...d.data() }) as EventSignup);
  },

  async deleteEventAsAdmin(eventId: string): Promise<number> {
    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) {
      throw new Error("Event id is required.");
    }

    const result = await deleteEventCallable({ eventId: normalizedEventId });
    return result.data.deletedSignupCount ?? 0;
  },

  async updateEventAsAdmin(
    eventId: string,
    data: {
      name: string;
      description: string;
      date: Date;
      existingImageUrl: string;
    },
    nextImage: File | null,
  ): Promise<void> {
    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) {
      throw new Error("Event id is required.");
    }

    let imageUrl = data.existingImageUrl ?? "";

    if (nextImage) {
      imageUrl = await uploadEventImage(nextImage);
    }

    await updateDoc(doc(db, EVENTS, normalizedEventId), {
      name: data.name,
      description: data.description,
      date: Timestamp.fromDate(data.date),
      imageUrl,
      updatedAt: serverTimestamp(),
    });

    if (nextImage && data.existingImageUrl && data.existingImageUrl !== imageUrl) {
      await deleteObject(ref(storage, data.existingImageUrl)).catch(() => undefined);
    }
  },
};
