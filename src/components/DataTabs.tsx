import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hh } from "../shared/market";
import type { BatteryStatus, BorderCapacity, HourPoint, NewsItem, Schedule, TabId } from "../shared/types";
import { TAB_LABELS } from "../shared/types";

export interface TabData {
  forecast: HourPoint[];
  battery: BatteryStatus;
  borders: BorderCapacity[];
  news: NewsItem[];
  /** Case 2: cleared position and prices. */
  auction?: { position: Schedule; cleared: number[]; intraday: number[]; issues: string[]; note: string };
}

interface Props {
  tabs: TabId[];
  data: TabData;
  opened: Set<TabId>;
  urgent?: TabId[];
  onOpen: (tab: TabId) => void;
}

export function DataTabs({ tabs, data, opened, urgent = [], onOpen }: Props) {
  const [active, setActive] = useState<TabId | null>(null);
  const open = (t: TabId) => {
    setActive(t);
    onOpen(t);
  };
  return (
    <div>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={`${active === t ? "active" : ""} ${urgent.includes(t) ? "urgent" : ""}`} onClick={() => open(t)}>
            {TAB_LABELS[t]}
            {urgent.includes(t) ? " !" : ""}
            {opened.has(t) && <span className="seen" title="opened" />}
          </button>
        ))}
      </div>
      {active === null && <p className="muted">Open a tab to look at the data. Every tab you open is logged; that is part of how your judgement is scored.</p>}
      {active === "prices" && <Prices f={data.forecast} />}
      {active === "residual" && <Residual f={data.forecast} />}
      {active === "weather" && <Weather f={data.forecast} />}
      {active === "asset" && <Asset b={data.battery} />}
      {active === "borders" && <Borders b={data.borders} />}
      {active === "news" && <News n={data.news} />}
      {active === "auction" && data.auction && <Auction a={data.auction} />}
    </div>
  );
}

const tick = (h: number) => hh(h).slice(0, 2);

