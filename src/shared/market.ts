// Market picture for "tomorrow" in the German zone (DE-LU).
//
// SYNTHETIC DATA. The shapes follow a typical sunny spring weekday in Germany
// (deep midday solar trough with negative prices, morning and evening peaks).
// Run scripts/fetch_real_data.py to pull a real day from Energy-Charts and
// Open-Meteo and replace these arrays (see README "Using real data").

import type {
  BatteryStatus,
  BorderCapacity,
  HourPoint,
  NewsItem,
  Schedule,
} from "./types";

const PRICE_DA = [78, 72, 68, 66, 68, 80, 105, 118, 112, 85, 40, 8, -12, -18, -10, 5, 38, 85, 128, 152, 145, 118, 98, 86];
const LOAD = [48, 46, 45, 45, 46, 50, 57, 62, 64, 64, 63, 62, 61, 60, 59, 59, 60, 62, 64, 63, 60, 56, 52, 50];
const SOLAR_MORNING = [0, 0, 0, 0, 0, 0.5, 4, 11, 21, 31, 39, 45, 49, 50, 47, 40, 30, 18, 7, 1, 0, 0, 0, 0];
const WIND = [14, 14, 13, 13, 12, 12, 11, 10, 9, 8, 8, 7, 7, 7, 8, 8, 9, 10, 11, 12, 12, 13, 13, 14];
const CLOUD_MORNING = [10, 10, 8, 8, 8, 6, 5, 5, 5, 5, 5, 5, 5, 6, 8, 10, 12, 15, 15, 15, 15, 15, 15, 15];
const TEMP = [9, 8, 8, 7, 7, 7, 9, 12, 14, 16, 18, 19, 20, 21, 21, 21, 20, 19, 17, 15, 13, 12, 11, 10];

// Afternoon update (used in Case 2): a cloud front reaches southern Germany ~13:00.
const SOLAR_DELTA_AFTERNOON = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -6, -6, -6, -5, -2, 0, 0, 0, 0, 0, 0];
const CLOUD_AFTERNOON = [10, 10, 8, 8, 8, 6, 5, 5, 5, 5, 6, 10, 25, 70, 80, 80, 70, 45, 25, 15, 15, 15, 15, 15];
const TEMP_DELTA_AFTERNOON = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -3, -4, -4, -3, -2, -1, 0, 0, 0, 0, 0];
/** Intraday price indications after the afternoon update (EUR/MWh). */
const INTRADAY_AFTERNOON = [79, 73, 68, 66, 69, 81, 106, 119, 113, 86, 39, 9, -10, 22, 30, 45, 70, 92, 131, 154, 146, 119, 98, 86];

function build(solar: number[], cloud: number[], tempDelta: number[] = []): HourPoint[] {
  return PRICE_DA.map((price, hour) => {
    const s = Math.max(0, solar[hour]);
    return {
      hour,
      price,
      load: LOAD[hour],
      solar: s,
      wind: WIND[hour],
      residual: +(LOAD[hour] - s - WIND[hour]).toFixed(1),
      cloud: cloud[hour],
      temp: TEMP[hour] + (tempDelta[hour] ?? 0),
    };
  });
}

/** Morning view (Case 1): forecasts as of 09:30 today. */
export const MORNING_FORECAST: HourPoint[] = build(SOLAR_MORNING, CLOUD_MORNING);

/** Afternoon view (Case 2): updated weather and solar forecasts as of 15:00 today. */
export const AFTERNOON_FORECAST: HourPoint[] = build(
  SOLAR_MORNING.map((v, i) => v + SOLAR_DELTA_AFTERNOON[i]),
  CLOUD_AFTERNOON,
  TEMP_DELTA_AFTERNOON,
);

export const INTRADAY_INDICATIONS: number[] = INTRADAY_AFTERNOON;

/** Day-ahead prices as the auction cleared them (synthetic: equal to the morning forecast). */
export const DA_CLEARED: number[] = PRICE_DA;

export const BATTERY: BatteryStatus = {
  name: "Battery Süd 1 (synthetic asset, DE)",
  powerMW: 50,
  capacityMWh: 100,
  stateOfChargeMWh: 80,
  availability: "Available, 50 MW charge / 50 MW discharge",
  notes: [
    "Yesterday 19:00–21:00: planned discharge of 80 MWh CURTAILED by TSO redispatch (grid constraint). Battery stayed charged.",
    "State of charge at 00:00 tomorrow is expected to remain 80 MWh (80%). Self-discharge negligible.",
    "Round-trip losses ignored in this simulator.",
  ],
};

export const BORDERS_MORNING: BorderCapacity[] = [
  { border: "FR → DE", direction: "import to DE", availableMW: 0, note: "Fully allocated for tomorrow" },
  { border: "DE → CH", direction: "export from DE", availableMW: 1200, note: "Normal" },
  { border: "DE → AT", direction: "export from DE", availableMW: 900, note: "Normal" },
  { border: "CH → IT", direction: "export from CH", availableMW: 350, note: "Reduced: line maintenance" },
];

