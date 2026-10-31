// Invented history for the invented junior "Mia" (weeks 1–7), so the profile
// shows a growth trend in the demo. No real person or real employee data.

import type { CalibrationPoint, ReplayItem, SubskillId, WeekSnapshot } from "./types";

export const JUNIOR = {
  name: "Mia",
  role: "Junior short-term trader, Alpiq (invented persona)",
  startWeek: 1,
  currentWeek: 8,
};

const s = (
  own_book: number,
  fundamentals: number,
  verification: number,
  news: number,
  ai_judgement: number,
  risk: number,
): Record<SubskillId, number> => ({ own_book, fundamentals, verification, news, ai_judgement, risk });

export const SEED_WEEKS: WeekSnapshot[] = [
  { week: 1, scores: s(20, 45, 25, 30, 25, 35), cases: 4, trapsCaught: 0, trapsSeen: 2, hintsPerCase: 2.8 },
  { week: 2, scores: s(25, 50, 35, 35, 35, 40), cases: 5, trapsCaught: 1, trapsSeen: 3, hintsPerCase: 2.5 },
  { week: 3, scores: s(35, 55, 40, 40, 40, 45), cases: 5, trapsCaught: 1, trapsSeen: 2, hintsPerCase: 2.2 },
  { week: 4, scores: s(40, 58, 50, 45, 50, 50), cases: 6, trapsCaught: 2, trapsSeen: 3, hintsPerCase: 1.9 },
  { week: 5, scores: s(50, 62, 55, 50, 55, 55), cases: 6, trapsCaught: 2, trapsSeen: 3, hintsPerCase: 1.6 },
  { week: 6, scores: s(55, 66, 62, 55, 62, 58), cases: 6, trapsCaught: 3, trapsSeen: 4, hintsPerCase: 1.3 },
  { week: 7, scores: s(60, 70, 66, 60, 66, 62), cases: 7, trapsCaught: 3, trapsSeen: 4, hintsPerCase: 1.1 },
];

/** Earlier decisions with stated confidence: early Mia is overconfident. */
export const SEED_CALIBRATION: CalibrationPoint[] = [
  { confidence: 90, correct: false },
  { confidence: 85, correct: false },
  { confidence: 95, correct: true },
  { confidence: 80, correct: false },
  { confidence: 90, correct: true },
  { confidence: 75, correct: true },
  { confidence: 70, correct: false },
  { confidence: 65, correct: true },
  { confidence: 60, correct: true },
  { confidence: 55, correct: false },
  { confidence: 50, correct: true },
  { confidence: 40, correct: false },
  { confidence: 35, correct: false },
  { confidence: 85, correct: true },
  { confidence: 80, correct: true },
];

export const SEED_REPLAY: ReplayItem[] = [
  {
    lesson: "Check outage notices before explaining a price move",
    fromCase: "Week 5 · Morning note (missed French outage)",
    variant: "Week 9 · Italian interconnector outage",
  },
];
