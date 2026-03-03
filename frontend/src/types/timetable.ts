import type { Timestamp } from "firebase/firestore";

export interface TimetableItem {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  location: string;
  createdAt?: Timestamp;
}

export interface TimetableDraft {
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
}
