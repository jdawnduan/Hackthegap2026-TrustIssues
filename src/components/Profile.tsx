import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { JUNIOR } from "../shared/history";
import { calibrationBuckets } from "../shared/scoring";
import { SUBSKILLS } from "../shared/types";
import { useAppState, weeksWithLive } from "../state/store";

export function Profile() {
  const app = useAppState();
  const weeks = weeksWithLive(app);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const radar = SUBSKILLS.map((s) => ({ skill: s.short, [`Week ${first.week}`]: first.scores[s.id], [`Week ${last.week}`]: last.scores[s.id] }));
  const trend = weeks.map((w) => ({ week: `W${w.week}`, ...Object.fromEntries(SUBSKILLS.map((s) => [s.short, w.scores[s.id]])) }));
  const buckets = calibrationBuckets(app.calibration);
  const trapsSeen = weeks.reduce((a, w) => a + w.trapsSeen, 0);
  const trapsCaught = weeks.reduce((a, w) => a + w.trapsCaught, 0);

  return (
    <div className="page stack">
      <div className="panel row between">
        <div>
          <h1>Judgement profile: {JUNIOR.name}</h1>
          <small className="muted">{JUNIOR.role} · week {last.week} · {weeks.reduce((a, w) => a + w.cases, 0)} cases played. Weeks 1–7 are seeded history for the demo; week 8 is live.</small>
        </div>
        <div className="row">
          <div className="score"><small>Traps caught</small><div className="v">{trapsCaught}/{trapsSeen}</div></div>
          <div className="score"><small>Hints per case</small><div className="v">{first.hintsPerCase} → {last.hintsPerCase}</div></div>
          <div className="score"><small>AI help level</small><div className="v">{last.hintsPerCase > 2 ? "Show me" : last.hintsPerCase > 1 ? "Hint only" : "Check my work"}</div></div>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <h4>Week {first.week} vs week {last.week}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radar} outerRadius={110}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name={`Week ${first.week}`} dataKey={`Week ${first.week}`} stroke="var(--muted)" fill="var(--muted)" fillOpacity={0.15} isAnimationActive={false} />
              <Radar name={`Week ${last.week}`} dataKey={`Week ${last.week}`} stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} isAnimationActive={false} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h4>Calibration: stated confidence vs. actual accuracy</h4>
          <table className="data">
            <thead><tr><th>Confidence band</th><th>Said</th><th>Was right</th><th>n</th><th>Read</th></tr></thead>
            <tbody>
              {buckets.map((b) => {
                const gap = b.actualAccuracy === null ? null : b.actualAccuracy - b.statedConfidence;
                return (
                  <tr key={b.band}>
                    <td>{b.band}</td><td>{b.statedConfidence}%</td><td>{b.actualAccuracy === null ? "–" : `${b.actualAccuracy}%`}</td><td>{b.n}</td>
                    <td style={{ textAlign: "left", color: gap !== null && gap < -15 ? "var(--bad)" : gap !== null && gap > 15 ? "var(--warn)" : "var(--good)" }}>
                      {gap === null ? "" : gap < -15 ? "overconfident" : gap > 15 ? "underconfident" : "calibrated"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 8 }}>A well-calibrated trader who says 80% is right about 80% of the time. Overconfidence after an AI recommendation is the pattern we watch for most.</p>
        </div>
      </div>

      <div className="panel">
        <h4>Trend by sub-skill</h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="var(--muted)" />
            <YAxis domain={[0, 100]} stroke="var(--muted)" />
            <Tooltip />
            <Legend />
            {SUBSKILLS.map((s, i) => (
              <Line key={s.id} dataKey={s.short} stroke={["#f26b1d", "#2c5aa0", "#1f8a4c", "#b8860b", "#5b4b8a", "#c6322b"][i]} dot={false} strokeWidth={s.id === "ai_judgement" ? 3 : 1.5} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="two">
        <div className="panel">
          <h4>Replay queue: mistakes that will come back in a new form</h4>
          {app.replay.length === 0 && <p className="muted">Nothing queued.</p>}
          <table className="data">
            <thead><tr><th>Lesson</th><th style={{ textAlign: "left" }}>Missed in</th><th style={{ textAlign: "left" }}>Returns as</th></tr></thead>
            <tbody>{app.replay.map((r, i) => <tr key={i}><td>{r.lesson}</td><td style={{ textAlign: "left" }}>{r.fromCase}</td><td style={{ textAlign: "left" }}>{r.variant}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="panel">
          <h4>For the development conversation</h4>
          <ul className="clean">
            <li><strong>Biggest gain:</strong> {biggestGain(first.scores, last.scores)}</li>
            <li><strong>Still weakest:</strong> {weakest(last.scores)}</li>
            <li><strong>Help fading:</strong> hints per case {first.hintsPerCase} → {last.hintsPerCase}. Next step: shorter countdowns, subtler traps.</li>
            <li><strong>Accountability:</strong> every decision is in the audit trail with the AI proposal, the override and the evidence opened.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function biggestGain(a: Record<string, number>, b: Record<string, number>): string {
  const best = SUBSKILLS.map((s) => ({ s, d: b[s.id] - a[s.id] })).sort((x, y) => y.d - x.d)[0];
  return `${best.s.label} (+${best.d})`;
}
function weakest(b: Record<string, number>): string {
  const w = SUBSKILLS.map((s) => ({ s, v: b[s.id] })).sort((x, y) => x.v - y.v)[0];
  return `${w.s.label} (${w.v})`;
}
