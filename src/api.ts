import { caseById } from "./shared/cases";
import { offlineDraftCase, offlineSeniorTurn } from "./shared/offline";
import { gradeWithRules } from "./shared/scoring";
import type { CaseResult, ChatMessage, DraftCase, Schedule, Submission, TabOpen } from "./shared/types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * When there is no API server at all (a static build on GitHub Pages, or a
 * phone that can reach the web server but not the API), run the same
 * offline logic the server would use, in the browser. The UI shows
 * "offline script" / "rule-based" either way, so nothing is hidden.
 */
async function withOfflineFallback<T>(call: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await call();
  } catch (error) {
    console.warn("[api] no API server reachable, using in-browser offline logic:", (error as Error).message);
    return fallback();
  }
}

type SeniorBody = { caseId: string; chat: ChatMessage[]; tabOpens: TabOpen[]; hintLevelSoFar: number; position?: Schedule };
type SeniorReply = { reply: string; hintLevel: number; source: "claude" | "offline" };

export const api = {
  health: () =>
    fetch("/api/health")
      .then((r) => r.json() as Promise<{ ok: boolean; claude: boolean; model: string | null }>)
      .catch(() => ({ ok: true, claude: false, model: null })),
  senior: (body: SeniorBody) =>
    withOfflineFallback<SeniorReply>(
      () => post("/api/senior", body),
      () => ({ ...offlineSeniorTurn(body), source: "offline" }),
    ),
  grade: (body: { submission: Submission; week: number; position?: Schedule }) =>
    withOfflineFallback<CaseResult>(
      () => post("/api/grade", body),
      () => {
        const def = caseById(body.submission.caseId);
        if (!def) throw new Error(`unknown case ${body.submission.caseId}`);
        return gradeWithRules(def, body.submission, body.week, { position: body.position });
      },
    ),
  draftCase: (note: string) =>
    withOfflineFallback<DraftCase>(
      () => post("/api/draft-case", { note }),
      () => ({ id: `draft-${Date.now()}`, createdAt: new Date().toISOString(), status: "draft" as const, ...offlineDraftCase(note) }),
    ),
};
