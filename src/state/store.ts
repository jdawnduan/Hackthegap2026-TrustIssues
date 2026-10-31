// Tiny app state with localStorage persistence (no backend DB needed for the demo).

import { useSyncExternalStore } from "react";
import { SEED_CALIBRATION, SEED_REPLAY, SEED_WEEKS } from "../shared/history";
import type { CalibrationPoint, CaseResult, DraftCase, ReplayItem, Schedule, WeekSnapshot } from "../shared/types";

export interface AppState {
  results: CaseResult[];
  weeks: WeekSnapshot[];
  calibration: CalibrationPoint[];
  replay: ReplayItem[];
  drafts: DraftCase[];
  /** Day-ahead position created in Case 1 (feeds Case 2). */
  case1Position: Schedule | null;
  case1Decision: CaseResult["submission"]["decision"] | null;
}

const KEY = "gate-closure-state-v1";

function initial(): AppState {
  return {
    results: [],
    weeks: SEED_WEEKS,
    calibration: SEED_CALIBRATION,
    replay: SEED_REPLAY,
    drafts: [],
    case1Position: null,
    case1Decision: null,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...(JSON.parse(raw) as AppState) };
  } catch {
    /* ignore */
  }
  return initial();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function resetState() {
  state = initial();
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function recordResult(result: CaseResult) {
  setState((s) => {
    const results = [...s.results.filter((r) => r.caseId !== result.caseId), result];
    const calibration = [...s.calibration, { confidence: result.submission.confidence, correct: result.correct }];
    const replay = [...s.replay];
    if (result.trapCaught === false) {
      replay.push({
        lesson: result.lesson,
        fromCase: `Week ${result.week} · ${result.caseTitle}`,
        variant: "Week 10 · Hydro reservoir already full before a sell bid",
      });
    }
    return { results, calibration, replay };
  });
}

/** Week 8 snapshot computed from live results, merged with the seeded weeks 1–7. */
export function weeksWithLive(s: AppState): WeekSnapshot[] {
  if (!s.results.length) return s.weeks;
  const ids = ["own_book", "fundamentals", "verification", "news", "ai_judgement", "risk"] as const;
  const scores = Object.fromEntries(
    ids.map((id) => {
      const vals = s.results.map((r) => r.scores[id]).filter((v): v is number => v !== null);
      const prev = s.weeks[s.weeks.length - 1].scores[id];
      return [id, vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : prev];
    }),
  ) as WeekSnapshot["scores"];
  const trapsSeen = s.results.filter((r) => r.trapCaught !== null).length;
  const trapsCaught = s.results.filter((r) => r.trapCaught === true).length;
  const hints = s.results.reduce((a, r) => a + r.submission.hintsUsed, 0) / s.results.length;
  return [...s.weeks, { week: 8, scores, cases: s.results.length, trapsCaught, trapsSeen, hintsPerCase: +hints.toFixed(1) }];
}
