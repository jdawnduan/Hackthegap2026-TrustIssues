#!/usr/bin/env python3
"""Fetch one real day of public market and weather data to anchor the simulator.

Sources (no API key needed):
  * Energy-Charts API (Fraunhofer ISE), CC BY 4.0: day-ahead prices and public
    net generation for the DE-LU bidding zone.  https://api.energy-charts.info
  * Open-Meteo historical weather API, CC BY 4.0: hourly cloud cover and
    temperature for southern Germany (default: Munich).  https://open-meteo.com

Outage notices and cross-border capacities live on the ENTSO-E Transparency
Platform, which needs a free API token (register, then email
transparency@entsoe.eu with subject "Restful API access"). Not fetched here.

Usage:
  python3 scripts/fetch_real_data.py --date 2025-05-11 --out data/real

Writes raw JSON to --out and prints TypeScript arrays (24 hourly values each)
to paste into src/shared/market.ts. Written without network access at the
hackathon venue, so treat the response parsing as "best effort": if a field
name has changed upstream the script prints the raw keys it received.

Only the standard library is used.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

EC = "https://api.energy-charts.info"
OM = "https://archive-api.open-meteo.com/v1/archive"


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "gate-closure-hackathon/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (public https endpoints)
        return json.load(resp)


def hourly(values: list[float | None], timestamps: list[int], day: date) -> list[float]:
    """Average sub-hourly values into 24 hourly buckets for the given UTC day."""
    buckets: list[list[float]] = [[] for _ in range(24)]
    for ts, v in zip(timestamps, values):
        if v is None:
            continue
        t = datetime.fromtimestamp(ts, tz=timezone.utc)
        if t.date() == day:
            buckets[t.hour].append(float(v))
    return [round(sum(b) / len(b), 1) if b else 0.0 for b in buckets]


def ts_array(name: str, values: list[float]) -> str:
    return f"const {name} = [{', '.join(str(v) for v in values)}];"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="UTC day, YYYY-MM-DD (a sunny German weekday works best)")
    ap.add_argument("--out", default="data/real")
    ap.add_argument("--bzn", default="DE-LU", help="Energy-Charts bidding zone")
    ap.add_argument("--lat", type=float, default=48.14)
    ap.add_argument("--lon", type=float, default=11.58)
    args = ap.parse_args()

    day = date.fromisoformat(args.date)
    nxt = day + timedelta(days=1)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # --- Energy-Charts: day-ahead price --------------------------------------
    q = urllib.parse.urlencode({"bzn": args.bzn, "start": day.isoformat(), "end": nxt.isoformat()})
    price_raw = get_json(f"{EC}/price?{q}")
    (out / "energy_charts_price.json").write_text(json.dumps(price_raw))
    prices = hourly(price_raw.get("price", []), price_raw.get("unix_seconds", []), day)

    # --- Energy-Charts: public power (load, solar, wind) ----------------------
    country = "de" if args.bzn.startswith("DE") else args.bzn.split("-")[0].lower()
    q = urllib.parse.urlencode({"country": country, "start": day.isoformat(), "end": nxt.isoformat()})
    power_raw = get_json(f"{EC}/public_power?{q}")
    (out / "energy_charts_public_power.json").write_text(json.dumps(power_raw))
    series = {p.get("name", ""): p.get("data", []) for p in power_raw.get("production_types", [])}
    stamps = power_raw.get("unix_seconds", [])

    def pick(*names: str) -> list[float]:
        for n in names:
            if n in series:
                return [v / 1000 for v in hourly(series[n], stamps, day)]  # MW -> GW
        print(f"[warn] none of {names} in Energy-Charts production_types; got {sorted(series)}", file=sys.stderr)
        return [0.0] * 24

    load = pick("Load", "Load (incl. self-consumption)")
    solar = pick("Solar")
    wind = [round(a + b, 1) for a, b in zip(pick("Wind onshore"), pick("Wind offshore"))]

    # --- Open-Meteo: cloud cover and temperature ------------------------------
    q = urllib.parse.urlencode(
        {
            "latitude": args.lat,
            "longitude": args.lon,
            "start_date": day.isoformat(),
            "end_date": day.isoformat(),
            "hourly": "cloud_cover,temperature_2m",
            "timezone": "UTC",
        }
    )
    wx = get_json(f"{OM}?{q}")
    (out / "open_meteo.json").write_text(json.dumps(wx))
    cloud = [round(float(v or 0)) for v in wx.get("hourly", {}).get("cloud_cover", [])][:24]
    temp = [round(float(v or 0)) for v in wx.get("hourly", {}).get("temperature_2m", [])][:24]

    print(f"// Real data for {day} ({args.bzn}). Sources: Energy-Charts (CC BY 4.0), Open-Meteo (CC BY 4.0).")
    print(ts_array("PRICE_DA", prices))
    print(ts_array("LOAD", load))
    print(ts_array("SOLAR_MORNING", solar))
    print(ts_array("WIND", wind))
    print(ts_array("CLOUD_MORNING", cloud))
    print(ts_array("TEMP", temp))
    print("// Paste into src/shared/market.ts, then re-check the Case 1 trap: the midday hours must still be cheap enough")
    print("// and the evening peak expensive enough for the battery story to hold. Adjust BATTERY.stateOfChargeMWh if needed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
