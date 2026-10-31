// The two MVP cases. Case 2 builds on the position the junior created in Case 1.

import {
  COPILOT_CASE1_SCHEDULE,
  DA_CLEARED,
  emptySchedule,
  hh,
  INTRADAY_INDICATIONS,
  simulateBattery,
} from "./market";
import type { CaseDefinition, CopilotRecommendation, Decision, Schedule } from "./types";

export const CASE1: CaseDefinition = {
  id: "c1-battery-bid",
  order: 1,
  title: "Case 1 · Day-ahead battery bid",
  clock: "Today 09:30 · gate closure 12:00",
  countdownSec: 300,
  brief:
    "You run tomorrow's day-ahead bid for Battery Süd 1 (50 MW / 100 MWh, German zone). The copilot has drafted a bid. The auction closes at 12:00; results come out around 13:00.",
  task: "Review the copilot's bid for tomorrow. Approve it, or correct it and submit your own schedule.",
  aiIsCorrect: false,
  acceptableDecisions: ["modify", "reject"],
  bestDecisions: ["modify"],
  keyTabs: ["asset", "prices", "residual"],
  trapTab: "asset",
  trapDescription:
    "Every market fact in the copilot's note is true, but it ignores the battery's state of charge. The battery is already 80% full (80 MWh) because yesterday evening's discharge was curtailed. It can only absorb 20 MWh, so buying 100 MWh commits Alpiq to 80 MWh it cannot store.",
  seniorHiddenNotes:
    "Correct move: Modify. Discharge in the morning peak first (07:00 50 MW, 08:00 30 MW, prices ~118 and ~112 EUR/MWh) to empty the battery, then charge 12:00–14:00 at negative prices, then discharge 19:00–21:00. That earns roughly EUR 25.6k versus the copilot's EUR 16k headline, and the copilot's plan is physically infeasible (80 MWh overflow, about EUR 3.2k cost to dump back intraday). Reject is acceptable but leaves money on the table. Escalation is not needed: the trade is within the junior's limits.",
  hints: [
    { level: 1, text: "Before you trust a market story, what do you know about your own position going into tomorrow?" },
    { level: 2, text: "The market data looks right. Have you looked at the asset itself, not just the market?" },
    { level: 3, text: "Open the Asset status tab. How full is the battery at midnight, and how much can it still take?" },
  ],
  challengeQuestions: [
    "Where would the 100 MWh physically go?",
    "What's the worst case if this bid clears exactly as written?",
    "What would change your mind about this schedule?",
    "Is there value in the morning peak that the copilot ignored?",
  ],
  lesson: "Check your own book before you trust a market story.",
  seniorWouldHaveChecked: [
    "Asset status: state of charge 80 MWh, curtailment note",
    "Price forecast: morning peak 07:00–09:00 is worth using",
    "Residual load: confirms the midday trough and evening peak",
  ],
  driverKeywords: ["state of charge", "soc", "80", "full", "curtail", "capacity", "room", "morning"],
  newsKeywords: [],
  showsNews: true,
  usesBidTable: true,
};

export const CASE2: CaseDefinition = {
  id: "c2-intraday-prep",
  order: 2,
  title: "Case 2 · Intraday preparation",
  clock: "Today 15:00 · auction results are in",
  countdownSec: 240,
  brief:
    "The day-ahead auction has cleared and your position for tomorrow is fixed. The afternoon forecast update is in. Prepare tomorrow's intraday plan.",
  task: "Should we adjust the position tomorrow, by how much, and what will you watch? Set a price limit and a condition to unwind.",
  aiIsCorrect: true,
  acceptableDecisions: ["accept", "modify"],
  bestDecisions: ["accept", "modify"],
  keyTabs: ["weather", "residual", "news"],
  trapDescription:
    "No trap: the copilot is right. A cloud front cuts German solar by about 6 GW from 13:00 to 16:00, so residual load and intraday prices in those hours rise above day-ahead. The French nuclear headline is a red herring: it adds French baseload and the FR→DE border is fully allocated.",
  seniorHiddenNotes:
    "The copilot is correct. Good juniors verify the cloud front in an independent source (Weather & solar tab: cloud cover jumps to 70–80% from 13:00; solar forecast down ~6 GW; residual load up), dismiss the French nuclear news (baseload in France, FR→DE border has 0 MW available), and accept with a price limit and an unwind condition (e.g. undo if the 18:00 forecast update reverses). Rejecting a correct recommendation out of distrust is a failure too. If the junior's Case 1 position overfilled the battery, they must also clean up the excess.",
  hints: [
    { level: 1, text: "The copilot sounds confident again. What would make it wrong this time?" },
    { level: 2, text: "Can you confirm the cloud front from a source other than the copilot's note?" },
    { level: 3, text: "Open Weather & solar and News. Does the French nuclear headline really change German afternoon prices?" },
  ],
  challengeQuestions: [
    "What would make the AI wrong here?",
    "Does the French nuclear headline change your view? Why or why not?",
    "At what price would you stop?",
    "What would make you unwind this tomorrow morning?",
  ],
  lesson: "Trust the AI when the evidence agrees, and say which evidence you checked.",
  seniorWouldHaveChecked: [
    "Weather & solar: cloud cover 70–80% from 13:00, solar down ~6 GW",
    "Residual load: afternoon hours now higher",
    "News + Borders: French nuclear return is baseload in France; FR→DE border has 0 MW available",
  ],
  driverKeywords: ["cloud", "solar", "residual", "front", "weather"],
  newsKeywords: ["baseload", "border", "france", "french", "fr", "allocated", "irrelevant", "not relevant", "doesn't", "does not"],
  showsNews: true,
  usesBidTable: false,
};

