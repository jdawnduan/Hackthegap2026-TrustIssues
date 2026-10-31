import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hh, NET_POSITION_GW } from "../shared/market";
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
          <CartesianGrid stroke="var(--grey)" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "Hour", position: "insideBottomRight", offset: -4, fill: "var(--text-2)", fontSize: 12 }} />
          <YAxis stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "EUR/MWh", angle: -90, position: "insideLeft", fill: "var(--text-2)", fontSize: 12 }} />
          <Tooltip formatter={(v: number) => [`${v} EUR/MWh`, "Price"]} labelFormatter={(h) => hh(Number(h))} />
          <Area dataKey="price" stroke="var(--navy)" fill="var(--navy-soft)" type="monotone" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="scroll" style={{ maxHeight: 200 }}>
        <table className="data">
          <thead><tr><th>Hour</th><th>Price</th><th>Hour</th><th>Price</th></tr></thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => (
              <tr key={i}>
                <td className="num">{hh(i)}</td><td className={`num ${f[i].price < 0 ? "neg" : ""}`}>{f[i].price}</td>
                <td className="num">{hh(i + 12)}</td><td className={`num ${f[i + 12].price < 0 ? "neg" : ""}`}>{f[i + 12].price}</td>
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
          <CartesianGrid stroke="var(--grey)" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "Hour", position: "insideBottomRight", offset: -4, fill: "var(--text-2)", fontSize: 12 }} />
          <YAxis stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "GW", angle: -90, position: "insideLeft", fill: "var(--text-2)", fontSize: 12 }} />
          <Tooltip labelFormatter={(h) => hh(Number(h))} />
          <Line dataKey="load" name="Load" stroke="var(--text-2)" dot={false} type="monotone" isAnimationActive={false} />
          <Line dataKey="solar" name="Solar" stroke="var(--gold)" dot={false} type="monotone" isAnimationActive={false} />
          <Line dataKey="wind" name="Wind" stroke="var(--grey-2)" strokeWidth={2} dot={false} type="monotone" isAnimationActive={false} />
          <Line dataKey="residual" name="Residual" stroke="var(--navy)" strokeWidth={2.5} dot={false} type="monotone" isAnimationActive={false} />
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
          <CartesianGrid stroke="var(--grey)" />
          <XAxis dataKey="hour" tickFormatter={tick} stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "Hour", position: "insideBottomRight", offset: -4, fill: "var(--text-2)", fontSize: 12 }} />
          <YAxis yAxisId="l" stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "Cloud %", angle: -90, position: "insideLeft", fill: "var(--text-2)", fontSize: 12 }} />
          <YAxis yAxisId="r" orientation="right" stroke="var(--text-2)" tick={{ fill: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12 }} label={{ value: "GW · °C", angle: 90, position: "insideRight", fill: "var(--text-2)", fontSize: 12 }} />
          <Tooltip labelFormatter={(h) => hh(Number(h))} />
          <Area yAxisId="l" dataKey="cloud" name="Cloud cover %" stroke="var(--grey-2)" fill="var(--grey)" type="monotone" isAnimationActive={false} />
          <Line yAxisId="r" dataKey="solar" name="Solar GW" stroke="var(--gold)" dot={false} type="monotone" isAnimationActive={false} />
          <Line yAxisId="r" dataKey="temp" name="Temp °C" stroke="var(--navy)" dot={false} type="monotone" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="scroll" style={{ maxHeight: 170 }}>
        <table className="data">
          <thead><tr><th>Hour</th><th>Cloud %</th><th>Solar GW</th><th>Temp °C</th></tr></thead>
          <tbody>{f.map((p) => <tr key={p.hour}><td className="num">{hh(p.hour)}</td><td className="num">{p.cloud}</td><td className="num">{p.solar}</td><td className="num">{p.temp}</td></tr>)}</tbody>
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
  const maxExport = Math.min(...NET_POSITION_GW);
  const hExport = NET_POSITION_GW.indexOf(maxExport);
  return (
    <div>
      <h4>Day-ahead forecast transfer capacities, DE-LU borders, tomorrow (ENTSO-E)</h4>
      <table className="data">
        <thead><tr><th>From</th><th>To</th><th>Capacity MW</th><th>Note</th></tr></thead>
        <tbody>
          {b.map((r) => (
            <tr key={`${r.from}-${r.to}`}>
              <td>{r.from}</td><td style={{ textAlign: "left" }}>{r.to}</td>
              <td className="num" style={{ color: r.published ? undefined : "var(--text-2)" }}>{r.published ? (r.minMW === r.maxMW ? `${r.minMW}` : `${r.minMW}–${r.maxMW}`) : "n/e"}</td>
              <td style={{ textAlign: "left" }}>{r.note || "Published hourly"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 6 }}>"n/e" borders (FR, AT, BE, CZ, PL) sit inside the Core flow-based market coupling: there is no fixed capacity number to be "full" or "free"; the algorithm allocates flows on the whole grid at once.</p>
      <h4 style={{ marginTop: 12 }}>Germany net position, same day (GW; negative = exporting)</h4>
      <div className="scroll" style={{ maxHeight: 150 }}>
        <table className="data">
          <thead><tr><th>Hour</th><th>Net GW</th><th>Hour</th><th>Net GW</th></tr></thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => (
              <tr key={i}>
                <td className="num">{hh(i)}</td><td className={`num ${NET_POSITION_GW[i] < 0 ? "neg" : ""}`}>{NET_POSITION_GW[i]}</td>
                <td className="num">{hh(i + 12)}</td><td className={`num ${NET_POSITION_GW[i + 12] < 0 ? "neg" : ""}`}>{NET_POSITION_GW[i + 12]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Germany is a net exporter from 09:00 to 17:00, peaking at {Math.abs(maxExport)} GW out at {hh(hExport)}: the midday problem is surplus, not scarcity.</p>
    </div>
  );
}

function News({ n }: { n: NewsItem[] }) {
  return (
    <div>
      <h4>Desk news feed</h4>
      {[...n].reverse().map((item, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--grey)" }}>
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
                <td className="num">{hh(r.h)}</td><td style={{ textAlign: "left" }}>{r.mw > 0 ? "Sell" : "Buy"}</td><td className="num">{Math.abs(r.mw)}</td>
                <td className="num">{a.cleared[r.h]}</td><td className="num">{a.intraday[r.h]}</td>
                <td className={`num ${a.intraday[r.h] - a.cleared[r.h] > 0 ? "pos" : ""}`}>{(a.intraday[r.h] - a.cleared[r.h] > 0 ? "+" : "") + (a.intraday[r.h] - a.cleared[r.h])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {a.issues.length > 0 && <ul className="clean" style={{ marginTop: 8, color: "var(--coral-text)" }}>{a.issues.map((i, k) => <li key={k}>{i}</li>)}</ul>}
    </div>
  );
}
