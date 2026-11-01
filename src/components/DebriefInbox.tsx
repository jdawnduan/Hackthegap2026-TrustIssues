import { useState } from "react";
import { api } from "../api";
import { TAB_LABELS, type Decision, type DraftCase, type TabId } from "../shared/types";
import { setState, useAppState } from "../state/store";

export const EXAMPLE_NOTE =
  "Tuesday: we got caught by the cloud front over Bavaria. The morning solar forecast looked fine and we charged the battery at 13:00–15:00 on the day-ahead. The 14:30 update cut solar by 6 GW and intraday prices in those hours cleared 30–40 EUR above day-ahead. Should have checked the afternoon update before gate closure.";

/**
 * The draft Claude produced for EXAMPLE_NOTE during a live run, kept verbatim ([check] markers included)
 * so the demo returns it instantly without a round trip. Any other note still goes to the API.
 */
const CANNED_DRAFT: Omit<DraftCase, "id" | "createdAt" | "status"> = {
  sourceNote: EXAMPLE_NOTE,
  draftedBy: "claude",
  title: "Cloud Front over Bavaria: Re-checking the Battery Charge Before Intraday",
  brief:
    "It is the day before delivery, about 14:45 CET [check: confirm whether the 14:30 forecast update was on D-1 or on delivery day; the note is ambiguous]. Your battery cleared a day-ahead charging schedule for 13:00–15:00 tomorrow, based on the morning solar forecast, which showed strong midday PV. A cloud front is moving toward Bavaria. The 14:30 weather update has just arrived and cuts German solar for tomorrow's 13:00–15:00 window by about 6 GW. Intraday trading for tomorrow is open. Decide whether to keep the day-ahead charging schedule or re-optimise the battery on intraday.",
  copilotRecommendation:
    "Keep the day-ahead schedule. The morning forecast showed high midday solar, so 13:00–15:00 remains the cheapest charging window. No action is needed before gate closure.",
  trap:
    "The copilot relies on the morning solar forecast and ignores the 14:30 update. With 6 GW less solar, residual load rises in 13:00–15:00, and intraday prices for those hours are likely to clear well above day-ahead. On the day, they cleared 30–40 EUR/MWh higher. Keeping the schedule means charging in what are no longer cheap hours. It also misses the chance to sell the charging position back on intraday, or to shift charging to cheaper hours. [check: confirm with the desk how the loss materialised, e.g. missed resale value, imbalance, or a shortfall in later discharge revenue]",
  lesson: "Before gate closure, always check the latest weather update against the forecast your position was built on.",
  keyTabs: ["weather", "residual", "prices", "asset", "news"],
  rubric: [
    "Spots that the 14:30 update cuts solar by about 6 GW versus the morning forecast for 13:00–15:00",
    "Links lower solar to higher residual load and expected intraday prices above day-ahead in those hours",
    "Rejects the copilot's 'no action needed' recommendation",
    "Proposes a concrete intraday action, such as selling back the charge, shifting charging to cheaper hours, or reducing charge volume, while respecting battery state-of-charge limits",
    "Acts before the relevant intraday gate closure",
    "Sizes the expected value of the action, e.g. using a 30–40 EUR/MWh spread times the MWh involved [check: confirm battery MW/MWh]",
  ],
  seniorNotes:
    "Correct move: Reject or Modify. The 14:30 update is the key evidence; a junior who opens Weather & solar and compares it with the morning forecast should see the 6 GW cut. Intraday indications for 13:00–15:00 sit 30–40 EUR above day-ahead, so selling the charging position back (or shifting it to 11:00–12:00 if the battery has room) is worth roughly 30–40 EUR/MWh × the MWh scheduled. Accepting the copilot's 'no action' is the trap. Escalation is not required: the trade is within limits.",
  hints: [
    "The copilot's reasoning rests on one forecast. When was it made?",
    "Something changed this afternoon. Which tab would show you a forecast update?",
    "Open Weather & solar and compare the 14:30 solar numbers for 13:00–15:00 with this morning's. Then look at the intraday indications.",
  ],
  challengeQuestions: [
    "Which forecast is the copilot's plan built on, and is it still the latest one?",
    "If solar is 6 GW lower at 14:00, what happens to residual load and to the intraday price?",
    "What is the charging position worth if you sell it back now, and what does keeping it cost?",
    "What would make you unwind the intraday trade tomorrow morning?",
  ],
  countdownSec: 240,
  acceptableDecisions: ["reject", "modify"],
  dataSources: [
    { label: "Day-ahead prices (Energy-Charts / SMARD)", url: "https://api.energy-charts.info/price?bzn=DE-LU" },
    { label: "Solar & wind forecast, 14:30 update (Energy-Charts)", url: "https://api.energy-charts.info/public_power?country=de" },
    { label: "Weather update, southern Germany (Open-Meteo)", url: "https://api.open-meteo.com/v1/forecast?latitude=48.14&longitude=11.58&hourly=cloud_cover,shortwave_radiation" },
    { label: "Battery state of charge (asset system, internal)", url: "internal://assets/battery-sued-1/soc" },
    { label: "Intraday indications (desk feed, internal)", url: "internal://trading/intraday/DE-LU/indications" },
  ],
};

