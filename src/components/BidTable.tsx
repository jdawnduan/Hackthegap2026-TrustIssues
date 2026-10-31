import { BATTERY, hh, simulateBattery } from "../shared/market";
import type { Schedule } from "../shared/types";

interface Props {
  schedule: Schedule;
  prices: number[];
  /** True once the junior has opened Asset status: only then does the pre-check know the state of charge. */
  knowsStateOfCharge: boolean;
  onChange: (s: Schedule) => void;
}

export function BidTable({ schedule, prices, knowsStateOfCharge, onChange }: Props) {
  const sim = simulateBattery(schedule, prices);
  const set = (h: number, v: string) => {
    const n = Number(v);
    const next = [...schedule];
    next[h] = Number.isFinite(n) ? Math.max(-BATTERY.powerMW, Math.min(BATTERY.powerMW, Math.round(n))) : 0;
    onChange(next);
  };
  const bought = schedule.filter((m) => m < 0).reduce((a, m) => a - m, 0);
  const sold = schedule.filter((m) => m > 0).reduce((a, m) => a + m, 0);
  return (
    <div>
      <small className="muted">MW per hour. Positive = sell (discharge), negative = buy (charge). Max ±{BATTERY.powerMW} MW.</small>
      <div className="scroll" style={{ maxHeight: 260, marginTop: 6 }}>
        <table className="bidtable">
          <thead><tr><th>Hour</th><th>Price</th><th>MW</th><th>Hour</th><th>Price</th><th>MW</th></tr></thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => (
              <tr key={i}>
                <td>{hh(i)}</td><td className="price" style={{ color: prices[i] < 0 ? "var(--bad)" : undefined }}>{prices[i]}</td>
                <td><input className="mw" type="number" step={10} value={schedule[i] || ""} placeholder="0" onChange={(e) => set(i, e.target.value)} /></td>
                <td>{hh(i + 12)}</td><td className="price" style={{ color: prices[i + 12] < 0 ? "var(--bad)" : undefined }}>{prices[i + 12]}</td>
                <td><input className="mw" type="number" step={10} value={schedule[i + 12] || ""} placeholder="0" onChange={(e) => set(i + 12, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {knowsStateOfCharge ? (
        <div className={`sim ${sim.feasible ? "good" : "bad"}`}>
          <strong>Pre-check (with state of charge):</strong> {sim.feasible ? "schedule is physically deliverable." : "schedule is NOT deliverable."} Market margin EUR {sim.marketMarginEUR.toLocaleString("en-US")}
          {!sim.feasible && <> · correction cost about EUR {sim.correctionCostEUR.toLocaleString("en-US")}</>}
          {sim.issues.length > 0 && <ul className="clean" style={{ marginTop: 4 }}>{sim.issues.slice(0, 4).map((i, k) => <li key={k}>{i}</li>)}</ul>}
        </div>
      ) : (
        <div className="sim">
          <strong>Pre-check:</strong> buy {bought} MWh, sell {sold} MWh, market margin EUR {sim.marketMarginEUR.toLocaleString("en-US")}.
          <div className="muted" style={{ marginTop: 4 }}>Energy balance only. The pre-check does not know the battery's state of charge until you have looked at Asset status.</div>
        </div>
      )}
    </div>
  );
}
