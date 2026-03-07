import type { Timestamp } from "firebase/firestore";
import type { CustomTheme, ThemePreference } from "./theme";

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  nickname?: string;
  interests?: string[];
  description?: string;
  themePreference?: ThemePreference;
  customThemes?: CustomTheme[];
  activeCustomThemeId?: string;
  admin?: boolean;
  createdAt: Timestamp;
}

export type AuthMode = "login" | "register";