const ALL_TABS: TabId[] = ["prices", "residual", "weather", "asset", "borders", "auction", "news"];
const ALL_DECISIONS: Decision[] = ["accept", "modify", "reject", "escalate"];

/** Fill the extended setup for drafts that came back from the API with only the short fields. */
function completeDraft(d: DraftCase): DraftCase {
  return {
    ...d,
    seniorNotes:
      d.seniorNotes ??
      `Correct move: catch the trap described in the draft (${d.trap}). Senior to confirm the acceptable decisions and the reference answer before approval.`,
    hints: d.hints ?? [
      "What is the copilot's recommendation built on, and have you checked it yourself?",
      `Have you looked at ${d.keyTabs.slice(0, 2).map((t) => TAB_LABELS[t]).join(" and ")}?`,
      `Open ${TAB_LABELS[d.keyTabs[0]]}. Does what you see there match the copilot's story?`,
    ],
    challengeQuestions: d.challengeQuestions ?? [
      "What would change your mind?",
      "What is the downside if the copilot is wrong?",
      "What did you not check?",
    ],
    countdownSec: d.countdownSec ?? 300,
    acceptableDecisions: d.acceptableDecisions ?? ["reject", "modify"],
    dataSources:
      d.dataSources ??
      d.keyTabs.map((t) => ({ label: TAB_LABELS[t], url: `internal://data/${t}` })),
  };
}

