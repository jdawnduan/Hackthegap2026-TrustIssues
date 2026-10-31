// Market picture for "tomorrow" in the German zone (DE-LU).
//
// REAL DAY: Sunday 11 May 2025, loaded from realday.json (Energy-Charts /
// SMARD for prices, load, solar, wind; Open-Meteo for Munich weather; both
// CC BY 4.0). Residual load went negative at midday and the day-ahead price
// cleared at -250 EUR/MWh at 13:00.
//
// INVENTED for the cases: the battery and its curtailment, the afternoon
// cloud-band forecast update, intraday price indications, border capacities
// and the news feed. Regenerate realday.json with scripts/fetch_real_data.py.

import real from "./realday.json";
import type {
  BatteryStatus,
  BorderCapacity,
  HourPoint,
  NewsItem,
  Schedule,
} from "./types";

export const MARKET_DAY = {
  date: real.date,
  weekday: real.weekday,
  zone: real.zone,
  sources: real.sources,
};

const PRICE_DA: number[] = real.price_da_eur_mwh;
const LOAD: number[] = real.load_gw;
const SOLAR_MORNING: number[] = real.solar_gw;
const WIND: number[] = real.wind_gw;
const CLOUD_MORNING: number[] = real.cloud_cover_pct;
const TEMP: number[] = real.temp_c;

// Afternoon update (Case 2, invented): a cloud band reaches southern Germany ~13:00.
const SOLAR_DELTA_AFTERNOON = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -6, -6, -6, -5, -2, 0, 0, 0, 0, 0, 0];
const CLOUD_AFTERNOON = CLOUD_MORNING.map((c, h) => ({ 12: 25, 13: 70, 14: 80, 15: 80, 16: 70, 17: 45, 18: 25 } as Record<number, number>)[h] ?? c);
const TEMP_DELTA_AFTERNOON = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -3, -4, -4, -3, -2, -1, 0, 0, 0, 0, 0];
/** Intraday indications after the afternoon update: day-ahead plus the cloud uplift (invented). */
const INTRADAY_DELTA = [1, 1, 0, 0, 1, 1, 1, 1, 1, 1, -1, 1, 2, 40, 40, 40, 32, 7, 2, 2, 1, 1, 0, 0];

function build(solar: number[], cloud: number[], tempDelta: number[] = []): HourPoint[] {
  return PRICE_DA.map((price, hour) => {
    const s = Math.max(0, +solar[hour].toFixed(1));
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

/** Morning view (Case 1): forecasts as of 09:30 the day before. Real data. */
export const MORNING_FORECAST: HourPoint[] = build(SOLAR_MORNING, CLOUD_MORNING);

/** Afternoon view (Case 2): updated weather and solar forecasts as of 15:00. Invented cloud band on top of the real day. */
export const AFTERNOON_FORECAST: HourPoint[] = build(
  SOLAR_MORNING.map((v, i) => v + SOLAR_DELTA_AFTERNOON[i]),
  CLOUD_AFTERNOON,
  TEMP_DELTA_AFTERNOON,
);

export const INTRADAY_INDICATIONS: number[] = PRICE_DA.map((p, h) => +(p + INTRADAY_DELTA[h]).toFixed(1));

/** Day-ahead prices as the auction cleared them: the real 11 May 2025 prices. */
export const DA_CLEARED: number[] = PRICE_DA;

export const BATTERY: BatteryStatus = {
  name: "Battery Süd 1 (invented asset, DE)",
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
    headline: "Clear skies across Germany on Sunday, solar near record",
    body: "Forecasters see cloudless weather over most of Germany tomorrow; with Sunday demand low, solar could cover more than the entire load at midday.",
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

/**
 * Reference answer for Case 1. It is a Sunday, so there is no morning peak:
 * the only place to empty the battery before the trough is the pre-dawn
 * hours (05:00 ~95 EUR, 06:00 ~88 EUR). Then a full cycle.
 */
export const REFERENCE_CASE1_SCHEDULE: Schedule = (() => {
  const s = emptySchedule();
  s[5] = 50;
  s[6] = 30;
  s[12] = -50;
  s[13] = -50;
  s[19] = 50;
  s[20] = 50;
  return s;
})();

/** Cost of moving the 13:00 charging block to 11:00 after the cloud update (Case 2 "reject" path). */
export function reshiftCostEUR(position: Schedule): number {
  if (position[13] >= 0) return 0;
  return Math.round(-position[13] * (INTRADAY_INDICATIONS[11] - INTRADAY_INDICATIONS[13]));
}
