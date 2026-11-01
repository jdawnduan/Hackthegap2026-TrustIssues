import { useEffect, useState } from "react";
import { api } from "./api";
import { CaseDesk } from "./components/CaseDesk";
import { CaseHistory } from "./components/CaseHistory";
import { WrapUp } from "./components/WrapUp";
import { Debrief } from "./components/Debrief";
import { DebriefInbox } from "./components/DebriefInbox";
import { Profile } from "./components/Profile";
import { SeniorDashboard } from "./components/SeniorDashboard";
import { CASE1, CASE2, CASES, UPCOMING_CASES } from "./shared/cases";
import { JUNIOR } from "./shared/history";
import type { CaseDefinition, CaseResult } from "./shared/types";
import { setState, useAppState } from "./state/store";

type View = "home" | "case" | "debrief" | "profile" | "history" | "senior" | "inbox" | "wrapup";

const JUNIOR_NAV: [View, string][] = [["home", "Cases"], ["profile", "Judgement profile"], ["history", "My case runs"]];
const SENIOR_NAV: [View, string][] = [["senior", "Team dashboard"], ["inbox", "Debrief inbox"]];

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
  const done2 = app.results.some((r) => r.caseId === CASE2.id);
  const approvedDrafts = app.drafts.filter((d) => d.status === "approved");
  const nav = app.role === "junior" ? JUNIOR_NAV : SENIOR_NAV;
  const toggleRole = () => {
    const role = app.role === "junior" ? "senior" : "junior";
    setState({ role });
    setView(role === "junior" ? "home" : "senior");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="dot" />Gate Closure</div>
        <nav className="nav">
          {nav.map(([v, l]) => (
            <button key={v} className={view === v || (v === "home" && (view === "case" || view === "debrief")) ? "active" : ""} onClick={() => setView(v)}>{l}</button>
          ))}
        </nav>
        <div className="spacer" />
        <button className={`btn sm wrapbtn ${view === "wrapup" ? "active" : ""}`} onClick={() => setView("wrapup")}>Wrap-up</button>
        {health && <span className={`pill ${health.claude ? "good" : "warn"}`} title={health.claude ? `Senior and grader run on ${health.model}` : "No ANTHROPIC_API_KEY: scripted senior, rule-based grading"}>{health.claude ? "AI live" : "offline mode"}</span>}
        <span className="pill accent">Team Trust Issues</span>
        <button className={`avatar ${app.role}`} onClick={toggleRole} title={app.role === "junior" ? `${JUNIOR.name}, junior trader · switch to the senior view` : "Senior trader · switch to the junior view"} aria-label="Switch role">
          <span className="initial">{app.role === "junior" ? JUNIOR.name[0] : "S"}</span>
          <span className="who">{app.role === "junior" ? `${JUNIOR.name} · week ${JUNIOR.currentWeek}` : "Senior trader"}</span>
        </button>
      </header>

      {view === "home" && (
        <div className="page stack">
          <div className="home-hero">
            <div className="panel">
              <h1>A judgement gym for junior energy traders</h1>
              <p>{JUNIOR.name} is {JUNIOR.currentWeek} weeks into Alpiq's short-term desk. Every case gives her an AI copilot's recommendation under a gate-closure countdown. Sometimes the copilot is wrong. Her job is to find out which, and to say what she checked.</p>
              <p className="muted">Case 1 is one trading day in two parts: 1a, the morning bid for a battery, and 1b, the afternoon intraday preparation, which starts from whatever position 1a created.</p>
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
                      <small>{Math.round(c.countdownSec / 60)} min · {result ? <span className={`pill ${result.correct ? "good" : "bad"}`}>{result.correct ? "passed" : "failed"} · {result.overall}</span> : locked ? <span className="pill">play Case 1a first</span> : <span className="pill accent">ready</span>}</small>
                      <button className="btn primary sm" disabled={locked} onClick={() => startCase(c)}>{result ? "Replay" : "Start"}</button>
                    </div>
                  </div>
                );
              })}
              {approvedDrafts.map((d, i) => (
                <div key={d.id} className={`case-tile approved-draft ${done2 ? "" : "locked"}`}>
                  <div className="row between"><h3 style={{ margin: 0 }}>Case {2 + i} · {d.title}</h3><small className="mono muted">added {d.approvedAt ? new Date(d.approvedAt).toLocaleTimeString() : "today"}</small></div>
                  <p className="muted" style={{ margin: 0 }}>{d.brief.replace(/\s*\[check:[^\]]*\]/g, "")}</p>
                  <div className="row between">
                    <small>{Math.round((d.countdownSec ?? 300) / 60)} min · <span className="pill good">new · from a desk debrief</span> <span className="pill">approved by {d.approvedBy}</span></small>
                    <button className="btn primary sm" disabled title={done2 ? "Scenario data is being prepared for this case" : "Unlocks after Case 1b"}>{done2 ? "Coming up" : "Play Case 1b first"}</button>
                  </div>
                </div>
              ))}
              {UPCOMING_CASES.map((u, i) => {
                const prereqDone = app.results.some((r) => r.caseId === u.unlocksAfter) && approvedDrafts.length === 0;
                return (
                  <div key={u.id} className={`case-tile upcoming ${prereqDone ? "" : "locked"}`}>
                    <div className="row between"><h3 style={{ margin: 0 }}>Case {2 + approvedDrafts.length + i} · {u.title}</h3><small className="mono muted">{u.clock}</small></div>
                    <p className="muted" style={{ margin: 0 }}>{u.brief}</p>
                    <div className="row between">
                      <small>{u.minutes} min · <span className="pill">{prereqDone ? "next up" : "locked"}</span> <span className="pill senior">{u.tag}</span></small>
                      <button className="btn sm" disabled title={prereqDone ? "Not included in this prototype" : `Unlocks after ${CASES.concat().find((c) => c.id === u.unlocksAfter)?.title.split(" · ")[0] ?? "the previous case"}`}>Locked</button>
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
          nextLabel={lastResult.caseId === CASE1.id ? "Continue to Case 1b: intraday prep" : "See the judgement profile"}
          onNext={() => (lastResult.caseId === CASE1.id ? startCase(CASE2) : setView("profile"))}
        />
      )}

      {view === "profile" && <Profile />}
      {view === "history" && <CaseHistory />}
      {view === "senior" && <SeniorDashboard />}
      {view === "inbox" && <DebriefInbox />}
      {view === "wrapup" && <WrapUp />}
    </div>
  );
}