function Prices({ f }: { f: HourPoint[] }) {
  return (
    <div>
      <h4>Day-ahead price forecast, DE-LU, tomorrow (EUR/MWh)</h4>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={f} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--muted)" />
          <YAxis stroke="var(--muted)" />
          <Tooltip formatter={(v: number) => [`${v} EUR/MWh`, "Price"]} labelFormatter={(h) => hh(Number(h))} />
          <Area dataKey="price" stroke="var(--accent)" fill="var(--accent-soft)" type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="scroll" style={{ maxHeight: 200 }}>
        <table className="data">
          <thead><tr><th>Hour</th><th>Price</th><th>Hour</th><th>Price</th></tr></thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => (
              <tr key={i}>
                <td>{hh(i)}</td><td style={{ color: f[i].price < 0 ? "var(--bad)" : undefined }}>{f[i].price}</td>
                <td>{hh(i + 12)}</td><td style={{ color: f[i + 12].price < 0 ? "var(--bad)" : undefined }}>{f[i + 12].price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Residual({ f }: { f: HourPoint[] }) {
  return (
    <div>
      <h4>Residual load = load − solar − wind (GW), DE, tomorrow</h4>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={f} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--muted)" />
          <YAxis stroke="var(--muted)" />
          <Tooltip labelFormatter={(h) => hh(Number(h))} />
          <Line dataKey="load" name="Load" stroke="var(--muted)" dot={false} type="monotone" />
          <Line dataKey="solar" name="Solar" stroke="#e0a800" dot={false} type="monotone" />
          <Line dataKey="wind" name="Wind" stroke="#3b9fd6" dot={false} type="monotone" />
          <Line dataKey="residual" name="Residual" stroke="var(--accent)" strokeWidth={2.5} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="muted">High residual load means conventional plants set the price (expensive hours). Low or negative residual load means renewables flood the market (cheap or negative prices).</p>
    </div>
  );
}

function Weather({ f }: { f: HourPoint[] }) {
  return (
    <div>
      <h4>Weather, southern Germany, tomorrow</h4>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={f} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--muted)" />
          <YAxis yAxisId="l" stroke="var(--muted)" />
          <YAxis yAxisId="r" orientation="right" stroke="var(--muted)" />
          <Tooltip labelFormatter={(h) => hh(Number(h))} />
          <Area yAxisId="l" dataKey="cloud" name="Cloud cover %" stroke="#7a8aa0" fill="#7a8aa033" type="monotone" />
          <Line yAxisId="r" dataKey="solar" name="Solar GW" stroke="#e0a800" dot={false} type="monotone" />
          <Line yAxisId="r" dataKey="temp" name="Temp °C" stroke="var(--bad)" dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="scroll" style={{ maxHeight: 170 }}>
        <table className="data">
          <thead><tr><th>Hour</th><th>Cloud %</th><th>Solar GW</th><th>Temp °C</th></tr></thead>
          <tbody>{f.map((p) => <tr key={p.hour}><td>{hh(p.hour)}</td><td>{p.cloud}</td><td>{p.solar}</td><td>{p.temp}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Asset({ b }: { b: BatteryStatus }) {
  const pct = Math.round((b.stateOfChargeMWh / b.capacityMWh) * 100);
  return (
    <div>
      <h4>{b.name}</h4>
      <div className="score-grid">
        <div className="score"><small>Power</small><div className="v">{b.powerMW} MW</div></div>
        <div className="score"><small>Capacity</small><div className="v">{b.capacityMWh} MWh</div></div>
        <div className="score"><small>State of charge, 00:00 tomorrow</small><div className="v">{b.stateOfChargeMWh} MWh</div><div className="bar"><i style={{ width: `${pct}%` }} /></div><small>{pct}% full · room for {b.capacityMWh - b.stateOfChargeMWh} MWh</small></div>
        <div className="score"><small>Availability</small><div style={{ fontWeight: 600 }}>{b.availability}</div></div>
      </div>
      <h4 style={{ marginTop: 12 }}>Operations log</h4>
      <ul className="clean">{b.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
    </div>
  );
}

function Borders({ b }: { b: BorderCapacity[] }) {
  return (
    <div>
      <h4>Available cross-border capacity, tomorrow</h4>
      <table className="data">
        <thead><tr><th>Border</th><th>Direction</th><th>Available MW</th><th>Note</th></tr></thead>
        <tbody>{b.map((r) => <tr key={r.border}><td>{r.border}</td><td style={{ textAlign: "left" }}>{r.direction}</td><td style={{ color: r.availableMW === 0 ? "var(--bad)" : undefined }}>{r.availableMW}</td><td style={{ textAlign: "left" }}>{r.note}</td></tr>)}</tbody>
      </table>
      <p className="muted">Power only moves between countries if there is capacity left on the line. No capacity means a price difference cannot be traded.</p>
    </div>
  );
}

function News({ n }: { n: NewsItem[] }) {
  return (
    <div>
      <h4>Desk news feed</h4>
      {[...n].reverse().map((item, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
          <div className="row between"><strong>{item.headline}</strong><small className="mono">{item.time}</small></div>
          <small>{item.body}</small>
        </div>
      ))}
    </div>
  );
}

function Auction({ a }: { a: NonNullable<TabData["auction"]> }) {
  const rows = a.position.map((mw, h) => ({ h, mw })).filter((r) => r.mw !== 0);
  return (
    <div>
      <h4>Day-ahead auction results: your cleared position</h4>
      {a.note && <div className="alert" style={{ marginBottom: 8 }}>{a.note}</div>}
      {rows.length === 0 && <p>No volume cleared. You have no day-ahead position for tomorrow.</p>}
      {rows.length > 0 && (
        <table className="data">
          <thead><tr><th>Hour</th><th>Side</th><th>MW</th><th>Cleared DA</th><th>Intraday now</th><th>Δ</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.h}>
                <td>{hh(r.h)}</td><td style={{ textAlign: "left" }}>{r.mw > 0 ? "Sell" : "Buy"}</td><td>{Math.abs(r.mw)}</td>
                <td>{a.cleared[r.h]}</td><td>{a.intraday[r.h]}</td>
                <td style={{ color: a.intraday[r.h] - a.cleared[r.h] > 0 ? "var(--good)" : undefined }}>{(a.intraday[r.h] - a.cleared[r.h] > 0 ? "+" : "") + (a.intraday[r.h] - a.cleared[r.h])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {a.issues.length > 0 && <ul className="clean" style={{ marginTop: 8, color: "var(--bad)" }}>{a.issues.map((i, k) => <li key={k}>{i}</li>)}</ul>}
    </div>
  );
}