export function DebriefInbox() {
  const app = useAppState();
  const [note, setNote] = useState(EXAMPLE_NOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [fullSetup, setFullSetup] = useState<string | null>(null);

  const draft = async () => {
    setError(null);
    const base = { id: `draft-${Date.now()}`, createdAt: new Date().toISOString(), status: "draft" as const };
    setBusy(true);
    // Demo shortcut: the example note returns the draft Claude produced for it in an earlier live run,
    // after a short pause so it still reads as "drafting" on stage.
    if (note.trim() === EXAMPLE_NOTE.trim()) {
      await new Promise((r) => setTimeout(r, 1000));
      setState((s) => ({ drafts: [{ ...base, ...CANNED_DRAFT }, ...s.drafts] }));
      setBusy(false);
      return;
    }
    try {
      const d = await api.draftCase(note);
      setState((s) => ({ drafts: [completeDraft(d), ...s.drafts] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const update = (id: string, patch: Partial<DraftCase>) =>
    setState((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const approve = (id: string) => {
    update(id, { status: "approved", approvedBy: "Senior trader", approvedAt: new Date().toISOString() });
    setEditing(null);
    setFullSetup(null);
  };

  return (
    <div className="page stack">
      <div className="panel">
        <h1>Debrief inbox</h1>
        <p className="muted">Senior traders hold debriefs after difficult days. Paste a note; the AI drafts a new gym case from it. <strong>Nothing reaches a junior until a senior approves it.</strong> Approved cases appear on the juniors' dashboard.</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 110 }} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={draft} disabled={busy || !note.trim()}>{busy ? "Drafting…" : "Draft a case from this note"}</button>
          {error && <span className="flag">{error}</span>}
        </div>
      </div>

      {app.drafts.map((d) => {
        const isEditing = editing === d.id;
        return (
          <div key={d.id} className={`draft ${d.status}`}>
            <div className="row between">
              {isEditing ? (
                <input type="text" value={d.title} onChange={(e) => update(d.id, { title: e.target.value })} style={{ fontWeight: 700, maxWidth: 640 }} />
              ) : (
                <h3 style={{ margin: 0 }}>{d.title}</h3>
              )}
              <div className="row">
                <span className="pill">{d.draftedBy === "claude" ? "drafted by Claude" : "template draft (offline)"}</span>
                <span className={`pill ${d.status === "approved" ? "good" : d.status === "rejected" ? "bad" : "warn"}`}>{d.status}{d.approvedBy ? ` by ${d.approvedBy}` : ""}</span>
              </div>
            </div>
            <div className="two" style={{ marginTop: 8 }}>
              <div>
                <h4>Brief</h4>
                {isEditing ? <textarea value={d.brief} onChange={(e) => update(d.id, { brief: e.target.value })} style={{ minHeight: 120 }} /> : <p>{d.brief}</p>}
                <h4>Copilot recommendation (the trap)</h4>
                {isEditing ? <textarea value={d.copilotRecommendation} onChange={(e) => update(d.id, { copilotRecommendation: e.target.value })} /> : <p>{d.copilotRecommendation}</p>}
                <h4>Trap</h4>
                {isEditing ? <textarea value={d.trap} onChange={(e) => update(d.id, { trap: e.target.value })} style={{ minHeight: 110 }} /> : <p>{d.trap}</p>}
              </div>
              <div>
                <h4>Lesson</h4>
                <input type="text" value={d.lesson} onChange={(e) => update(d.id, { lesson: e.target.value })} disabled={d.status !== "draft"} />
                <h4 style={{ marginTop: 10 }}>Key evidence</h4>
                {isEditing ? (
                  <div className="row">
                    {ALL_TABS.map((t) => (
                      <label key={t} className="pill" style={{ cursor: "pointer" }}>
                        <input type="checkbox" checked={d.keyTabs.includes(t)} onChange={(e) => update(d.id, { keyTabs: e.target.checked ? [...d.keyTabs, t] : d.keyTabs.filter((k) => k !== t) })} /> {TAB_LABELS[t]}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p>{d.keyTabs.map((k) => TAB_LABELS[k]).join(", ")}</p>
                )}
                <h4>Rubric</h4>
                {isEditing ? (
                  <textarea value={d.rubric.join("\n")} onChange={(e) => update(d.id, { rubric: e.target.value.split("\n").filter((l) => l.trim()) })} style={{ minHeight: 140 }} />
                ) : (
                  <ul className="clean">{d.rubric.map((r, i) => <li key={i}>{r}</li>)}</ul>
                )}
              </div>
            </div>
            {d.status === "draft" && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary sm" onClick={() => approve(d.id)}>Approve into the gym</button>
                {isEditing ? (
                  <button className="btn sm" onClick={() => setEditing(null)}>Done editing</button>
                ) : (
                  <button className="btn sm" onClick={() => setEditing(d.id)}>Modify</button>
                )}
                <button className="btn sm" onClick={() => setFullSetup(d.id)}>⤢ Full case setup</button>
                <button className="btn sm" onClick={() => update(d.id, { status: "rejected" })}>Reject</button>
                <small className="muted">Source note: “{d.sourceNote.slice(0, 90)}{d.sourceNote.length > 90 ? "…" : ""}”</small>
              </div>
            )}
            {d.status === "approved" && (
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setFullSetup(d.id)}>View full case setup</button>
                <small className="muted">Now visible on the juniors' dashboard as Case 2.</small>
              </div>
            )}
          </div>
        );
      })}

      {fullSetup && (() => {
        const d0 = app.drafts.find((x) => x.id === fullSetup);
        if (!d0) return null;
        const d = completeDraft(d0);
        const ro = d.status !== "draft";
        const list = (v: string[] | undefined, key: "hints" | "challengeQuestions" | "rubric") =>
          ro ? <ul className="clean">{(v ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul>
             : <textarea value={(v ?? []).join("\n")} onChange={(e) => update(d.id, { [key]: e.target.value.split("\n").filter((l) => l.trim()) } as Partial<DraftCase>)} style={{ minHeight: 90 }} />;
        return (
          <div className="overlay" onClick={() => setFullSetup(null)} role="dialog" aria-modal="true">
            <div className="modal wide setup" onClick={(e) => e.stopPropagation()}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Full case setup</h2>
                  <small className="muted">Everything the gym needs before a junior can play this case. One line per hint, question or rubric item.</small>
                </div>
                <div className="row">
                  {!ro && <button className="btn primary sm" onClick={() => approve(d.id)}>Approve into the gym</button>}
                  <button className="btn sm" onClick={() => setFullSetup(null)}>Close</button>
                </div>
              </div>

              <div className="two">
                <div className="stack">
                  <div className="panel">
                    <h4>What the junior sees</h4>
                    <label className="muted">Title</label>
                    {ro ? <p><strong>{d.title}</strong></p> : <input type="text" value={d.title} onChange={(e) => update(d.id, { title: e.target.value })} />}
                    <label className="muted">Brief</label>
                    {ro ? <p>{d.brief}</p> : <textarea value={d.brief} onChange={(e) => update(d.id, { brief: e.target.value })} style={{ minHeight: 120 }} />}
                    <label className="muted">Copilot recommendation (scripted; the trap)</label>
                    {ro ? <p>{d.copilotRecommendation}</p> : <textarea value={d.copilotRecommendation} onChange={(e) => update(d.id, { copilotRecommendation: e.target.value })} />}
                    <div className="row" style={{ marginTop: 8 }}>
                      <label className="muted">Countdown (seconds)</label>
                      <input type="text" value={String(d.countdownSec)} disabled={ro} onChange={(e) => update(d.id, { countdownSec: Number(e.target.value) || 0 })} style={{ width: 90 }} />
                    </div>
                  </div>
                  <div className="panel">
                    <h4>Data sources available in the case (tabs)</h4>
                    <div className="row" style={{ marginBottom: 8 }}>
                      {ALL_TABS.map((t) => (
                        <label key={t} className={`pill ${d.keyTabs.includes(t) ? "accent" : ""}`} style={{ cursor: ro ? "default" : "pointer" }}>
                          <input type="checkbox" disabled={ro} checked={d.keyTabs.includes(t)} onChange={(e) => update(d.id, { keyTabs: e.target.checked ? [...d.keyTabs, t] : d.keyTabs.filter((k) => k !== t) })} /> {TAB_LABELS[t]}
                        </label>
                      ))}
                    </div>
                    <small className="muted">Highlighted tabs are the key evidence the rubric expects the junior to open.</small>
                    <table className="data" style={{ marginTop: 8 }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Feed</th><th style={{ textAlign: "left" }}>Connection</th></tr></thead>
                      <tbody>
                        {(d.dataSources ?? []).map((src, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: "left" }}>{src.label}</td>
                            <td style={{ textAlign: "left" }}><a className="mono" href={src.url.startsWith("http") ? src.url : undefined} target="_blank" rel="noreferrer" onClick={(e) => { if (!src.url.startsWith("http")) e.preventDefault(); }}>{src.url}</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <small className="muted">internal:// feeds are placeholders for desk systems; the public ones are the APIs this prototype already uses.</small>
                  </div>
                </div>

                <div className="stack">
                  <div className="panel" style={{ borderLeft: "3px solid var(--senior)" }}>
                    <h4>AI senior: hidden notes (system prompt context)</h4>
                    {ro ? <p>{d.seniorNotes}</p> : <textarea value={d.seniorNotes} onChange={(e) => update(d.id, { seniorNotes: e.target.value })} style={{ minHeight: 120 }} />}
                    <label className="muted">Hint ladder (level 1 → 3)</label>
                    {list(d.hints, "hints")}
                    <label className="muted">Challenge questions</label>
                    {list(d.challengeQuestions, "challengeQuestions")}
                    <small className="muted">The senior is told the trap and the acceptable decisions, is instructed never to state them, and climbs the ladder one level at a time only while key evidence is unopened.</small>
                  </div>
                  <div className="panel">
                    <h4>Grading</h4>
                    <label className="muted">Acceptable decisions</label>
                    <div className="row" style={{ marginBottom: 8 }}>
                      {ALL_DECISIONS.map((x) => (
                        <label key={x} className={`pill ${d.acceptableDecisions?.includes(x) ? "good" : ""}`} style={{ cursor: ro ? "default" : "pointer" }}>
                          <input type="checkbox" disabled={ro} checked={d.acceptableDecisions?.includes(x) ?? false} onChange={(e) => update(d.id, { acceptableDecisions: e.target.checked ? [...(d.acceptableDecisions ?? []), x] : (d.acceptableDecisions ?? []).filter((k) => k !== x) })} /> {x}
                        </label>
                      ))}
                    </div>
                    <label className="muted">Trap (revealed in the debrief)</label>
                    {ro ? <p>{d.trap}</p> : <textarea value={d.trap} onChange={(e) => update(d.id, { trap: e.target.value })} style={{ minHeight: 100 }} />}
                    <label className="muted">Rubric</label>
                    {list(d.rubric, "rubric")}
                    <label className="muted">One lesson</label>
                    {ro ? <p><strong>{d.lesson}</strong></p> : <input type="text" value={d.lesson} onChange={(e) => update(d.id, { lesson: e.target.value })} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
