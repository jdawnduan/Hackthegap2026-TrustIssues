// Gate Closure API server: AI senior chat, grading, debrief case drafting.
// Falls back to offline logic when no Claude credentials are configured.

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseById } from "../src/shared/cases";
import { gradeWithRules } from "../src/shared/scoring";
import { offlineDraftCase, offlineSeniorTurn } from "../src/shared/offline";
import type { CaseResult, ChatMessage, DraftCase, Schedule, Submission, TabOpen } from "../src/shared/types";
import { askClaudeJSON, claudeEnabled, ClaudeUnavailable, MODEL } from "./claude";
import {
  caseContext,
  DRAFT_SCHEMA,
  DRAFT_SYSTEM,
  GRADER_SCHEMA,
  GRADER_SYSTEM,
  SENIOR_SCHEMA,
  SENIOR_SYSTEM,
  tabLogText,
} from "./prompts";

// Load .env from the repo root (ANTHROPIC_API_KEY, PORT). Own tiny parser so it
// works on any Node version; existing environment variables win over the file.
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (fs.existsSync(envPath)) {
  let loaded = 0;
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = value;
    loaded++;
  }
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  console.log(`.env: ${loaded} variable(s) read from ${envPath}; ANTHROPIC_API_KEY ${key ? `set (${key.length} chars, starts "${key.slice(0, 7)}")` : "EMPTY or missing"}`);
} else {
  console.log(`.env: not found at ${envPath} (offline mode). Copy .env.example to .env and add ANTHROPIC_API_KEY.`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, claude: claudeEnabled(), model: claudeEnabled() ? MODEL : null });
});

// --- AI senior -------------------------------------------------------------

interface SeniorBody {
  caseId: string;
  chat: ChatMessage[];
  tabOpens: TabOpen[];
  hintLevelSoFar: number;
  position?: Schedule;
}

app.post("/api/senior", async (req, res) => {
  const body = req.body as SeniorBody;
  const def = caseById(body.caseId);
  if (!def) return res.status(404).json({ error: "unknown case" });

  const offline = () => {
    const out = offlineSeniorTurn(body);
    return res.json({ reply: out.reply, hintLevel: out.hintLevel, source: "offline" });
  };
  if (!claudeEnabled()) return offline();

  const transcript = body.chat
    .map((m) => `${m.role === "junior" ? "JUNIOR" : "SENIOR"}: ${m.text}`)
    .join("\n");
  const user = [
    caseContext(def, body.position),
    "",
    tabLogText(body.tabOpens),
    `Highest hint level used so far: ${body.hintLevelSoFar}`,
    "",
    "CONVERSATION SO FAR:",
    transcript || "(the junior has not said anything yet; open with one challenging question)",
    "",
    "Write the senior's next reply.",
  ].join("\n");

  try {
    const out = await askClaudeJSON<{ reply: string; hint_level: number }>({
      system: SENIOR_SYSTEM,
      messages: [{ role: "user", content: user }],
      schema: SENIOR_SCHEMA,
      effort: "low",
      maxTokens: 2000,
    });
    return res.json({ reply: out.reply, hintLevel: out.hint_level, source: "claude" });
  } catch (error) {
    console.warn("[senior] falling back to offline:", (error as Error).message);
    return offline();
  }
});

// --- Grading ---------------------------------------------------------------

interface GradeBody {
  submission: Submission;
  week: number;
  position?: Schedule;
}

app.post("/api/grade", async (req, res) => {
  const body = req.body as GradeBody;
  const def = caseById(body.submission.caseId);
  if (!def) return res.status(404).json({ error: "unknown case" });

  const result: CaseResult = gradeWithRules(def, body.submission, body.week, { position: body.position });
  if (!claudeEnabled()) return res.json(result);

  const sub = body.submission;
  const user = [
    caseContext(def, body.position),
    "",
    tabLogText(sub.tabOpens),
    `Decision: ${sub.decision}, confidence ${sub.confidence}%`,
    `First take before seeing the copilot: ${sub.firstTake || "(none)"}`,
    `Rationale: ${sub.rationale || "(none)"}`,
    sub.priceLimit ? `Price limit: ${sub.priceLimit}` : "",
    sub.unwindCondition ? `Unwind condition: ${sub.unwindCondition}` : "",
    "",
    "CHAT WITH SENIOR:",
    sub.chat.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n") || "(no chat)",
    "",
    `Rule engine verdict: decision ${result.correct ? "acceptable" : "not acceptable"}; P&L note: ${result.pnlNote}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  try {
    const llm = await askClaudeJSON<{ fundamentals: number; news: number | null; reasoning_quality: number; feedback: string }>({
      system: GRADER_SYSTEM,
      messages: [{ role: "user", content: user }],
      schema: GRADER_SCHEMA,
      effort: "medium",
      maxTokens: 3000,
    });
    // Blend: rule engine keeps the facts (tabs, decision, P&L); Claude judges the words.
    const blend = (rule: number | null, ai: number | null) =>
      rule === null ? ai : ai === null ? rule : Math.round(rule * 0.5 + ai * 0.5);
    result.scores.fundamentals = blend(result.scores.fundamentals, clamp(llm.fundamentals));
    if (result.scores.news !== null) result.scores.news = blend(result.scores.news, llm.news === null ? null : clamp(llm.news));
    const assessed = Object.values(result.scores).filter((v): v is number => v !== null);
    const hintPenalty = Math.min(15, sub.hintsUsed * 5);
    result.overall = clamp(assessed.reduce((a, b) => a + b, 0) / assessed.length - hintPenalty);
    result.feedback = `${llm.feedback} ${result.feedback}`.trim();
    result.gradedBy = "claude";
  } catch (error) {
    console.warn("[grade] Claude grading failed, rules only:", (error as Error).message);
  }
  return res.json(result);
});

// --- Debrief inbox ---------------------------------------------------------

app.post("/api/draft-case", async (req, res) => {
  const note = String((req.body as { note?: string }).note ?? "").trim();
  if (!note) return res.status(400).json({ error: "note required" });
  const base = { id: `draft-${Date.now()}`, createdAt: new Date().toISOString(), status: "draft" as const };

  if (claudeEnabled()) {
    try {
      const d = await askClaudeJSON<{
        title: string; brief: string; copilot_recommendation: string; trap: string; lesson: string;
        key_tabs: DraftCase["keyTabs"]; rubric: string[];
      }>({
        system: DRAFT_SYSTEM,
        messages: [{ role: "user", content: `Debrief note from the desk:\n\n${note}` }],
        schema: DRAFT_SCHEMA,
        effort: "medium",
        maxTokens: 4000,
      });
      const draft: DraftCase = {
        ...base,
        sourceNote: note,
        title: d.title,
        brief: d.brief,
        copilotRecommendation: d.copilot_recommendation,
        trap: d.trap,
        lesson: d.lesson,
        keyTabs: d.key_tabs,
        rubric: d.rubric,
        draftedBy: "claude",
      };
      return res.json(draft);
    } catch (error) {
      if (!(error instanceof ClaudeUnavailable)) throw error;
      console.warn("[draft] falling back to template:", error.message);
    }
  }
  return res.json({ ...base, ...offlineDraftCase(note) } satisfies DraftCase);
});

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// --- Static build (production) --------------------------------------------

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(here, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Judgement gym API on http://localhost:${port} (Claude: ${claudeEnabled() ? MODEL : "offline mode"})`);
});
