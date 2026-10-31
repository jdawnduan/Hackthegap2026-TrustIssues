import { CASE1 } from "../shared/cases";
import { SUBSKILLS, TAB_LABELS, type CaseResult } from "../shared/types";
import { useAppState } from "../state/store";

interface Props {
  result: CaseResult;
  onNext: () => void;
  nextLabel: string;
}

export function Debrief({ result, onNext, nextLabel }: Props) {
  const app = useAppState();
  const sub = result.submission;
  const prevWeek = app.weeks[app.weeks.length - 1];
  return (
    <div className="page stack" style={{ maxWidth: 1000 }}>
      <div className={`verdict ${result.correct ? "good" : "bad"}`}>
        <div className="row between">
          <h2>{result.correct ? (result.trapCaught ? "You caught it." : "Good call.") : result.trapCaught === false ? "You fell for it." : "Not the right call."}</h2>
          <span className="pill" style={{ background: "var(--panel)" }}>{result.gradedBy === "claude" ? "Graded by rules + Claude" : "Graded by rules (offline)"}</span>
        </div>
        <p>
          You chose <strong>{sub.decision}</strong> with {sub.confidence}% confidence after {sub.secondsTaken}s, opened {sub.tabOpens.length} tabs and used {sub.hintsUsed} hints.
          {sub.late && " You missed gate closure."}
        </p>
        {result.pnlEUR !== null && (
          <p><strong>P&L vs. a senior's plan:</strong> {result.pnlEUR >= 0 ? "+" : "−"}EUR {Math.abs(result.pnlEUR).toLocaleString("en-US")}. <span style={{ fontWeight: 400 }}>{result.pnlNote}</span></p>
        )}
      </div>

      <div className="two">
        <div className="panel">
          <h4>{result.caseId === CASE1.id ? "What was really going on" : "What the copilot got right, and what you had to check"}</h4>
          <p>{result.caseId === CASE1.id ? "The copilot's market story was true (real prices: -213 and -250 EUR/MWh at midday), but it never looked at the battery. It was 80% full after yesterday's curtailed discharge, so 80 of the 100 MWh it wanted to buy had nowhere to go. On a Sunday there is no morning peak, so the only way to make room was to sell pre-dawn." : "The cloud band was real and the French nuclear headline was noise (French baseload, and the FR→DE border had no capacity left). But a 40 EUR lift on a 200 EUR trough changes nothing: moving the 13:00 charging block to 11:00 would have cost about EUR 8k. The right move was to verify, then hold with a price limit and an unwind rule."}</p>
          <h4 style={{ marginTop: 12 }}>A senior would have checked</h4>
          <ul className="clean">{result.seniorWouldHaveChecked.map((s) => <li key={s}>{s}</li>)}</ul>
          <h4 style={{ marginTop: 12 }}>You opened</h4>
          <p>{sub.tabOpens.length ? sub.tabOpens.map((t) => `${TAB_LABELS[t.tab]} (${t.atSec}s)`).join(" → ") : "nothing"}</p>
        </div>
        <div className="panel">
          <h4>Feedback</h4>
          <p>{result.feedback || "Solid work."}</p>
          <div className="panel" style={{ background: "var(--accent-soft)", borderColor: "transparent", marginTop: 12 }}>
            <h4 style={{ color: "var(--accent)" }}>One lesson</h4>
            <strong>{result.lesson}</strong>
          </div>
          {result.trapCaught === false && (
            <p className="muted" style={{ marginTop: 10 }}>This lesson is queued for replay: it will come back in a different form in a later case.</p>
          )}
          {result.rubberStampFlag && <p className="flag" style={{ marginTop: 10 }}>Flagged on the senior dashboard: fast approval with little evidence.</p>}
        </div>
      </div>

      <div className="panel">
        <h4>Sub-skill scores this case (vs. your week {prevWeek.week} average)</h4>
        <div className="score-grid">
          {SUBSKILLS.map((s) => {
            const v = result.scores[s.id];
            const prev = prevWeek.scores[s.id];
            return (
              <div className="score" key={s.id}>
                <small>{s.label}</small>
                <div className="v">{v === null ? "–" : v}</div>
                {v !== null && <><div className="bar"><i style={{ width: `${v}%` }} /></div><small className={v >= prev ? "" : "flag"}>{v >= prev ? "+" : ""}{v - prev} vs week {prevWeek.week}</small></>}
                {v === null && <small className="muted">not assessed here</small>}
              </div>
            );
          })}
        </div>
        <div className="row between" style={{ marginTop: 14 }}>
          <div><span className="bigstat">{result.overall}</span> <small className="muted">overall (hint penalty applied)</small></div>
          <button className="btn primary" onClick={onNext}>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
