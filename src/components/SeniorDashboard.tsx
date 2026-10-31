import { useState } from "react";
import type { CaseResult } from "../shared/types";
import { TAB_LABELS } from "../shared/types";
import { MoreButton, RunLogModal } from "./RunLog";
import { JUNIOR } from "../shared/history";
import { resetState, useAppState } from "../state/store";

export function SeniorDashboard() {
  const app = useAppState();
  const [open, setOpen] = useState<CaseResult | null>(null);
  const runs = [...app.runs].reverse();
  const flagged = app.results.filter((r) => r.rubberStampFlag).length;
  const overrides = app.results.filter((r) => r.submission.decision !== "accept");
  const overridesRight = overrides.filter((r) => r.correct).length;
  const accepts = app.results.filter((r) => r.submission.decision === "accept");
  const acceptsRight = accepts.filter((r) => r.correct).length;

  return (
    <div className="page stack">
      <div className="panel row between">
        <div>
          <h1>Team dashboard</h1>
          <small className="muted">Audit trail for {JUNIOR.name}'s live decisions this session. Who decided, what the AI proposed, what evidence was opened. Open ⋯ on a row for the full run log.</small>
        </div>
        <button className="btn sm" onClick={() => { if (confirm("Reset all live results and start the day again?")) resetState(); }}>Reset session</button>
      </div>

      <div className="score-grid">
        <div className="score"><small>Runs logged</small><div className="v">{app.runs.length}</div></div>
        <div className="score"><small>Human overruled AI, and was right</small><div className="v">{overrides.length ? `${overridesRight}/${overrides.length}` : "–"}</div></div>
        <div className="score"><small>Human trusted AI, and was right</small><div className="v">{accepts.length ? `${acceptsRight}/${accepts.length}` : "–"}</div></div>
        <div className="score"><small>Rubber-stamp flags</small><div className="v" style={{ color: flagged ? "var(--bad)" : undefined }}>{flagged}</div></div>
      </div>

      <div className="panel">
        <h4>Decision log</h4>
        {runs.length === 0 && <p className="muted">No decisions yet. Play a case first.</p>}
        {runs.length > 0 && (
          <table className="data audit">
            <thead>
              <tr><th>Time</th><th style={{ textAlign: "left" }}>Case</th><th style={{ textAlign: "left" }}>AI said</th><th style={{ textAlign: "left" }}>Junior decided</th><th>Conf.</th><th>Secs</th><th>Hints</th><th style={{ textAlign: "left" }}>Evidence opened</th><th>Outcome</th><th>P&L vs senior</th><th style={{ textAlign: "left" }}>Accountable</th><th></th></tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.runId}>
                  <td className="mono">{new Date(r.submittedAt).toLocaleTimeString()}</td>
                  <td style={{ textAlign: "left" }}>{r.caseTitle}</td>
                  <td style={{ textAlign: "left" }}>{r.caseId.startsWith("c1") ? "Buy 100 MWh midday, sell evening" : "Hold; alert on 18:00 update"}</td>
                  <td style={{ textAlign: "left" }}><strong>{r.submission.decision}</strong>{r.submission.decision === "escalate" && " → senior"}</td>
                  <td>{r.submission.confidence}%</td>
                  <td>{r.submission.secondsTaken}</td>
                  <td>{r.submission.hintsUsed}</td>
                  <td style={{ textAlign: "left" }}>{r.submission.tabOpens.map((t) => TAB_LABELS[t.tab]).join(", ") || <span className="flag">none</span>}</td>
                  <td><span className={`pill ${r.correct ? "good" : "bad"}`}>{r.correct ? "ok" : "wrong"}</span>{r.rubberStampFlag && <span className="pill bad" style={{ marginLeft: 4 }}>stamp</span>}</td>
                  <td style={{ color: (r.pnlEUR ?? 0) < 0 ? "var(--bad)" : undefined }}>{r.pnlEUR === null ? "–" : `${r.pnlEUR >= 0 ? "+" : "−"}${Math.abs(r.pnlEUR).toLocaleString("en-US")}`}</td>
                  <td style={{ textAlign: "left" }}>{r.submission.decision === "escalate" ? "Senior trader" : JUNIOR.name}</td>
                  <td><MoreButton onClick={() => setOpen(r)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="two">
        <div className="panel">
          <h4>Who is accountable</h4>
          <ul className="clean">
            <li><strong>Junior</strong> owns every decision inside their limit, including accepting the AI. "The AI said so" is not a defence; the log shows what they checked.</li>
            <li><strong>Senior</strong> owns escalated decisions and approves every new training case before juniors see it.</li>
            <li><strong>The copilot</strong> owns nothing. It proposes; it never books a trade.</li>
          </ul>
        </div>
        <div className="panel">
          <h4>Rubber-stamp rule</h4>
          <p>A decision is flagged when the junior accepts the AI in under 45 seconds or with fewer than two evidence tabs opened. Flags are reviewed in the weekly debrief, and a flagged junior gets more injected wrong-AI cases the following week.</p>
          <p className="muted">Seniors are kept sharp the same way: a share of the cases they review are known-wrong AI outputs.</p>
        </div>
      </div>
      {open && <RunLogModal run={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
