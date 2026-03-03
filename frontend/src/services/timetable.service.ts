import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { TimetableDraft, TimetableItem } from "../types/timetable";

const USERS = "users";
const TIMETABLE = "timetable";

function parseTimeToMinutes(value: string): number {
  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return hour * 60 + minute;
}

export const TimetableService = {
  async listForUser(userId: string): Promise<TimetableItem[]> {
    const snap = await getDocs(collection(db, USERS, userId, TIMETABLE));
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as TimetableItem);
  },

  async createForUser(userId: string, draft: TimetableDraft): Promise<TimetableItem> {
    const startMinutes = parseTimeToMinutes(draft.startTime);

    const docRef = await addDoc(collection(db, USERS, userId, TIMETABLE), {
      title: draft.title,
      dayOfWeek: draft.dayOfWeek,
      startTime: draft.startTime,
      endTime: draft.endTime,
      startMinutes,
      location: draft.location,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...draft,
      startMinutes,
    };
  },

  async removeForUser(userId: string, timetableId: string): Promise<void> {
    await deleteDoc(doc(db, USERS, userId, TIMETABLE, timetableId));
  },
};
