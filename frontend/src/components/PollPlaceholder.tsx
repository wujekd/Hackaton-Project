import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PollService } from "../services/poll.service";
import { useAuthStore } from "../stores/auth.store";
import type { ActivePollResponse } from "../types/poll";

const sampleOptions = [
  { label: "Extend library hours during exam weeks", votes: 42 },
  { label: "Add more cross-course project showcases", votes: 36 },
  { label: "Host monthly student networking mixers", votes: 28 },
];

export default function PollPlaceholder() {
  const { user } = useAuthStore();
  const [poll, setPoll] = useState<ActivePollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    PollService.getActivePoll()
      .then((result) => {
        if (cancelled) return;
        setPoll(result);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const renderSamplePlaceholder = (title: string, description: string) => {
    const totalVotes = sampleOptions.reduce((sum, option) => sum + option.votes, 0);
    return (
      <>
        <div className="poll-placeholder-header">
          <div className="poll-placeholder-kicker">Coming soon</div>
          <div className="poll-placeholder-title">{title}</div>
          <p className="poll-placeholder-copy">{description}</p>
        </div>

        <div className="poll-placeholder-options">
          {sampleOptions.map((option) => {
            const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            return (
              <div className="poll-placeholder-option" key={option.label}>
                <div className="poll-placeholder-option-row">
                  <span>{option.label}</span>
                  <span>{percent}%</span>
                </div>
                <div className="poll-placeholder-track" role="presentation">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-sm outline" type="button" disabled>
          Voting opens soon
        </button>
      </>
    );
  };

  const handleVote = async (optionId: string) => {
    if (!user || !poll || poll.status !== "live") return;

    setPendingOptionId(optionId);
    setError(null);

    try {
      const result = await PollService.castVote(poll.pollId, optionId);
      setPoll((current) => {
        if (!current || current.status !== "live") return current;
        return {
          ...current,
          options: result.options,
          totalVotes: result.totalVotes,
          userVoteOptionId: result.selectedOptionId,
        };
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cast vote.");
    } finally {
      setPendingOptionId(null);
    }
  };

  const totalVotes = useMemo(() => {
    if (!poll || poll.status !== "live") return 0;
    if (poll.totalVotes > 0) return poll.totalVotes;
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }, [poll]);

  if (loading) {
    return (
      <div className="poll-placeholder" role="region" aria-label="Campus poll">
        <div className="poll-placeholder-header">
          <div className="poll-placeholder-kicker">Loading</div>
          <div className="poll-placeholder-title">Campus Pulse Poll</div>
          <p className="poll-placeholder-copy">Fetching poll details...</p>
        </div>
      </div>
    );
  }

  if (!poll || poll.status === "placeholder") {
    const title = poll?.title ?? "Campus Pulse Poll";
    const description = poll?.description ??
      "Polls will let students quickly vote on campus priorities and ideas.";
    return (
      <div className="poll-placeholder" role="region" aria-label="Campus poll placeholder">
        {error && <div className="auth-error">{error}</div>}
        {renderSamplePlaceholder(title, description)}
      </div>
    );
  }

  const selectedOptionId = poll.userVoteOptionId;
  const voteLocked = !!selectedOptionId && !poll.allowVoteChange;

  return (
    <div className="poll-placeholder" role="region" aria-label="Campus poll">
      <div className="poll-placeholder-header">
        <div className="poll-placeholder-kicker">Live now</div>
        <div className="poll-placeholder-title">{poll.title}</div>
        <p className="poll-placeholder-copy">
          {selectedOptionId ?
            (poll.allowVoteChange ?
              "Your vote is saved. You can still change it." :
              "Your vote has been recorded.") :
            "Cast your vote to help shape campus priorities."}
        </p>
      </div>

      <div className="poll-placeholder-options">
        {poll.options.map((option) => {
          const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const selected = selectedOptionId === option.id;
          const disabled = !user ||
            pendingOptionId !== null ||
            (voteLocked && !selected) ||
            selected;

          return (
            <button
              className={`poll-live-option${selected ? " selected" : ""}`}
              type="button"
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={disabled}
            >
              <div className="poll-placeholder-option-row">
                <span>{option.label}</span>
                <span>{percent}%</span>
              </div>
              <div className="poll-placeholder-track" role="presentation">
                <span style={{ width: `${percent}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="poll-footer-row">
        <span>{totalVotes.toLocaleString()} votes cast</span>
        {!user ? (
          <Link className="btn-sm accent" to="/login">
            Sign in to vote
          </Link>
        ) : pendingOptionId ? (
          <button className="btn-sm outline" type="button" disabled>
            Submitting vote...
          </button>
        ) : selectedOptionId ? (
          <button className="btn-sm outline" type="button" disabled>
            Vote submitted
          </button>
        ) : (
          <button className="btn-sm outline" type="button" disabled>
            Select an option
          </button>
        )}
      </div>
    </div>
  );
}
