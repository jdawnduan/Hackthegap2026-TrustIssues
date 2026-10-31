import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { buildCase2Context, CASE1, CASE2, clearedPositionFromCase1, COPILOT_CASE1 } from "../shared/cases";
import {
  AFTERNOON_FORECAST,
  BATTERY,
  BORDERS_MORNING,
  DA_CLEARED,
  emptySchedule,
  INTRADAY_INDICATIONS,
  MORNING_FORECAST,
  NEWS_AFTERNOON,
  NEWS_MORNING,
} from "../shared/market";
import type { CaseDefinition, CaseResult, ChatMessage, Decision, Schedule, Submission, TabId, TabOpen } from "../shared/types";
import { JUNIOR } from "../shared/history";
import { recordResult, setState, useAppState } from "../state/store";
import { BidTable } from "./BidTable";
import { DataTabs, type TabData } from "./DataTabs";
import { SeniorChat } from "./SeniorChat";

interface Props {
  def: CaseDefinition;
  onDone: (result: CaseResult) => void;
}

type Stage = "firsttake" | "work";

export function CaseDesk({ def, onDone }: Props) {
  const app = useAppState();
  const isCase2 = def.id === CASE2.id;
  const position = useMemo(
    () => (isCase2 ? clearedPositionFromCase1(app.case1Decision ?? undefined, app.case1Position ?? undefined) : null),
    [isCase2, app.case1Decision, app.case1Position],
  );
  const c2 = useMemo(() => (position ? buildCase2Context(position) : null), [position]);
  const copilot = isCase2 && c2 ? c2.copilot : COPILOT_CASE1;

  const tabData: TabData = useMemo(
    () => ({
      forecast: isCase2 ? AFTERNOON_FORECAST : MORNING_FORECAST,
      battery: BATTERY,
      borders: BORDERS_MORNING,
      news: isCase2 ? NEWS_AFTERNOON : NEWS_MORNING,
      auction: isCase2 && c2 ? { position: c2.position, cleared: DA_CLEARED, intraday: INTRADAY_INDICATIONS, issues: c2.positionSim.issues, note: c2.cleanupNote } : undefined,
    }),
    [isCase2, c2],
  );
  const tabs: TabId[] = isCase2
    ? ["auction", "prices", "residual", "weather", "asset", "borders", "news"]
    : ["prices", "residual", "weather", "asset", "borders", "news"];

  // --- timer & logs
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  const remaining = def.countdownSec - elapsed;

  const [stage, setStage] = useState<Stage>("firsttake");
  const [firstTake, setFirstTake] = useState("");
  const [tabOpens, setTabOpens] = useState<TabOpen[]>([]);
  const opened = useMemo(() => new Set(tabOpens.map((t) => t.tab)), [tabOpens]);
  const logOpen = (tab: TabId) =>
    setTabOpens((prev) => (prev.some((t) => t.tab === tab) ? prev : [...prev, { tab, atSec: Math.floor((Date.now() - startRef.current) / 1000) }]));

  // --- chat
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"claude" | "offline" | null>(null);
  const hintLevelSoFar = chat.reduce((m, c) => Math.max(m, c.hintLevel ?? 0), 0);
  const hintsUsed = chat.filter((c) => (c.hintLevel ?? 0) > 0).length;
  const askSenior = async (next: ChatMessage[]) => {
    setBusy(true);
    try {
      const out = await api.senior({ caseId: def.id, chat: next, tabOpens, hintLevelSoFar, position: position ?? undefined });
      setSource(out.source);
      setChat([...next, { role: "senior", text: out.reply, hintLevel: out.hintLevel }]);
    } catch {
      setChat([...next, { role: "senior", text: "(The senior is unavailable right now. Keep going on your own.)" }]);
    } finally {
      setBusy(false);
    }
  };
  const onSend = (text: string) => {
    const next = [...chat, { role: "junior" as const, text }];
    setChat(next);
    void askSenior(next);
  };
  const openingAsked = useRef(false);
  useEffect(() => {
    if (stage === "work" && !openingAsked.current) {
      openingAsked.current = true;
      void askSenior([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // --- decision
  const [decision, setDecision] = useState<Decision | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [rationale, setRationale] = useState("");
  const [priceLimit, setPriceLimit] = useState("");
  const [unwind, setUnwind] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(() => (copilot.schedule ? [...copilot.schedule] : emptySchedule()));
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = decision !== null && rationale.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!decision) return;
    setSubmitting(true);
    const submission: Submission = {
      caseId: def.id,
      decision,
      confidence,
      rationale,
      firstTake,
      schedule: def.usesBidTable && decision === "modify" ? schedule : undefined,
      priceLimit: isCase2 ? priceLimit : undefined,
      unwindCondition: isCase2 ? unwind : undefined,
      tabOpens,
      chat,
      hintsUsed,
      secondsTaken: Math.floor((Date.now() - startRef.current) / 1000),
      late: remaining < 0,
    };
    if (def.id === CASE1.id) setState({ case1Decision: decision, case1Position: decision === "modify" ? schedule : null });
    try {
      const result = await api.grade({ submission, week: JUNIOR.currentWeek, position: position ?? undefined });
      recordResult(result);
      onDone(result);
    } finally {
      setSubmitting(false);
    }
  };

  const mm = Math.floor(Math.abs(remaining) / 60);
  const ss = String(Math.abs(remaining) % 60).padStart(2, "0");

  return (
    <div className="stack">
      <div className="panel row between">
        <div>
          <h1 style={{ marginBottom: 2 }}>{def.title}</h1>
          <small className="muted">{def.clock} · {JUNIOR.name}, week {JUNIOR.currentWeek}</small>
        </div>
        <div className="row">
          <small className="muted">{remaining >= 0 ? "Gate closure in" : "Gate closed"}</small>
          <div className={`countdown ${remaining < 60 ? "low" : ""}`}>{remaining < 0 ? "−" : ""}{mm}:{ss}</div>
        </div>
      </div>

      {stage === "firsttake" && (
        <div className="panel exercise" style={{ maxWidth: 760 }}>
          <h2>Before you see the copilot</h2>
          <p>{def.brief}</p>
          <p><strong>Task:</strong> {def.task}</p>
          {c2?.needsCleanup && <div className="alert" style={{ marginBottom: 10 }}>{c2.cleanupNote}</div>}
          <div className="firsttake">
            <label className="muted" style={{ fontWeight: 600, fontSize: 12 }}>Your first take (one or two lines). What do you expect the right move to be, and what would you check first?</label>
            <textarea value={firstTake} onChange={(e) => setFirstTake(e.target.value)} placeholder="e.g. Sunny day, so charge at midday and sell in the evening. I'd check the battery first." />
            <small className="muted">Logged before the AI's view so we can measure whether the copilot pulls you off a good instinct.</small>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => setStage("work")}>Show the copilot's recommendation</button>
            <button className="btn" onClick={() => setStage("work")}>Skip</button>
          </div>
        </div>
      )}

      {stage === "work" && (
        <div className="grid-desk">
          {/* Left: brief + copilot */}
          <div className="stack">
            <div className="panel plain">
              <h4>Situation</h4>
              <p>{def.brief}</p>
              <p><strong>Task:</strong> {def.task}</p>
              {c2?.needsCleanup && <div className="alert">{c2.cleanupNote}</div>}
            </div>
            <div className="card-copilot">
              <div className="row between"><strong style={{ color: "var(--navy)" }}>AI copilot</strong><span className="pill copilot">recommendation</span></div>
              <h3 style={{ marginTop: 6 }}>{copilot.headline}</h3>
              <p>{copilot.body}</p>
              {copilot.expectedMarginEUR !== undefined && <p><strong>Expected margin:</strong> <span className="num">EUR {copilot.expectedMarginEUR.toLocaleString("en-US")}</span></p>}
              <div className="sources">{copilot.sources.map((s) => <span key={s}>{s}</span>)}</div>
            </div>
          </div>

          {/* Centre: data */}
          <div className="panel">
            <DataTabs tabs={tabs} data={tabData} opened={opened} urgent={c2?.needsCleanup ? ["auction"] : []} onOpen={logOpen} />
          </div>

          {/* Right: senior + decision */}
          <div className="stack">
            <div className="panel exercise">
              <SeniorChat chat={chat} busy={busy} source={source} onSend={onSend} />
            </div>
            <div className="panel exercise">
              <div className="row between" style={{ marginBottom: 8 }}><h3 style={{ margin: 0 }}>Your decision</h3><span className="principle">AI recommends. You decide.</span></div>
              <div className="decisions">
                {(["accept", "modify", "reject", "escalate"] as Decision[]).map((d) => (
                  <button key={d} className={decision === d ? "sel" : ""} onClick={() => setDecision(d)}>{label(d)}</button>
                ))}
              </div>
              {def.usesBidTable && decision === "modify" && (
                <div className="field">
                  <label>Your schedule (starts from the copilot's)</label>
                  <BidTable schedule={schedule} prices={DA_CLEARED} knowsStateOfCharge={opened.has("asset")} onChange={setSchedule} />
                </div>
              )}
              {isCase2 && (decision === "accept" || decision === "modify") && (
                <>
                  <div className="field"><label>Price limit for the intraday trade</label><input type="text" value={priceLimit} onChange={(e) => setPriceLimit(e.target.value)} placeholder="e.g. sell the 13:00 block back only above -60 EUR/MWh" /></div>
                  <div className="field"><label>Unwind condition</label><input type="text" value={unwind} onChange={(e) => setUnwind(e.target.value)} placeholder="e.g. unwind if the 18:00 solar update removes the cloud band" /></div>
                </>
              )}
              <div className="field">
                <label>Confidence: <span className="num">{confidence}%</span></label>
                <input type="range" min={0} max={100} step={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Rationale (one or two lines, say what you checked)</label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="I checked … and therefore …" />
              </div>
              <div className="row between" style={{ marginTop: 10 }}>
                <small className="muted"><span className="num">{opened.size}/{tabs.length}</span> tabs opened · <span className="num">{hintsUsed}</span> hints</small>
                <button className="btn primary" disabled={!canSubmit} onClick={submit}>{submitting ? "Grading…" : "Submit decision"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function label(d: Decision): string {
  return { accept: "Accept", modify: "Modify", reject: "Reject", escalate: "Escalate" }[d];
}