export const NEWS_MORNING: NewsItem[] = [
  {
    time: "07:45",
    headline: "Record solar expected across Germany tomorrow",
    body: "Forecasters see a clear sky over most of Germany; solar output could peak around 50 GW.",
    relevant: true,
  },
  {
    time: "08:10",
    headline: "Italian strike may affect port logistics",
    body: "Unions announced a 24-hour strike at several Italian ports later this month.",
    relevant: false,
  },
];

export const NEWS_AFTERNOON: NewsItem[] = [
  ...NEWS_MORNING,
  {
    time: "14:20",
    headline: "French nuclear unit returns early from maintenance",
    body: "A 1.3 GW unit in France is back online two days ahead of schedule, adding baseload supply in France.",
    relevant: false, // red herring: FR→DE border fully allocated, baseload not afternoon solar shape
  },
  {
    time: "14:35",
    headline: "Weather services update: cloud band moving into southern Germany",
    body: "A cloud band is expected over Bavaria and Baden-Württemberg from early afternoon tomorrow.",
    relevant: true,
  },
];

// ---------------------------------------------------------------------------
// Battery simulator

export interface SimulationResult {
  feasible: boolean;
  socPath: number[]; // MWh at the end of each hour
  overflowMWh: number; // energy bought that could not be stored
  shortfallMWh: number; // energy sold that the battery did not hold
  marketMarginEUR: number; // margin if every MWh were deliverable
  correctionCostEUR: number; // cost of fixing infeasible volumes intraday
  netEUR: number;
  issues: string[];
}

/** Penalties for fixing physically impossible positions in intraday/imbalance. */
export const OVERFLOW_RESALE_DISCOUNT = 40; // EUR/MWh lost per MWh dumped back into a saturated midday market
export const SHORTFALL_BUYBACK_PREMIUM = 30; // EUR/MWh above DA when buying back missing energy

export function emptySchedule(): Schedule {
  return Array.from({ length: 24 }, () => 0);
}

export function simulateBattery(
  schedule: Schedule,
  prices: number[],
  battery: BatteryStatus = BATTERY,
): SimulationResult {
  let soc = battery.stateOfChargeMWh;
  const socPath: number[] = [];
  let overflow = 0;
  let shortfall = 0;
  let market = 0;
  let correction = 0;
  const issues: string[] = [];

  schedule.forEach((mwRaw, hour) => {
    const mw = Math.max(-battery.powerMW, Math.min(battery.powerMW, mwRaw));
    if (mw !== mwRaw) issues.push(`${hh(hour)}: ${Math.abs(mwRaw)} MW exceeds the ${battery.powerMW} MW power limit`);
    const price = prices[hour];
    market += mw * price; // sell earns price, buy (negative mw) costs price
    if (mw < 0) {
      const room = battery.capacityMWh - soc;
      const stored = Math.min(room, -mw);
      const excess = -mw - stored;
      soc += stored;
      if (excess > 0) {
        overflow += excess;
        // Bought at `price`, must be resold intraday at `price - discount`.
        correction += excess * OVERFLOW_RESALE_DISCOUNT;
        issues.push(`${hh(hour)}: bought ${-mw} MWh but only ${round(stored)} MWh fit in the battery`);
      }
    } else if (mw > 0) {
      const available = Math.min(soc, mw);
      const missing = mw - available;
      soc -= available;
      if (missing > 0) {
        shortfall += missing;
        // Sold at `price`, must be bought back at `price + premium`.
        correction += missing * (price + SHORTFALL_BUYBACK_PREMIUM);
        issues.push(`${hh(hour)}: sold ${mw} MWh but the battery only held ${round(available)} MWh`);
      }
    }
    socPath.push(round(soc));
  });

  return {
    feasible: overflow === 0 && shortfall === 0 && issues.length === 0,
    socPath,
    overflowMWh: round(overflow),
    shortfallMWh: round(shortfall),
    marketMarginEUR: Math.round(market),
    correctionCostEUR: Math.round(correction),
    netEUR: Math.round(market - correction),
    issues,
  };
}

export function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Schedule the copilot proposes in Case 1 (ignores state of charge). */
export const COPILOT_CASE1_SCHEDULE: Schedule = (() => {
  const s = emptySchedule();
  s[12] = -50;
  s[13] = -50;
  s[19] = 50;
  s[20] = 50;
  return s;
})();

/** Reference answer for Case 1: empty the battery in the morning peak, then a full cycle. */
export const REFERENCE_CASE1_SCHEDULE: Schedule = (() => {
  const s = emptySchedule();
  s[7] = 50;
  s[8] = 30;
  s[12] = -50;
  s[13] = -50;
  s[19] = 50;
  s[20] = 50;
  return s;
})();
