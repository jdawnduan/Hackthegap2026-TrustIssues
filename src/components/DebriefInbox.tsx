import { useState } from "react";
import { api } from "../api";
import { TAB_LABELS, type DraftCase } from "../shared/types";
import { setState, useAppState } from "../state/store";

const EXAMPLE = "Tuesday: we got caught by the cloud front over Bavaria. The morning solar forecast looked fine and we charged the battery at 13:00–15:00 on the day-ahead. The 14:30 update cut solar by 6 GW and intraday prices in those hours cleared 30–40 EUR above day-ahead. Should have checked the afternoon update before gate closure.";

export function DebriefInbox() {
  const app = useAppState();
  const [note, setNote] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await api.draftCase(note);
      setState((s) => ({ drafts: [d, ...s.drafts] }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const update = (id: string, patch: Partial<DraftCase>) =>
    setState((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));

  return (
    <div className="page stack">
      <div className="panel">
        <h1>Debrief inbox</h1>
        <p className="muted">Senior traders hold debriefs after difficult days. Paste a note; the AI drafts a new gym case from it. <strong>Nothing reaches a junior until a senior approves it.</strong></p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 110 }} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={draft} disabled={busy || !note.trim()}>{busy ? "Drafting…" : "Draft a case from this note"}</button>
          {error && <span className="flag">{error}</span>}
        </div>
      </div>

      {app.drafts.map((d) => (
        <div key={d.id} className={`draft ${d.status}`}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>{d.title}</h3>
            <div className="row">
              <span className="pill">{d.draftedBy === "claude" ? "drafted by Claude" : "template draft (offline)"}</span>
              <span className={`pill ${d.status === "approved" ? "good" : d.status === "rejected" ? "bad" : "warn"}`}>{d.status}{d.approvedBy ? ` by ${d.approvedBy}` : ""}</span>
            </div>
          </div>
          <div className="two" style={{ marginTop: 8 }}>
            <div>
              <h4>Brief</h4><p>{d.brief}</p>
              <h4>Copilot recommendation (the trap)</h4><p>{d.copilotRecommendation}</p>
              <h4>Trap</h4><p>{d.trap}</p>
            </div>
            <div>
              <h4>Lesson</h4><input type="text" value={d.lesson} onChange={(e) => update(d.id, { lesson: e.target.value })} disabled={d.status !== "draft"} />
              <h4 style={{ marginTop: 10 }}>Key evidence</h4><p>{d.keyTabs.map((k) => TAB_LABELS[k]).join(", ")}</p>
              <h4>Rubric</h4><ul className="clean">{d.rubric.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          </div>
          {d.status === "draft" && (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary sm" onClick={() => update(d.id, { status: "approved", approvedBy: "Senior trader" })}>Approve into the gym</button>
              <button className="btn sm" onClick={() => update(d.id, { status: "rejected" })}>Reject</button>
              <small className="muted">Source note: “{d.sourceNote.slice(0, 90)}{d.sourceNote.length > 90 ? "…" : ""}”</small>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
