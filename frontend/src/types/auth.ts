import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  nickname?: string;
  interests?: string[];
  description?: string;
  admin?: boolean;
  createdAt: Timestamp;
}

export type AuthMode = "login" | "register";
