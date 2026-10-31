// The two MVP cases. Case 2 builds on the position the junior created in Case 1.

import {
  COPILOT_CASE1_SCHEDULE,
  DA_CLEARED,
  emptySchedule,
  hh,
  INTRADAY_INDICATIONS,
  MARKET_DAY,
  REFERENCE_CASE1_SCHEDULE,
  reshiftCostEUR,
  simulateBattery,
} from "./market";
import type { CaseDefinition, CopilotRecommendation, Decision, Schedule } from "./types";

const copilotSim = simulateBattery(COPILOT_CASE1_SCHEDULE, DA_CLEARED);
const referenceSim = simulateBattery(REFERENCE_CASE1_SCHEDULE, DA_CLEARED);
const k = (n: number) => `EUR ${(Math.round(n / 100) / 10).toFixed(1)}k`;

export const CASE1: CaseDefinition = {
  id: "c1-battery-bid",
  order: 1,
  title: "Case 1 · Day-ahead battery bid",
  clock: `Saturday 09:30 · gate closure 12:00 for ${MARKET_DAY.weekday} ${MARKET_DAY.date}`,
  countdownSec: 300,
  brief:
    "You run tomorrow's day-ahead bid for Battery Süd 1 (50 MW / 100 MWh, German zone). Tomorrow is a Sunday with clear skies. The copilot has drafted a bid. The auction closes at 12:00; results come out around 13:00.",
  task: "Review the copilot's bid for tomorrow. Approve it, or correct it and submit your own schedule.",
  aiIsCorrect: false,
  acceptableDecisions: ["modify", "reject"],
  bestDecisions: ["modify"],
  keyTabs: ["asset", "prices", "residual"],
  trapTab: "asset",
  trapDescription:
    "Every market fact in the copilot's note is true (real prices: -213 and -250 EUR/MWh at 12:00 and 13:00), but it ignores the battery's state of charge. The battery is already 80% full (80 MWh) because yesterday evening's discharge was curtailed. It can only absorb 20 MWh, so buying 100 MWh commits Alpiq to 80 MWh it cannot store.",
  seniorHiddenNotes:
    `Correct move: Modify. It is a Sunday, so there is no morning peak; the only place to empty the battery before the trough is pre-dawn (05:00 50 MW at ~95 EUR, 06:00 30 MW at ~88 EUR). Then charge 12:00–13:00 at deeply negative prices (you are paid to charge) and discharge 19:00–20:00 at ~117 and ~125 EUR. That nets about ${k(referenceSim.netEUR)}. The copilot's plan shows a ${k(copilotSim.marketMarginEUR)} headline but is physically infeasible: 80 MWh overflow, about ${k(copilotSim.correctionCostEUR)} to dump back intraday, so about ${k(copilotSim.netEUR)} net. Reject is acceptable but leaves money on the table. Escalation is not needed: the trade is within the junior's limits.`,
  hints: [
    { level: 1, text: "Before you trust a market story, what do you know about your own position going into tomorrow?" },
    { level: 2, text: "The market data looks right. Have you looked at the asset itself, not just the market?" },
    { level: 3, text: "Open the Asset status tab. How full is the battery at midnight, and how much can it still take?" },
  ],
  challengeQuestions: [
    "Where would the 100 MWh physically go?",
    "What's the worst case if this bid clears exactly as written?",
    "What would change your mind about this schedule?",
    "It's a Sunday. Where is the energy that's already in the battery going to go before midday?",
  ],
  lesson: "Check your own book before you trust a market story.",
  seniorWouldHaveChecked: [
    "Asset status: state of charge 80 MWh, curtailment note",
    "Price forecast: on a Sunday the pre-dawn hours (05:00–06:00, ~95 and ~88 EUR) are the only place to empty the battery before the trough",
    "Residual load: negative from 11:00 to 15:00, confirming the trough and the evening peak",
  ],
  driverKeywords: ["state of charge", "soc", "80", "full", "curtail", "capacity", "room", "pre-dawn", "night", "05", "06", "empty"],
  newsKeywords: [],
  showsNews: true,
  usesBidTable: true,
};

