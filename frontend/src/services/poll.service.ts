import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { ActivePollResponse, PollOption, PollSummary } from "../types/poll";

const pollBackendEnabled = import.meta.env.VITE_ENABLE_POLL_CALLABLES === "true";
let pollBackendUnavailable = false;

const pollPlaceholder: ActivePollResponse = {
  status: "placeholder",
  title: "Campus Pulse Poll",
  description: "Polls are not enabled in this environment yet.",
};

type CastPollVoteResult = {
  status: string;
  pollId: string;
  selectedOptionId: string;
  totalVotes: number;
  options: PollOption[];
};

type ListPollsResult = {
  status: string;
  polls: PollSummary[];
};

const getActivePollCallable = httpsCallable<Record<string, never>, ActivePollResponse>(
  functions,
  "getActivePoll",
);

const castPollVoteCallable = httpsCallable<
  { pollId: string; optionId: string },
  CastPollVoteResult
>(
  functions,
  "castPollVote",
);

const createPollCallable = httpsCallable<
  { title: string; options: string[]; allowVoteChange: boolean },
  { status: string; pollId: string }
>(
  functions,
  "createPoll",
);

const listPollsCallable = httpsCallable<Record<string, never>, ListPollsResult>(
  functions,
  "listPolls",
);

const publishPollCallable = httpsCallable<
  { pollId: string },
  { status: string; pollId: string }
>(
  functions,
  "publishPoll",
);

const closePollCallable = httpsCallable<
  { pollId: string },
  { status: string; pollId: string }
>(
  functions,
  "closePoll",
);

function isTransportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("cors") ||
    message.includes("err_failed") ||
    message.includes("internal")
  );
}

function markUnavailableIfTransportError(error: unknown): void {
  if (isTransportError(error)) {
    pollBackendUnavailable = true;
  }
}

function assertPollBackendWritable(): void {
  if (!pollBackendEnabled || pollBackendUnavailable) {
    throw new Error(
      "Poll backend is not available. Deploy poll functions and enable VITE_ENABLE_POLL_CALLABLES=true.",
    );
  }
}

export const PollService = {
  async getActivePoll(): Promise<ActivePollResponse> {
    if (!pollBackendEnabled || pollBackendUnavailable) {
      return pollPlaceholder;
    }

    try {
      const result = await getActivePollCallable({});
      return result.data;
    } catch (error) {
      markUnavailableIfTransportError(error);
      return pollPlaceholder;
    }
  },

  async castVote(pollId: string, optionId: string): Promise<CastPollVoteResult> {
    assertPollBackendWritable();
    try {
      const result = await castPollVoteCallable({pollId, optionId});
      return result.data;
    } catch (error) {
      markUnavailableIfTransportError(error);
      throw error;
    }
  },

  async createPoll(
    title: string,
    options: string[],
    allowVoteChange: boolean,
  ): Promise<string> {
    assertPollBackendWritable();
    try {
      const result = await createPollCallable({title, options, allowVoteChange});
      return result.data.pollId;
    } catch (error) {
      markUnavailableIfTransportError(error);
      throw error;
    }
  },

  async listPolls(): Promise<PollSummary[]> {
    if (!pollBackendEnabled || pollBackendUnavailable) {
      return [];
    }

    try {
      const result = await listPollsCallable({});
      return result.data.polls ?? [];
    } catch (error) {
      markUnavailableIfTransportError(error);
      return [];
    }
  },

  async publishPoll(pollId: string): Promise<void> {
    assertPollBackendWritable();
    try {
      await publishPollCallable({pollId});
    } catch (error) {
      markUnavailableIfTransportError(error);
      throw error;
    }
  },

  async closePoll(pollId: string): Promise<void> {
    assertPollBackendWritable();
    try {
      await closePollCallable({pollId});
    } catch (error) {
      markUnavailableIfTransportError(error);
      throw error;
    }
  },
};
