import type { CaseEvent, CaseResult } from "../shared/types";
import { TAB_LABELS } from "../shared/types";

const GLYPH: Record<CaseEvent["type"], string> = {
  case_started: "▶",
  tab_opened: "▤",
  first_take: "✎",
  first_take_skipped: "↷",
  copilot_revealed: "◆",
  junior_message: "›",
  senior_message: "‹",
  decision_selected: "◉",
  schedule_edited: "±",
  submitted: "■",
};

const TITLE: Record<CaseEvent["type"], string> = {
  case_started: "Case opened",
  tab_opened: "Opened data tab",
  first_take: "First take (before the copilot)",
  first_take_skipped: "Skipped the first take",
  copilot_revealed: "Copilot recommendation revealed",
  junior_message: "Junior to senior",
  senior_message: "Senior to junior",
  decision_selected: "Selected decision",
  schedule_edited: "Edited bid schedule",
  submitted: "Submitted",
};

function mmss(t: number): string {
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Full timeline of one case run: what the junior looked at, said, and decided, in order. */
export function RunLogModal({ run, onClose }: { run: CaseResult; onClose: () => void }) {
  const sub = run.submission;
  const events = sub.events ?? [];
  const tabsBeforeReveal = (() => {
    const reveal = events.find((e) => e.type === "copilot_revealed")?.t ?? Infinity;
    return events.filter((e) => e.type === "tab_opened" && e.t <= reveal).length;
  })();
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0 }}>{run.caseTitle}</h2>
            <small className="muted">{new Date(run.submittedAt).toLocaleString()} · week {run.week} · {run.gradedBy === "claude" ? "graded by rules + Claude" : "graded by rules"}</small>
          </div>
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>

        <div className="score-grid" style={{ marginBottom: 12 }}>
          <div className="score"><small>Decision</small><div className="v" style={{ fontSize: 18 }}>{sub.decision}</div><small className={run.correct ? "muted" : "flag"}>{run.correct ? "acceptable" : "not acceptable"}</small></div>
          <div className="score"><small>Confidence</small><div className="v">{sub.confidence}%</div></div>
          <div className="score"><small>Time to decide</small><div className="v">{mmss(sub.secondsTaken)}</div></div>
          <div className="score"><small>Tabs before the copilot</small><div className="v">{tabsBeforeReveal}</div><small className="muted">{sub.tabOpens.length} distinct tabs overall</small></div>
          <div className="score"><small>Hints used</small><div className="v">{sub.hintsUsed}</div></div>
          <div className="score"><small>Overall</small><div className="v">{run.overall}</div></div>
        </div>

        {sub.firstTake && (
          <div className="panel" style={{ marginBottom: 12 }}>
            <h4>First take, before seeing the AI</h4>
            <p style={{ margin: 0 }}>{sub.firstTake}</p>
          </div>
        )}
        <div className="panel" style={{ marginBottom: 12 }}>
          <h4>Rationale submitted</h4>
          <p style={{ margin: 0 }}>{sub.rationale || <span className="muted">none</span>}</p>
          {run.pnlNote && <small className="muted">{run.pnlNote}</small>}
        </div>

        <h4>Timeline</h4>
        {events.length === 0 && <p className="muted">This run was recorded before event logging existed. Tabs opened: {sub.tabOpens.map((t) => TAB_LABELS[t.tab]).join(", ") || "none"}.</p>}
        <ol className="timeline">
          {events.map((e, i) => (
            <li key={i} className={`ev ${e.type}`}>
              <span className="t">{mmss(e.t)}</span>
              <span className="g" aria-hidden>{GLYPH[e.type]}</span>
              <span className="body">
                <span className="title">{TITLE[e.type]}{e.hintLevel ? <span className="pill senior" style={{ marginLeft: 6 }}>hint {e.hintLevel}</span> : null}</span>
                {e.detail && <span className="detail">{e.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** The ⋯ button that opens a run log. */
export function MoreButton({ onClick, title = "View run log" }: { onClick: () => void; title?: string }) {
  return (
    <button className="btn sm more" onClick={onClick} title={title} aria-label={title}>⋯</button>
  );
}