export const CASE2: CaseDefinition = {
  id: "c2-intraday-prep",
  order: 2,
  title: "Case 2 · Intraday preparation",
  clock: "Saturday 15:00 · auction results are in",
  countdownSec: 240,
  brief:
    "The day-ahead auction has cleared and your position for tomorrow is fixed. The afternoon forecast update is in. Prepare tomorrow's intraday plan.",
  task: "Should we adjust the position tomorrow, by how much, and what will you watch? Set a price limit and a condition to unwind.",
  aiIsCorrect: true,
  acceptableDecisions: ["accept", "modify"],
  bestDecisions: ["accept"],
  keyTabs: ["weather", "prices", "news", "borders"],
  trapDescription:
    "No trap: the copilot is right, and the right call is to hold. A cloud band cuts German solar by about 6 GW from 13:00 to 16:00, lifting intraday indications by ~40 EUR in those hours. But the midday trough is ~200 EUR deep, so 13:00 is still ~160 EUR cheaper than 11:00 and moving the charging would cost about EUR 8k. The Flamanville 3 headline is a real ENTSO-E notice and a red herring: the reactor only returns after midnight Monday, France sits behind flow-based coupling (no fixed FR–DE capacity), and Germany is exporting ~12 GW at midday, so French supply is not what sets Sunday-afternoon German prices.",
  seniorHiddenNotes:
    "The copilot is correct: hold, set an alert on the 18:00 update, and only sell the 13:00 block back above a limit. Good juniors verify the cloud band in an independent source (Weather & solar tab: cloud cover 70–80% from 13:00, solar down ~6 GW), check the price tab to see that 13:00 (-250 cleared, -210 indicated) is still far cheaper than 11:00 (-52), dismiss the Flamanville 3 news (it takes effect 00:00 Monday, after the window; FR–DE is flow-based so there is no border capacity to 'fill'; Germany is a net exporter of ~12 GW at midday, so extra French supply is not the constraint), and accept with a price limit and an unwind condition. A junior who was burned in Case 1 is tempted to distrust everything and 'do something': re-shifting the charging (Reject) costs about EUR 8k. If the junior's Case 1 position overfilled the battery, they must also deal with the excess.",
  hints: [
    { level: 1, text: "The copilot sounds confident again. What would make it wrong this time?" },
    { level: 2, text: "Can you confirm the cloud band from a source other than the copilot's note, and what does a 40 EUR lift do to a 200 EUR trough?" },
    { level: 3, text: "Open Weather & solar and Prices. Compare 11:00 with 13:00 after the uplift. Then look at News and Borders: when does Flamanville return, and is Germany importing or exporting at midday?" },
  ],
  challengeQuestions: [
    "What would make the AI wrong here?",
    "What would it cost to move the 13:00 block to 11:00?",
    "Does the Flamanville headline change your view? When does it take effect, and which way is power flowing at midday?",
    "At what indication would you sell the 13:00 block back, and what would make you unwind tomorrow morning?",
  ],
  lesson: "Trust the AI when the evidence agrees, and resist the urge to act just because you were burned.",
  seniorWouldHaveChecked: [
    "Weather & solar: cloud cover 70–80% from 13:00, solar down ~6 GW",
    "Prices: 13:00 still ~160 EUR cheaper than 11:00 after the uplift, so re-shifting costs money",
    "News + Borders: Flamanville 3 only returns at 00:00 Monday; FR–DE is flow-based; Germany exports ~12 GW at midday",
  ],
  driverKeywords: ["cloud", "solar", "residual", "front", "band", "weather", "hold", "trough", "cheaper", "cost", "160", "8k", "8,000"],
  newsKeywords: ["monday", "midnight", "00:00", "after", "flow-based", "flow based", "core", "export", "exporting", "surplus", "france", "french", "flamanville", "baseload", "irrelevant", "not relevant", "doesn't", "does not", "noise", "red herring", "not the constraint"],
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
  headline: "Cycle the battery on Sunday's solar trough",
  body:
    `Tomorrow is a clear Sunday across Germany. Solar peaks near 43 GW against a load of only ~43 GW, so residual load goes negative and day-ahead prices are deeply negative 12:00–15:00 (the forecast shows ${DA_CLEARED[13]} EUR/MWh at 13:00: we get paid to charge). Evening residual load recovers, so prices peak 19:00–21:00. Bid: buy 100 MWh at 12:00–14:00, sell 100 MWh at 19:00–21:00. Expected margin about ${k(copilotSim.marketMarginEUR)}.`,
  sources: ["Day-ahead price forecast", "Solar forecast (DE)", "Residual load forecast"],
  schedule: COPILOT_CASE1_SCHEDULE,
  expectedMarginEUR: copilotSim.marketMarginEUR,
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
  reshiftCostEUR: number;
  copilot: CopilotRecommendation;
}

export function buildCase2Context(position: Schedule): Case2Context {
  const sim = simulateBattery(position, DA_CLEARED);
  const needsCleanup = sim.overflowMWh > 0 || sim.shortfallMWh > 0;
  const cleanupNote = needsCleanup
    ? `URGENT: the cleared position is not physically deliverable. ${sim.issues.join("; ")}. Fixing it intraday costs about EUR ${sim.correctionCostEUR.toLocaleString("en-US")}.`
    : "";
  const reshift = reshiftCostEUR(position);
  const chargingAt13 = position[13] < 0;

  const uplift = `Intraday indications for 13:00–15:00 are about 40 EUR above day-ahead (13:00: ${INTRADAY_INDICATIONS[13]} indicated vs ${DA_CLEARED[13]} cleared).`;
  const hold = chargingAt13
    ? `That is not enough to move our charging: ${hh(13)} is still ~${Math.round(INTRADAY_INDICATIONS[13] * -1 - INTRADAY_INDICATIONS[11] * -1)} EUR cheaper than ${hh(11)}, so re-shifting the 13:00 block to 11:00 would cost about EUR ${reshift.toLocaleString("en-US")}. Recommendation: hold the day-ahead schedule, set an alert on the 18:00 forecast update, and only sell the 13:00 block back if its indication rises above -60 EUR/MWh.`
    : `We have no charging inside the cloud window, so there is nothing to re-shift. Recommendation: hold, set an alert on the 18:00 forecast update, and revisit only if the afternoon indications turn positive.`;
  const cleanup = needsCleanup
    ? ` Separately, the cleared position holds ${sim.overflowMWh} MWh the battery cannot store; that volume has to be sold back intraday today regardless of the weather.`
    : "";

  return {
    position,
    positionSim: sim,
    needsCleanup,
    cleanupNote,
    reshiftCostEUR: reshift,
    copilot: {
      headline: "Cloud band tomorrow afternoon: hold the position, don't chase it",
      body: `The 14:30 weather update puts a cloud band over Bavaria and Baden-Württemberg from about 13:00 tomorrow. Solar is down roughly 6 GW 13:00–16:00 and residual load turns positive again by 15:00. ${uplift} ${hold}${cleanup}`,
      sources: ["Updated solar forecast 14:30", "Weather service update", "Intraday price indications"],
    },
  };
}
