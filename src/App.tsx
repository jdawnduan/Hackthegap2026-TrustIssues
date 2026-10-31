import { useEffect, useState } from "react";
import { api } from "./api";
import { CaseDesk } from "./components/CaseDesk";
import { Debrief } from "./components/Debrief";
import { DebriefInbox } from "./components/DebriefInbox";
import { Profile } from "./components/Profile";
import { SeniorDashboard } from "./components/SeniorDashboard";
import { CASE1, CASE2, CASES } from "./shared/cases";
import { JUNIOR } from "./shared/history";
import type { CaseDefinition, CaseResult } from "./shared/types";
import { useAppState } from "./state/store";

type View = "home" | "case" | "debrief" | "profile" | "senior" | "inbox";

export function App() {
  const app = useAppState();
  const [view, setView] = useState<View>("home");
  const [activeCase, setActiveCase] = useState<CaseDefinition | null>(null);
  const [lastResult, setLastResult] = useState<CaseResult | null>(null);
  const [health, setHealth] = useState<{ claude: boolean; model: string | null } | null>(null);
  const [caseKey, setCaseKey] = useState(0);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ claude: false, model: null }));
  }, []);

  const startCase = (def: CaseDefinition) => {
    setActiveCase(def);
    setCaseKey((k) => k + 1);
    setView("case");
  };
  const done1 = app.results.some((r) => r.caseId === CASE1.id);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="dot" />Gate Closure</div>
        <nav className="nav">
          {([["home", "Cases"], ["profile", "Judgement profile"], ["senior", "Senior dashboard"], ["inbox", "Debrief inbox"]] as [View, string][]).map(([v, l]) => (
            <button key={v} className={view === v || (v === "home" && (view === "case" || view === "debrief")) ? "active" : ""} onClick={() => setView(v)}>{l}</button>
          ))}
        </nav>
        <div className="spacer" />
        <span className="pill">{JUNIOR.name} · week {JUNIOR.currentWeek}</span>
        {health && <span className={`pill ${health.claude ? "good" : "warn"}`} title={health.claude ? `Senior and grader run on ${health.model}` : "No ANTHROPIC_API_KEY: scripted senior, rule-based grading"}>{health.claude ? "AI live" : "offline mode"}</span>}
        <span className="pill accent">Team Trust Issues</span>
      </header>

      {view === "home" && (
        <div className="page stack">
          <div className="home-hero">
            <div className="panel">
              <h1>A judgement gym for junior energy traders</h1>
              <p>{JUNIOR.name} is {JUNIOR.currentWeek} weeks into Alpiq's short-term desk. Every case gives her an AI copilot's recommendation under a gate-closure countdown. Sometimes the copilot is wrong. Her job is to find out which, and to say what she checked.</p>
              <p className="muted">Today's two cases are one trading day: the morning bid for a battery, then the afternoon intraday preparation. The second case starts from whatever position the first one created.</p>
              <ul className="clean">
                <li><strong>Learning is measured:</strong> six sub-skills, calibration, hints used, tabs opened, all logged per case.</li>
                <li><strong>Oversight is real:</strong> the junior decides and is accountable; the AI never books a trade; an audit trail flags rubber-stamping.</li>
                <li><strong>Help fades:</strong> the senior's hint ladder only climbs while key evidence is unopened, and the countdown shortens as skills grow.</li>
              </ul>
            </div>
            <div className="stack">
              {CASES.map((c) => {
                const result = app.results.find((r) => r.caseId === c.id);
                const locked = c.id === CASE2.id && !done1;
                return (
                  <div key={c.id} className={`case-tile ${result ? "done" : ""} ${locked ? "locked" : ""}`}>
                    <div className="row between"><h3 style={{ margin: 0 }}>{c.title}</h3><small className="mono muted">{c.clock}</small></div>
                    <p className="muted" style={{ margin: 0 }}>{c.brief}</p>
                    <div className="row between">
                      <small>{Math.round(c.countdownSec / 60)} min · {result ? <span className={`pill ${result.correct ? "good" : "bad"}`}>{result.correct ? "passed" : "failed"} · {result.overall}</span> : locked ? <span className="pill">play Case 1 first</span> : <span className="pill accent">ready</span>}</small>
                      <button className="btn primary sm" disabled={locked} onClick={() => startCase(c)}>{result ? "Replay" : "Start"}</button>
                    </div>
                  </div>
                );
              })}
              <p className="footer-note">Real market day: Sunday 11 May 2025, DE-LU (Energy-Charts / SMARD and Open-Meteo, CC BY 4.0). The junior, the battery and its curtailment, the afternoon cloud update, intraday indications, borders and news are invented. No Alpiq data or people.</p>
            </div>
          </div>
        </div>
      )}

      {view === "case" && activeCase && (
        <div className="page">
          <CaseDesk
            key={caseKey}
            def={activeCase}
            onDone={(r) => {
              setLastResult(r);
              setView("debrief");
            }}
          />
        </div>
      )}

      {view === "debrief" && lastResult && (
        <Debrief
          result={lastResult}
          nextLabel={lastResult.caseId === CASE1.id ? "Continue to Case 2: intraday prep" : "See the judgement profile"}
          onNext={() => (lastResult.caseId === CASE1.id ? startCase(CASE2) : setView("profile"))}
        />
      )}

      {view === "profile" && <Profile />}
      {view === "senior" && <SeniorDashboard />}
      {view === "inbox" && <DebriefInbox />}
    </div>
  );
}
