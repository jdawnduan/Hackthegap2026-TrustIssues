import { describe, expect, it } from "vitest";
import { buildCase2Context, CASE1, CASE2, clearedPositionFromCase1, COPILOT_CASE1 } from "./cases";
import { BORDERS_MORNING, COPILOT_CASE1_SCHEDULE, DA_CLEARED, NET_POSITION_GW, REFERENCE_CASE1_SCHEDULE, simulateBattery } from "./market";
import { offlineSeniorTurn } from "./offline";
import { gradeWithRules } from "./scoring";
import type { Submission } from "./types";

const base = (over: Partial<Submission>): Submission => ({
  caseId: CASE1.id,
  decision: "accept",
  confidence: 80,
  rationale: "",
  firstTake: "",
  tabOpens: [],
  chat: [],
  hintsUsed: 0,
  secondsTaken: 120,
  late: false,
  ...over,
});

describe("battery simulator", () => {
  it("rejects the copilot's Case 1 plan because the battery is 80% full", () => {
    const sim = simulateBattery(COPILOT_CASE1_SCHEDULE, DA_CLEARED);
    expect(sim.feasible).toBe(false);
    expect(sim.overflowMWh).toBe(80);
    expect(sim.correctionCostEUR).toBeGreaterThan(0);
  });
  it("accepts the reference plan and earns more than the copilot's headline", () => {
    const sim = simulateBattery(REFERENCE_CASE1_SCHEDULE, DA_CLEARED);
    expect(sim.feasible).toBe(true);
    expect(sim.netEUR).toBeGreaterThan(COPILOT_CASE1.expectedMarginEUR!);
  });
  it("uses the real 11 May 2025 prices: -250 at 13:00, evening peak at 20:00", () => {
    expect(DA_CLEARED[13]).toBeCloseTo(-250.3, 1);
    expect(DA_CLEARED[20]).toBeCloseTo(124.9, 1);
    expect(Math.max(...DA_CLEARED.slice(18, 22))).toBe(DA_CLEARED[20]);
  });
});

describe("ENTSO-E and net-position data", () => {
  it("has published CH capacity and an unpublished (flow-based) FR border", () => {
    const ch = BORDERS_MORNING.find((b) => b.from === "CH" && b.to === "DE-LU");
    const fr = BORDERS_MORNING.find((b) => b.from === "FR" && b.to === "DE-LU");
    expect(ch?.published).toBe(true);
    expect(ch?.minMW).toBeGreaterThanOrEqual(3000);
    expect(fr?.published).toBe(false);
  });
  it("shows Germany exporting more than 10 GW at midday", () => {
    expect(Math.min(...NET_POSITION_GW.slice(11, 15))).toBeLessThan(-10);
  });
});

describe("Case 1 grading", () => {
  it("fails a blind accept and flags it as a rubber stamp", () => {
    const r = gradeWithRules(CASE1, base({ decision: "accept", secondsTaken: 20, rationale: "looks fine" }), 8);
    expect(r.correct).toBe(false);
    expect(r.trapCaught).toBe(false);
    expect(r.scores.ai_judgement).toBe(0);
    expect(r.rubberStampFlag).toBe(true);
    expect(r.pnlEUR).toBeLessThan(0);
  });
  it("rewards a modify with the reference schedule after checking the asset", () => {
    const r = gradeWithRules(
      CASE1,
      base({
        decision: "modify",
        schedule: REFERENCE_CASE1_SCHEDULE,
        rationale: "Battery is 80% full after the curtailment, so discharge in the morning peak first.",
        tabOpens: [{ tab: "asset", atSec: 30 }, { tab: "prices", atSec: 50 }, { tab: "residual", atSec: 70 }],
      }),
      8,
    );
    expect(r.correct).toBe(true);
    expect(r.trapCaught).toBe(true);
    expect(r.scores.ai_judgement).toBe(100);
    expect(r.scores.own_book).toBe(100);
    expect(r.overall).toBeGreaterThan(80);
  });
});

describe("Case 2 builds on Case 1", () => {
  it("adds a cleanup task when Case 1 accepted the flawed bid", () => {
    const pos = clearedPositionFromCase1("accept", undefined);
    const c2 = buildCase2Context(pos);
    expect(c2.needsCleanup).toBe(true);
    expect(c2.cleanupNote).toContain("URGENT");
  });
  it("is clean when Case 1 used the reference schedule", () => {
    const c2 = buildCase2Context(clearedPositionFromCase1("modify", REFERENCE_CASE1_SCHEDULE));
    expect(c2.needsCleanup).toBe(false);
  });
  it("penalises rejecting a correct copilot, rewards verified accept", () => {
    const pos = clearedPositionFromCase1("modify", REFERENCE_CASE1_SCHEDULE);
    const reject = gradeWithRules(CASE2, base({ caseId: CASE2.id, decision: "reject", rationale: "don't trust it" }), 8, { position: pos });
    expect(reject.correct).toBe(false);
    expect(reject.scores.ai_judgement).toBe(10);
    expect(reject.pnlEUR).toBeLessThan(-7000); // re-shifting 13:00 -> 11:00 gives up the -250 price
    const accept = gradeWithRules(
      CASE2,
      base({
        caseId: CASE2.id,
        decision: "accept",
        rationale: "Cloud band confirmed in the weather tab; Flamanville only returns Monday and Germany is exporting at midday, so the French news is noise. Hold.",
        priceLimit: "sell above 20",
        unwindCondition: "reverse if the 18:00 update clears",
        tabOpens: [{ tab: "weather", atSec: 20 }, { tab: "residual", atSec: 40 }, { tab: "news", atSec: 60 }, { tab: "borders", atSec: 70 }],
      }),
      8,
      { position: pos },
    );
    expect(accept.correct).toBe(true);
    expect(accept.scores.ai_judgement).toBe(100);
    expect(accept.scores.risk).toBe(100);
    expect(accept.rubberStampFlag).toBe(false);
    expect(accept.pnlEUR).toBe(0); // holding costs nothing
  });
});

describe("offline senior", () => {
  it("refuses to give the answer", () => {
    const out = offlineSeniorTurn({ caseId: CASE1.id, chat: [{ role: "junior", text: "just tell me the answer" }], tabOpens: [], hintLevelSoFar: 0 });
    expect(out.hintLevel).toBe(0);
    expect(out.reply.toLowerCase()).toContain("not going to give you the answer");
  });
  it("climbs the hint ladder one level at a time while the trap tab is unopened", () => {
    const chat = [{ role: "senior" as const, text: "q" }, { role: "junior" as const, text: "I think we charge at midday" }];
    const out = offlineSeniorTurn({ caseId: CASE1.id, chat, tabOpens: [], hintLevelSoFar: 0 });
    expect(out.hintLevel).toBe(1);
    const out2 = offlineSeniorTurn({ caseId: CASE1.id, chat, tabOpens: [], hintLevelSoFar: 1 });
    expect(out2.hintLevel).toBe(2);
  });
  it("stops hinting once the asset tab is open", () => {
    const chat = [{ role: "senior" as const, text: "q" }, { role: "junior" as const, text: "battery is full" }];
    const out = offlineSeniorTurn({ caseId: CASE1.id, chat, tabOpens: [{ tab: "asset", atSec: 10 }], hintLevelSoFar: 0 });
    expect(out.hintLevel).toBe(0);
  });
});
