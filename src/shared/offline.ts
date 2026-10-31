// Offline fallbacks used when no Claude API key is configured, so the demo
// always works. They are deliberately simple and clearly labelled in the UI.

import { caseById } from "./cases";
import type { ChatMessage, DraftCase, TabId, TabOpen } from "./types";

export interface SeniorTurnInput {
  caseId: string;
  chat: ChatMessage[];
  tabOpens: TabOpen[];
  hintLevelSoFar: number;
}

export interface SeniorTurnOutput {
  reply: string;
  hintLevel: number; // 0 = pure challenge, 1..3 = hint ladder
}

const ANSWER_SEEKING = ["what's the answer", "what is the answer", "just tell me", "tell me the answer", "what should i do", "is it right", "is the ai right", "correct answer"];

export function offlineSeniorTurn(input: SeniorTurnInput): SeniorTurnOutput {
  const def = caseById(input.caseId);
  if (!def) return { reply: "I don't know this case.", hintLevel: 0 };
  const last = [...input.chat].reverse().find((m) => m.role === "junior")?.text.toLowerCase() ?? "";
  const opened = new Set<TabId>(input.tabOpens.map((t) => t.tab));
  const missingKey = def.keyTabs.filter((k) => !opened.has(k));
  const seniorTurns = input.chat.filter((m) => m.role === "senior").length;

  if (ANSWER_SEEKING.some((p) => last.includes(p))) {
    return {
      reply: "I'm not going to give you the answer. Tell me what you've checked so far and what you're least sure about.",
      hintLevel: 0,
    };
  }

  // Hints escalate only while the key evidence is still unopened.
  const trapOrKeyMissing = def.trapTab ? !opened.has(def.trapTab) : missingKey.length > 0;
  if (trapOrKeyMissing && seniorTurns >= 1) {
    const next = Math.min(3, input.hintLevelSoFar + 1) as 1 | 2 | 3;
    const hint = def.hints.find((h) => h.level === next) ?? def.hints[def.hints.length - 1];
    return { reply: hint.text, hintLevel: hint.level };
  }

  const q = def.challengeQuestions[seniorTurns % def.challengeQuestions.length];
  return { reply: q, hintLevel: 0 };
}

export function offlineDraftCase(note: string): Omit<DraftCase, "id" | "createdAt" | "status"> {
  const n = note.toLowerCase();
  const tabs: TabId[] = [];
  if (/(cloud|solar|wind|weather|forecast)/.test(n)) tabs.push("weather", "residual");
  if (/(outage|nuclear|plant|unit|maintenance)/.test(n)) tabs.push("news");
  if (/(border|interconnector|capacity|flow)/.test(n)) tabs.push("borders");
  if (/(battery|reservoir|state of charge|soc|position|book)/.test(n)) tabs.push("asset");
  if (!tabs.length) tabs.push("prices", "news");
  return {
    sourceNote: note,
    title: `Desk debrief replay: ${note.slice(0, 60)}${note.length > 60 ? "…" : ""}`,
    brief: `Based on a recent desk debrief: "${note}". Rebuild the situation the desk faced the day before delivery.`,
    copilotRecommendation: "Copilot proposes the trade the desk actually made, with the same blind spot the debrief describes.",
    trap: "The copilot repeats the desk's mistake described in the debrief note.",
    lesson: "Senior to fill in: the one-line lesson from the debrief.",
    keyTabs: Array.from(new Set(tabs)),
    rubric: [
      "Junior opens the tab that shows what the desk missed",
      "Junior names the real driver in the rationale",
      "Junior sizes or limits the trade, or escalates if above limit",
    ],
    draftedBy: "template",
  };
}
