export interface FeedbackSubmission {
  uid: string;
  subject: string;
  message: string;
  route: string;
  contextLabel: string;
  userName?: string;
  userEmail?: string;
}

export interface FeedbackEntry {
  id: string;
  uid: string;
  userName: string | null;
  userEmail: string | null;
  subject: string;
  message: string;
  route: string;
  contextLabel: string;
  createdAt: string | null;
}
