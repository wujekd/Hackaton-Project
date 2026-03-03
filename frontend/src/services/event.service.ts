import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { EventItem, EventProposal } from "../types/event";

const EVENTS = "events";
const PROPOSALS = "eventProposals";

export const EventService = {
  async getApproved(): Promise<EventItem[]> {
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
      const path = `events/${Date.now()}_${image.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, image);
      imageUrl = await getDownloadURL(storageRef);
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
};
