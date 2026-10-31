/** Closing page for the pitch: the judging rubric and how the gym meets each criterion. */

const ROWS: { criterion: string; weight: string; how: string[] }[] = [
  {
    criterion: "Learning effect",
    weight: "30%",
    how: [
      "Six sub-skills scored on every case: own book, fundamentals, verification, news, AI judgement, risk.",
      "Calibration tracked: stated confidence vs. how often the junior was right.",
      "Help fades: hints per case fall week over week; the hint ladder only climbs while key evidence is unopened.",
      "Missed traps come back later in a new form.",
    ],
  },
  {
    criterion: "Real oversight",
    weight: "25%",
    how: [
      "The junior decides and is accountable; the copilot proposes and never books a trade.",
      "A first take is logged before the AI speaks, so anchoring is measurable.",
      "Every run has a full event log: tabs opened, senior dialogue, decision changes, time to decide.",
      "Rubber-stamp flags on fast approvals with little evidence; a human senior approves every new case.",
    ],
  },
  {
    criterion: "Fit to a real business problem",
    weight: "20%",
    how: [
      "Asset-backed day-ahead bidding and intraday preparation: the daily job on a short-term power desk.",
      "A real market day: Sunday 11 May 2025, German day-ahead at −250 EUR/MWh with residual load below zero.",
      "Messy inputs: a curtailment buried in an ops log, a real but irrelevant French nuclear notice, flow-based borders.",
      "A live gate-closure countdown.",
    ],
  },
  {
    criterion: "Working prototype",
    weight: "15%",
    how: [
      "Two linked cases played end to end today; the second starts from the position the first created.",
      "Live AI senior and grader on Claude, with an offline fallback so the demo never stalls.",
      "Real public data wired in: Energy-Charts, Open-Meteo, ENTSO-E.",
    ],
  },
  {
    criterion: "Honesty about limits",
    weight: "10%",
    how: [
      "Juniors can learn to beat the gym instead of the market: traps must rotate and come from real desk debriefs.",
      "Gamification can reward speed; we score evidence and calibration, never speed.",
      "The AI senior can leak the answer or carry its own blind spots; hints are counted and seniors review transcripts.",
    ],
  },
];

export function WrapUp() {
  return (
    <div className="page stack wrapup">
      <div className="panel plain">
        <h1>How we judge, and how the gym answers</h1>
        <p className="muted">Alpiq's rubric for The Junior Loop, with what we built against each line.</p>
      </div>
      <div className="panel">
        <table className="data rubric">
          <thead>
            <tr><th style={{ textAlign: "left" }}>Criterion</th><th>Weight</th><th style={{ textAlign: "left" }}>How the simulation meets it</th></tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.criterion}>
                <td style={{ textAlign: "left", verticalAlign: "top" }}><strong>{r.criterion}</strong></td>
                <td className="mono" style={{ verticalAlign: "top" }}>{r.weight}</td>
                <td style={{ textAlign: "left" }}>
                  <ul className="clean">{r.how.map((h) => <li key={h}>{h}</li>)}</ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel closing">
        <h2>The goal isn't zero trust. It's calibrated trust.</h2>
        <p className="muted">AI recommends. Human decides. Team Trust Issues · Hack the Gap 2026</p>
      </div>
    </div>
  );
}
