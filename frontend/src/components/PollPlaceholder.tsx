const pollOptions = [
  { label: "Extend library hours during exam weeks", votes: 42 },
  { label: "Add more cross-course project showcases", votes: 36 },
  { label: "Host monthly student networking mixers", votes: 28 },
];

export default function PollPlaceholder() {
  const totalVotes = pollOptions.reduce((sum, option) => sum + option.votes, 0);

  return (
    <div className="poll-placeholder" role="region" aria-label="Campus poll placeholder">
      <div className="poll-placeholder-header">
        <div className="poll-placeholder-kicker">Coming soon</div>
        <div className="poll-placeholder-title">Campus Pulse Poll</div>
        <p className="poll-placeholder-copy">
          Polls will let students quickly vote on campus priorities and ideas.
        </p>
      </div>

      <div className="poll-placeholder-options">
        {pollOptions.map((option) => {
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
    </div>
  );
}