export const CASES = [CASE1, CASE2];

export function caseById(id: string): CaseDefinition | undefined {
  return CASES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Copilot recommendations

export const COPILOT_CASE1: CopilotRecommendation = {
  headline: "Cycle the battery on tomorrow's solar trough",
  body:
    "Tomorrow is very sunny across Germany. Solar peaks around 50 GW, so residual load drops at midday and prices go negative 12:00–15:00. Evening residual load is high, so prices peak 19:00–21:00. Bid: buy 100 MWh at 12:00–14:00, sell 100 MWh at 19:00–21:00. Expected margin about EUR 16k.",
  sources: ["Day-ahead price forecast", "Solar forecast (DE)", "Residual load forecast"],
  schedule: COPILOT_CASE1_SCHEDULE,
  expectedMarginEUR: 16350,
};

/** The Case 1 decision becomes the day-ahead position Case 2 starts from. */
export function clearedPositionFromCase1(decision: Decision | undefined, schedule: Schedule | undefined): Schedule {
  if (decision === "accept") return [...COPILOT_CASE1_SCHEDULE];
  if (decision === "modify" && schedule) return [...schedule];
  // reject: nothing bid. escalate: senior took over and bid nothing in time (demo simplification).
  return emptySchedule();
}

export interface Case2Context {
  position: Schedule;
  positionSim: ReturnType<typeof simulateBattery>;
  needsCleanup: boolean;
  cleanupNote: string;
  copilot: CopilotRecommendation;
}

export function buildCase2Context(position: Schedule): Case2Context {
  const sim = simulateBattery(position, DA_CLEARED);
  const needsCleanup = sim.overflowMWh > 0 || sim.shortfallMWh > 0;
  const cleanupNote = needsCleanup
    ? `URGENT: the cleared position is not physically deliverable. ${sim.issues.join("; ")}. Fixing it intraday costs about EUR ${sim.correctionCostEUR.toLocaleString("en-US")}.`
    : "";

  const chargingInFront = [13, 14, 15].filter((h) => position[h] < 0);
  const shift = chargingInFront.length
    ? `We are charging at ${chargingInFront.map(hh).join(", ")}, inside the cloud window. Sell that volume back intraday (indications ${chargingInFront
        .map((h) => `${INTRADAY_INDICATIONS[h]}`)
        .join("/")} EUR/MWh vs day-ahead ${chargingInFront.map((h) => `${DA_CLEARED[h]}`).join("/")}) and re-buy it at 11:00, where solar is unaffected and the battery has spare charging power.`
    : "We have no charging inside the cloud window, so the move is small: if the battery has energy left at 14:00–16:00, sell part of it intraday at the higher prices.";

  return {
    position,
    positionSim: sim,
    needsCleanup,
    cleanupNote,
    copilot: {
      headline: "Cloud front tomorrow afternoon: shift volume out of 13:00–16:00",
      body: `The afternoon weather update shows a cloud front reaching southern Germany around 13:00 tomorrow. Solar is down about 6 GW 13:00–16:00, so residual load rises and intraday prices for those hours should clear above day-ahead. ${shift} Small gain, limited downside.`,
      sources: ["Updated solar forecast 14:30", "Weather service update", "Intraday price indications"],
    },
  };
}
