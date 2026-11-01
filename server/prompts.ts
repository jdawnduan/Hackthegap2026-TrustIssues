// Prompts for the AI senior, the grader and the case drafter.

import { buildCase2Context, COPILOT_CASE1 } from "../src/shared/cases";
import { BATTERY, hh } from "../src/shared/market";
import type { CaseDefinition, Schedule, TabOpen } from "../src/shared/types";
import { TAB_LABELS } from "../src/shared/types";

function scheduleText(s: Schedule | undefined): string {
  if (!s) return "none";
  const rows = s.map((mw, h) => (mw ? `${hh(h)} ${mw > 0 ? "sell" : "buy"} ${Math.abs(mw)} MW` : "")).filter(Boolean);
  return rows.length ? rows.join(", ") : "empty (no bids)";
}

export function caseContext(def: CaseDefinition, position?: Schedule): string {
  const lines = [
    `CASE: ${def.title} (${def.clock})`,
    `Brief shown to the junior: ${def.brief}`,
    `Task shown to the junior: ${def.task}`,
    `Asset: ${BATTERY.name}, ${BATTERY.powerMW} MW / ${BATTERY.capacityMWh} MWh, state of charge at midnight ${BATTERY.stateOfChargeMWh} MWh.`,
  ];
  if (def.order === 1) {
    lines.push(`Copilot recommendation shown to the junior: ${COPILOT_CASE1.body}`);
  } else {
    const c2 = buildCase2Context(position ?? []);
    lines.push(`Day-ahead position the junior created in Case 1a: ${scheduleText(position)}`);
    if (c2.needsCleanup) lines.push(`Position problem shown to the junior: ${c2.cleanupNote}`);
    lines.push(`Copilot recommendation shown to the junior: ${c2.copilot.body}`);
  }
  lines.push(
    "",
    "HIDDEN FROM THE JUNIOR:",
    `Is the copilot correct? ${def.aiIsCorrect ? "YES" : "NO"}`,
    `Trap / situation: ${def.trapDescription}`,
    `Senior notes: ${def.seniorHiddenNotes}`,
    `Key evidence tabs: ${def.keyTabs.map((k) => TAB_LABELS[k]).join(", ")}`,
    `Hint ladder: ${def.hints.map((h) => `L${h.level}: ${h.text}`).join(" | ")}`,
  );
  return lines.join("\n");
}

export function tabLogText(tabOpens: TabOpen[]): string {
  if (!tabOpens.length) return "The junior has not opened any data tab yet.";
  return "Tabs the junior opened (seconds since start): " + tabOpens.map((t) => `${TAB_LABELS[t.tab]} @${t.atSec}s`).join(", ");
}

export const SENIOR_SYSTEM = `You are a senior power trader on Alpiq's short-term trading desk, coaching a junior trader inside a training simulator called Gate Closure. The junior is reviewing an AI copilot's recommendation under time pressure.

Your job is to make the junior think, not to give answers.
- You know the correct answer and the trap, but never state them, never confirm or deny whether the copilot is right, and never name the exact numbers the junior should find.
- Reply with ONE short question or challenge (max 2 sentences, plain words, no lists). Sound like a busy but fair senior colleague.
- Challenge the reasoning, not just the conclusion: a right answer for a weak reason still gets pushed.
- Typical challenges: "What would change your mind?", "What's the downside?", "What did you not check?", "Where would that energy physically go?"
- If the junior asks for the answer, refuse briefly and ask what they have checked.
- You never speak first: the junior opens every exchange. If they explicitly ask for a hint, give the next level of the hint ladder (one level above the highest used so far), even if they do not look stuck; hints are counted in their score, so never give more than one level per reply.
- Use the hint ladder only when the junior is stuck or heading toward a mistake AND has not yet opened the key evidence: go up at most one level per reply, starting from the level after the highest already used. Level 1 = general question, 2 = point to a data category, 3 = name the tab. Otherwise use hint_level 0.
- If the junior has already found the key evidence, stop hinting and test their sizing, limits and downside instead.

Return JSON with "reply" (your message to the junior) and "hint_level" (0, 1, 2 or 3).`;

export const SENIOR_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    hint_level: { type: "integer", enum: [0, 1, 2, 3] },
  },
  required: ["reply", "hint_level"],
  additionalProperties: false,
};

export const GRADER_SYSTEM = `You grade a junior power trader's reasoning in a training simulator. You receive the case (including hidden notes), the junior's decision, rationale, first take, chat with the senior, and the evidence tabs they opened. A rule engine already scored the decision, the tabs opened and the P&L; you judge the QUALITY OF REASONING only.

Score each 0-100:
- fundamentals: did they name the real driver (for example state of charge vs capacity, residual load, cloud front) correctly and specifically?
- news: did they judge the news correctly (relevant vs red herring) and say why? Use null if the case has no relevant news judgement.
- reasoning_quality: is the rationale specific, evidence-based, and honest about uncertainty?

Then write "feedback": 2-3 short sentences addressed to the junior ("You ..."), concrete, naming what they did well and the single most important thing to do differently. Do not repeat the score numbers.`;

export const GRADER_SCHEMA = {
  type: "object",
  properties: {
    fundamentals: { type: "integer" },
    news: { anyOf: [{ type: "integer" }, { type: "null" }] },
    reasoning_quality: { type: "integer" },
    feedback: { type: "string" },
  },
  required: ["fundamentals", "news", "reasoning_quality", "feedback"],
  additionalProperties: false,
};

export const DRAFT_SYSTEM = `Senior traders at a Swiss energy company hold debriefs after difficult trading days. You turn one debrief note into a draft training case for a judgement simulator for junior traders. The case recreates the situation the day before delivery, with an AI copilot recommendation that repeats the desk's mistake (the trap) so juniors practise catching it.

Keep it concrete and short. Use only these evidence tab ids in key_tabs: prices, residual, weather, asset, borders, auction, news. The draft will be reviewed and approved by a human senior before any junior sees it, so flag anything you are unsure about inside the text with "[check]".`;

export const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    brief: { type: "string" },
    copilot_recommendation: { type: "string" },
    trap: { type: "string" },
    lesson: { type: "string" },
    key_tabs: { type: "array", items: { type: "string", enum: ["prices", "residual", "weather", "asset", "borders", "auction", "news"] } },
    rubric: { type: "array", items: { type: "string" } },
  },
  required: ["title", "brief", "copilot_recommendation", "trap", "lesson", "key_tabs", "rubric"],
  additionalProperties: false,
};
