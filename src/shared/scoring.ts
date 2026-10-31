// Rule-based scoring. Runs everywhere (offline too). When a Claude key is set,
// the server adds an LLM grade for reasoning quality on top (see server/grade.ts).

import { buildCase2Context, CASE1, CASE2 } from "./cases";
import {
  COPILOT_CASE1_SCHEDULE,
  DA_CLEARED,
  INTRADAY_INDICATIONS,
  REFERENCE_CASE1_SCHEDULE,
  simulateBattery,
} from "./market";
import type {
  CaseDefinition,
  CaseResult,
  Schedule,
  SubskillId,
  Submission,
  TabId,
} from "./types";

export const CLEANUP_KEYWORDS = ["excess", "overflow", "sell back", "resell", "imbalance", "cleanup", "clean up", "80 mwh", "can't store", "cannot store", "too full"];

export interface GradingContext {
  /** Case 2 only: the day-ahead position created in Case 1. */
  position?: Schedule;
}

function text(sub: Submission): string {
  const junior = sub.chat.filter((m) => m.role === "junior").map((m) => m.text).join(" ");
  return `${sub.rationale} ${sub.firstTake} ${junior}`.toLowerCase();
}

function mentions(haystack: string, keywords: string[]): number {
  return keywords.filter((k) => haystack.includes(k.toLowerCase())).length;
}

