export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollPlaceholder {
  status: "placeholder";
  title: string;
  description: string;
}

export interface ActivePoll {
  status: "live";
  pollId: string;
  title: string;
  options: PollOption[];
  totalVotes: number;
  allowVoteChange: boolean;
  userVoteOptionId: string | null;
}

export type ActivePollResponse = PollPlaceholder | ActivePoll;

export interface PollSummary {
  pollId: string;
  title: string;
  status: "draft" | "live" | "closed";
  active: boolean;
  allowVoteChange: boolean;
  options: PollOption[];
  totalVotes: number;
  createdAt: string | null;
  updatedAt: string | null;
}
