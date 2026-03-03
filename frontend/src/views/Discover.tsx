import { useState } from "react";

const tags = ["#GameDev", "#MusicProduction", "#GraphicDesign", "#Film", "#Animation", "#WebDev", "#Photography", "#Fashion", "#AI"];

const students = [
  { initials: "TP", name: "Tom Park", role: "Graphic Design - Y3", tags: ["#Branding", "#Illustration"], tone: "av-slate" },
  { initials: "EL", name: "Eva Lima", role: "Music Tech - Y2", tags: ["#Production", "#Ableton"], tone: "av-muted" },
  { initials: "NB", name: "Noah Blake", role: "Film - Y1", tags: ["#Directing", "#Editing"], tone: "av-mid" },
  { initials: "MH", name: "Maya Hassan", role: "Animation - Y3", tags: ["#3D", "#Rigging"], tone: "av-red" },
  { initials: "RC", name: "Ryan Chen", role: "Comp Science - Y2", tags: ["#React", "#APIs"], tone: "av-slate" },
  { initials: "LW", name: "Lily Watts", role: "Fashion - Y2", tags: ["#Textiles", "#Styling"], tone: "av-muted" },
  { initials: "JT", name: "Jake Turner", role: "Photography - Y1", tags: ["#Portrait", "#Lightroom"], tone: "av-mid" },
  { initials: "AD", name: "Amara Diallo", role: "Architecture - Y3", tags: ["#CAD", "#Rhino"], tone: "av-red" },
];

export default function Discover() {
  const [activeTag, setActiveTag] = useState(tags[0]);

  return (
    <div className="page-view">
      <div className="topbar">
        <div className="topbar-title">
          <span>Discover</span>
        </div>
        <div className="topbar-actions">
          <div className="search-bar">
            <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input placeholder="Search students, interests" readOnly />
          </div>
        </div>
      </div>

      <div className="discover-content">
        <div className="sec-head">
          <span className="bar" />
          Browse by Interest
        </div>
        <div className="discover-tags">
          {tags.map((tag) => (
            <button
              className={`filter-pill ${activeTag === tag ? "active" : ""}`}
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="sec-head">
          <span className="bar" />
          All Students
        </div>
        <div className="users-grid">
          {students.map((student) => (
            <article className="user-card" key={student.name}>
              <div className={`avatar ${student.tone}`} style={{ width: 40, height: 40, margin: "0 auto 7px" }}>
                {student.initials}
              </div>
              <div className="user-card-name">{student.name}</div>
              <div className="user-card-role">{student.role}</div>
              <div className="user-card-tags">
                {student.tags.map((tag) => (
                  <span className="mini-tag" key={`${student.name}-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <button className="btn-follow" type="button">Follow</button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