function opened(sub: Submission, tab: TabId): boolean {
  return sub.tabOpens.some((t) => t.tab === tab);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function gradeWithRules(
  def: CaseDefinition,
  sub: Submission,
  week: number,
  ctx: GradingContext = {},
): CaseResult {
  const t = text(sub);
  const acceptable = def.acceptableDecisions.includes(sub.decision);
  const best = def.bestDecisions.includes(sub.decision);
  const keyOpened = def.keyTabs.filter((k) => opened(sub, k)).length;
  const scores: Record<SubskillId, number | null> = {
    own_book: null,
    fundamentals: null,
    verification: null,
    news: null,
    ai_judgement: null,
    risk: null,
  };
  let pnl: number | null = null;
  let pnlNote = "";
  let trapCaught: boolean | null = null;
  const feedback: string[] = [];

  // Fundamentals: did the junior name the real driver, and look at the market data?
  const driverHits = mentions(t, def.driverKeywords);
  const marketTabs = (["prices", "residual", "weather"] as TabId[]).filter((k) => opened(sub, k)).length;
  scores.fundamentals = clamp(Math.min(driverHits, 3) * 22 + marketTabs * 12);

  // Verification: share of key tabs opened, minus a penalty for very fast decisions.
  scores.verification = clamp((keyOpened / def.keyTabs.length) * 100 - (sub.secondsTaken < 30 ? 25 : 0));

  if (def.id === CASE1.id) {
    const sawAsset = opened(sub, "asset");
    const namedSoc = mentions(t, ["state of charge", "soc", "80%", "80 mwh", "full", "curtail"]) > 0;
    scores.own_book = clamp((sawAsset ? 70 : 0) + (namedSoc ? 30 : 0));
    trapCaught = acceptable;

    if (sub.decision === "accept") scores.ai_judgement = 0;
    else if (best) scores.ai_judgement = 100;
    else if (acceptable) scores.ai_judgement = 75;
    else scores.ai_judgement = 40; // escalate: safe, but did not own the call

    const cleared = sub.decision === "accept" ? [...COPILOT_CASE1_SCHEDULE] : sub.decision === "modify" ? sub.schedule ?? [] : null;
    const reference = simulateBattery(REFERENCE_CASE1_SCHEDULE, DA_CLEARED);
    if (cleared && cleared.length === 24) {
      const sim = simulateBattery(cleared, DA_CLEARED);
      pnl = sim.netEUR - reference.netEUR; // relative to the plan a senior would have run
      if (!sim.feasible) {
        scores.risk = 15;
        pnlNote = `Your schedule nets EUR ${sim.netEUR.toLocaleString("en-US")} after paying about EUR ${sim.correctionCostEUR.toLocaleString("en-US")} to fix it intraday (${sim.issues.join("; ")}). A senior's plan earns EUR ${reference.netEUR.toLocaleString("en-US")}.`;
        feedback.push("The submitted schedule is physically impossible for this battery.");
      } else {
        const share = Math.max(0, sim.netEUR) / reference.netEUR;
        scores.risk = clamp(60 + 40 * Math.min(1, share));
        pnlNote = `Deliverable schedule netting EUR ${sim.netEUR.toLocaleString("en-US")}; a senior's reference plan earns EUR ${reference.netEUR.toLocaleString("en-US")}.`;
      }
    } else {
      pnl = -reference.netEUR;
      scores.risk = sub.decision === "reject" ? 55 : 40;
      pnlNote =
        sub.decision === "reject"
          ? `No bid submitted: safe, but the reference plan would have earned EUR ${reference.netEUR.toLocaleString("en-US")}.`
          : `Escalated: a senior had to step in on a trade inside your limits. Reference plan earns EUR ${reference.netEUR.toLocaleString("en-US")}.`;
    }

    if (!sawAsset) feedback.push("You never opened Asset status, which is where the problem was.");
    if (sub.decision === "accept") feedback.push("You approved a bid the battery could not deliver.");
    if (best) feedback.push("You caught the trap and improved on the copilot's plan.");
  }

  if (def.id === CASE2.id) {
    const position = ctx.position ?? [];
    const c2 = buildCase2Context(position);
    const cleanupAddressed = mentions(t, CLEANUP_KEYWORDS) > 0;
    scores.own_book = clamp((opened(sub, "auction") ? 50 : 0) + (opened(sub, "asset") ? 30 : 0) + 20);
    if (c2.needsCleanup) {
      scores.own_book = clamp((scores.own_book ?? 0) - (cleanupAddressed ? 0 : 50));
      if (!cleanupAddressed) feedback.push("Your position from Case 1 was not deliverable and your plan did not deal with it.");
    }

    const newsOpened = opened(sub, "news");
    const bordersOpened = opened(sub, "borders");
    const newsHits = mentions(t, def.newsKeywords);
    scores.news = clamp((newsOpened ? 35 : 0) + (bordersOpened ? 15 : 0) + Math.min(newsHits, 2) * 25);

    if (best) scores.ai_judgement = keyOpened >= 2 ? 100 : 55; // accepted, but did they verify?
    else if (sub.decision === "escalate") scores.ai_judgement = 40;
    else scores.ai_judgement = 10; // rejected a correct recommendation
    if (best && keyOpened < 2) feedback.push("You accepted a correct recommendation without checking it. Right answer, weak process.");
    if (sub.decision === "reject") feedback.push("The copilot was right this time. Distrusting everything is also a failure mode.");

    const hasLimit = !!sub.priceLimit?.trim();
    const hasUnwind = !!sub.unwindCondition?.trim();
    scores.risk = clamp((hasLimit ? 45 : 0) + (hasUnwind ? 35 : 0) + (acceptable ? 20 : 0));

    // P&L of the intraday shift: sell charging volume in 13–15 back intraday, re-buy at 11:00.
    let gain = 0;
    if (acceptable) {
      [13, 14, 15].forEach((h) => {
        if (position[h] < 0) gain += -position[h] * (INTRADAY_INDICATIONS[h] - INTRADAY_INDICATIONS[11]);
      });
    }
    const cleanupCost = c2.needsCleanup ? c2.positionSim.correctionCostEUR * (cleanupAddressed ? 1 : 1.5) : 0;
    pnl = Math.round(gain - cleanupCost);
    pnlNote = c2.needsCleanup
      ? `Intraday shift ${gain >= 0 ? "+" : ""}EUR ${Math.round(gain).toLocaleString("en-US")}; cleaning up the Case 1 position costs EUR ${Math.round(cleanupCost).toLocaleString("en-US")}${cleanupAddressed ? "" : " (more, because it was left to the imbalance market)"}.`
      : `Intraday shift ${gain >= 0 ? "+" : ""}EUR ${Math.round(gain).toLocaleString("en-US")}.`;
  }

  if (sub.late) {
    scores.risk = clamp((scores.risk ?? 0) - 20);
    feedback.push("You missed the gate-closure countdown.");
  }

  const assessed = Object.values(scores).filter((v): v is number => v !== null);
  const hintPenalty = Math.min(15, sub.hintsUsed * 5);
  const overall = clamp(assessed.reduce((a, b) => a + b, 0) / assessed.length - hintPenalty);

  const rubberStampFlag = sub.decision === "accept" && (sub.secondsTaken < 45 || keyOpened < 2);
  if (rubberStampFlag) feedback.push("Flagged as a possible rubber stamp: fast approval with little evidence checked.");

  return {
    caseId: def.id,
    caseTitle: def.title,
    week,
    submittedAt: new Date().toISOString(),
    submission: sub,
    correct: acceptable,
    trapCaught,
    scores,
    overall,
    pnlEUR: pnl,
    pnlNote,
    lesson: def.lesson,
    seniorWouldHaveChecked: def.seniorWouldHaveChecked,
    feedback: feedback.join(" "),
    gradedBy: "rules",
    rubberStampFlag,
  };
}

/** Calibration: bucket confidence into bands and compare with the hit rate. */
export function calibrationBuckets(points: { confidence: number; correct: boolean }[]) {
  const bands = [
    { label: "0–40%", lo: 0, hi: 40 },
    { label: "41–60%", lo: 41, hi: 60 },
    { label: "61–80%", lo: 61, hi: 80 },
    { label: "81–100%", lo: 81, hi: 100 },
  ];
  return bands.map((b) => {
    const inBand = points.filter((p) => p.confidence >= b.lo && p.confidence <= b.hi);
    const hit = inBand.filter((p) => p.correct).length;
    return {
      band: b.label,
      statedConfidence: Math.round((b.lo + b.hi) / 2),
      actualAccuracy: inBand.length ? Math.round((hit / inBand.length) * 100) : null,
      n: inBand.length,
    };
  });
}
