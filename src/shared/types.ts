// Core domain types shared by the browser app and the API server.

export type TabId =
  | "prices"
  | "residual"
  | "weather"
  | "asset"
  | "borders"
  | "auction"
  | "news";

export const TAB_LABELS: Record<TabId, string> = {
  prices: "Prices",
  residual: "Residual load",
  weather: "Weather & solar",
  asset: "Asset status",
  borders: "Borders",
  auction: "Auction results",
  news: "News",
};

export type Decision = "accept" | "modify" | "reject" | "escalate";

export type SubskillId =
  | "own_book"
  | "fundamentals"
  | "verification"
  | "news"
  | "ai_judgement"
  | "risk";

export const SUBSKILLS: { id: SubskillId; label: string; short: string }[] = [
  { id: "own_book", label: "Checks own book", short: "Own book" },
  { id: "fundamentals", label: "Reads market fundamentals", short: "Fundamentals" },
  { id: "verification", label: "Verifies with independent sources", short: "Verification" },
  { id: "news", label: "Judges news relevance", short: "News" },
  { id: "ai_judgement", label: "Catches AI errors / trusts correct AI", short: "AI judgement" },
  { id: "risk", label: "Risk and sizing", short: "Risk" },
];

/** One hour of tomorrow's market picture (German zone). */
export interface HourPoint {
  hour: number; // 0..23, delivery hour starting at this time
  price: number; // EUR/MWh, day-ahead forecast or cleared price
  load: number; // GW
  solar: number; // GW
  wind: number; // GW
  residual: number; // GW = load - solar - wind
  cloud: number; // % cloud cover, southern Germany
  temp: number; // deg C, southern Germany
}

export interface NewsItem {
  time: string;
  headline: string;
  body: string;
  /** Hidden from the junior: is this item actually relevant to the decision? */
  relevant: boolean;
}

export interface BorderCapacity {
  from: string;
  to: string;
  /** false = "n/e" in the ENTSO-E export: flow-based coupling, no fixed capacity published */
  published: boolean;
  minMW: number | null;
  maxMW: number | null;
  note: string;
}

export interface BatteryStatus {
  name: string;
  powerMW: number;
  capacityMWh: number;
  stateOfChargeMWh: number;
  availability: string;
  notes: string[];
}

/**
 * A bid schedule: MW per delivery hour. Positive = sell (discharge),
 * negative = buy (charge). Each hour is a 1 h product, so MW == MWh.
 */
export type Schedule = number[];

export interface CopilotRecommendation {
  headline: string;
  body: string;
  sources: string[];
  schedule?: Schedule;
  expectedMarginEUR?: number;
}

export interface Hint {
  level: 1 | 2 | 3;
  text: string;
}

export interface CaseDefinition {
  id: string;
  order: number;
  title: string;
  clock: string;
  countdownSec: number;
  brief: string;
  task: string;
  /** Is the copilot's recommendation correct? (hidden) */
  aiIsCorrect: boolean;
  acceptableDecisions: Decision[];
  bestDecisions: Decision[];
  /** Tabs a careful junior must open before deciding. */
  keyTabs: TabId[];
  /** The single tab that exposes the trap, if any. */
  trapTab?: TabId;
  trapDescription: string;
  seniorHiddenNotes: string;
  hints: Hint[];
  challengeQuestions: string[];
  lesson: string;
  seniorWouldHaveChecked: string[];
  /** Keywords that signal the junior named the right driver (offline grading). */
  driverKeywords: string[];
  /** Keywords that signal the junior handled the news item correctly (offline grading). */
  newsKeywords: string[];
  showsNews: boolean;
  usesBidTable: boolean;
}

/** Every observable action during a case run, with seconds since the case started. */
export type CaseEventType =
  | "case_started"
  | "tab_opened"
  | "first_take"
  | "first_take_skipped"
  | "copilot_revealed"
  | "junior_message"
  | "senior_message"
  | "decision_selected"
  | "schedule_edited"
  | "submitted";

export interface CaseEvent {
  t: number; // seconds since the case started
  type: CaseEventType;
  detail?: string;
  hintLevel?: number;
}

/** One logged tab open. */
export interface TabOpen {
  tab: TabId;
  atSec: number; // seconds since the case started
}

export interface ChatMessage {
  role: "junior" | "senior";
  text: string;
  hintLevel?: number;
}

export interface Submission {
  caseId: string;
  decision: Decision;
  confidence: number; // 0..100
  rationale: string;
  firstTake: string;
  schedule?: Schedule;
  priceLimit?: string;
  unwindCondition?: string;
  tabOpens: TabOpen[];
  chat: ChatMessage[];
  events: CaseEvent[];
  hintsUsed: number;
  secondsTaken: number;
  late: boolean;
}

export interface CaseResult {
  runId: string;
  caseId: string;
  caseTitle: string;
  week: number;
  submittedAt: string;
  submission: Submission;
  correct: boolean;
  trapCaught: boolean | null; // null when the case has no trap
  scores: Record<SubskillId, number | null>; // null = not assessed in this case
  overall: number;
  pnlEUR: number | null;
  pnlNote: string;
  lesson: string;
  seniorWouldHaveChecked: string[];
  feedback: string;
  gradedBy: "claude" | "rules";
  rubberStampFlag: boolean;
}

export interface WeekSnapshot {
  week: number;
  scores: Record<SubskillId, number>;
  cases: number;
  trapsCaught: number;
  trapsSeen: number;
  hintsPerCase: number;
}

export interface CalibrationPoint {
  confidence: number;
  correct: boolean;
}

export interface DraftCase {
  id: string;
  createdAt: string;
  sourceNote: string;
  title: string;
  brief: string;
  copilotRecommendation: string;
  trap: string;
  lesson: string;
  keyTabs: TabId[];
  rubric: string[];
  status: "draft" | "approved" | "rejected";
  approvedBy?: string;
  draftedBy: "claude" | "template";
}

export interface ReplayItem {
  lesson: string;
  fromCase: string;
  variant: string;
}
