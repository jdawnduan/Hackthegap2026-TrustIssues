import type { CaseResult, ChatMessage, DraftCase, Schedule, Submission, TabOpen } from "./shared/types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => fetch("/api/health").then((r) => r.json() as Promise<{ ok: boolean; claude: boolean; model: string | null }>),
  senior: (body: { caseId: string; chat: ChatMessage[]; tabOpens: TabOpen[]; hintLevelSoFar: number; position?: Schedule }) =>
    post<{ reply: string; hintLevel: number; source: "claude" | "offline" }>("/api/senior", body),
  grade: (body: { submission: Submission; week: number; position?: Schedule }) => post<CaseResult>("/api/grade", body),
  draftCase: (note: string) => post<DraftCase>("/api/draft-case", { note }),
};
