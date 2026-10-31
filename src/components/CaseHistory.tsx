import { useState } from "react";
import { JUNIOR } from "../shared/history";
import type { CaseResult } from "../shared/types";
import { useAppState } from "../state/store";
import { MoreButton, RunLogModal } from "./RunLog";

/** The junior's own review of past case runs. */
export function CaseHistory() {
  const app = useAppState();
  const [open, setOpen] = useState<CaseResult | null>(null);
  const runs = [...app.runs].reverse();
  return (
    <div className="page stack">
      <div className="panel">
        <h1>My case runs</h1>
        <small className="muted">Every run you have played this session, newest first. Open a run to replay what you looked at, what you said to the senior, and when you decided.</small>
      </div>
      <div className="panel">
        {runs.length === 0 && <p className="muted">No runs yet. Play a case and it will appear here.</p>}
        {runs.length > 0 && (
          <table className="data audit">
            <thead>
              <tr><th>When</th><th style={{ textAlign: "left" }}>Case</th><th style={{ textAlign: "left" }}>Decision</th><th>Conf.</th><th>Time</th><th>Tabs</th><th>Hints</th><th>Outcome</th><th>Score</th><th style={{ textAlign: "left" }}>Lesson</th><th></th></tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.runId}>
                  <td className="mono">{new Date(r.submittedAt).toLocaleTimeString()}</td>
                  <td style={{ textAlign: "left" }}>{r.caseTitle}</td>
                  <td style={{ textAlign: "left" }}><strong>{r.submission.decision}</strong></td>
                  <td>{r.submission.confidence}%</td>
                  <td>{r.submission.secondsTaken}s</td>
                  <td>{r.submission.tabOpens.length}</td>
                  <td>{r.submission.hintsUsed}</td>
                  <td><span className={`pill ${r.correct ? "good" : "bad"}`}>{r.correct ? (r.trapCaught ? "caught it" : "ok") : r.trapCaught === false ? "fell for it" : "wrong"}</span></td>
                  <td><strong>{r.overall}</strong></td>
                  <td style={{ textAlign: "left" }}>{r.lesson}</td>
                  <td><MoreButton onClick={() => setOpen(r)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="footer-note">{JUNIOR.name}'s weeks 1–7 are seeded history and have no run logs; only live runs from this session are listed.</p>
      {open && <RunLogModal run={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
