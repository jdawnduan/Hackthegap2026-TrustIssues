#!/usr/bin/env python3
"""Fetch one real day of public market and weather data for the simulator.

Sources (no API key needed):
  * Energy-Charts API (Fraunhofer ISE), CC BY 4.0, data from Bundesnetzagentur /
    SMARD.de: day-ahead prices and public net generation for DE-LU.
    https://api.energy-charts.info
  * Open-Meteo historical weather API, CC BY 4.0: hourly cloud cover and
    temperature for southern Germany (default: Munich).  https://open-meteo.com

Outage notices and cross-border capacities live on the ENTSO-E Transparency
Platform. Its API needs a token, but the GUI CSV exports are free after
sign-in; see scripts/parse_entsoe_exports.py for those.

Usage:
  python3 scripts/fetch_real_data.py --date 2025-05-11

Writes src/shared/realday.json (what the app reads) and keeps the raw
responses under --raw (default data/real, git-ignored). Energy-Charts returns
the day aligned to Central European time, so the first 24 hourly values are
the 24 delivery hours of that day; Open-Meteo is asked for Europe/Berlin time
so the hours line up.

Only the standard library is used (certifi is picked up if installed).
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

EC = "https://api.energy-charts.info"
OM = "https://archive-api.open-meteo.com/v1/archive"


def ssl_context() -> ssl.SSLContext:
    """python.org builds of Python on macOS ship without root certificates until
    "Install Certificates.command" is run. Fall back to certifi's bundle when it
    is installed (pip install certifi) so the script works either way."""
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


CTX = ssl_context()


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "gate-closure-hackathon/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=60, context=CTX) as resp:  # noqa: S310 (public https endpoints)
            return json.load(resp)
    except urllib.error.URLError as e:
        if "CERTIFICATE_VERIFY_FAILED" in str(e):
            sys.exit(
                "TLS certificate verification failed. On macOS with a python.org Python, run\n"
                "  /Applications/Python\\ 3.x/Install\\ Certificates.command\n"
                "or install certifi:  pip3 install certifi   and rerun."
            )
        raise


def hourly_from_quarters(values: list[float | None]) -> list[float]:
    """Average 15-minute values into the first 24 hourly buckets."""
    out = []
    for h in range(24):
        q = [float(v) for v in values[h * 4 : h * 4 + 4] if v is not None]
        out.append(round(sum(q) / len(q), 1) if q else 0.0)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="Delivery day, YYYY-MM-DD (a sunny German Sunday gives the deepest trough)")
    ap.add_argument("--raw", default="data/real", help="where to keep the raw API responses")
    ap.add_argument("--out", default="src/shared/realday.json", help="JSON the app reads")
    ap.add_argument("--bzn", default="DE-LU", help="Energy-Charts bidding zone")
    ap.add_argument("--lat", type=float, default=48.14)
    ap.add_argument("--lon", type=float, default=11.58)
    ap.add_argument("--place", default="Munich")
    args = ap.parse_args()

    day = date.fromisoformat(args.date)
    nxt = day + timedelta(days=1)
    raw = Path(args.raw)
    raw.mkdir(parents=True, exist_ok=True)

    # --- Energy-Charts: day-ahead price (hourly, CET-aligned) ------------------
    q = urllib.parse.urlencode({"bzn": args.bzn, "start": day.isoformat(), "end": nxt.isoformat()})
    price_raw = get_json(f"{EC}/price?{q}")
    (raw / "energy_charts_price.json").write_text(json.dumps(price_raw))
    prices = [round(float(v), 1) for v in price_raw["price"][:24]]

    # --- Energy-Charts: public power (15-min: load, solar, wind) ---------------
    country = "de" if args.bzn.startswith("DE") else args.bzn.split("-")[0].lower()
    q = urllib.parse.urlencode({"country": country, "start": day.isoformat(), "end": nxt.isoformat()})
    power_raw = get_json(f"{EC}/public_power?{q}")
    (raw / "energy_charts_public_power.json").write_text(json.dumps(power_raw))
    series = {p.get("name", ""): p.get("data", []) for p in power_raw.get("production_types", [])}

    def pick(*names: str) -> list[float]:
        for n in names:
            if n in series:
                return [round(v / 1000, 1) for v in hourly_from_quarters(series[n])]  # MW -> GW
        print(f"[warn] none of {names} in Energy-Charts production_types; got {sorted(series)}", file=sys.stderr)
        return [0.0] * 24

    load = pick("Load", "Load (incl. self-consumption)")
    solar = pick("Solar")
    wind = [round(a + b, 1) for a, b in zip(pick("Wind onshore"), pick("Wind offshore"))]

    # --- Open-Meteo: cloud cover and temperature, local time -------------------
    q = urllib.parse.urlencode(
        {
            "latitude": args.lat,
            "longitude": args.lon,
            "start_date": day.isoformat(),
            "end_date": day.isoformat(),
            "hourly": "cloud_cover,temperature_2m",
            "timezone": "Europe/Berlin",
        }
    )
    wx = get_json(f"{OM}?{q}")
    (raw / "open_meteo.json").write_text(json.dumps(wx))
    cloud = [round(float(v or 0)) for v in wx["hourly"]["cloud_cover"]][:24]
    temp = [round(float(v or 0)) for v in wx["hourly"]["temperature_2m"]][:24]

    out = {
        "date": day.isoformat(),
        "weekday": day.strftime("%A"),
        "zone": args.bzn,
        "weather_location": f"{args.place} ({args.lat}N, {args.lon}E)",
        "hours": "CET/CEST delivery hours 00:00-23:00",
        "sources": {
            "prices_load_generation": "Energy-Charts API (Fraunhofer ISE), data from Bundesnetzagentur | SMARD.de, CC BY 4.0",
            "weather": "Open-Meteo historical weather API, CC BY 4.0",
        },
        "price_da_eur_mwh": prices,
        "load_gw": load,
        "solar_gw": solar,
        "wind_gw": wind,
        "cloud_cover_pct": cloud,
        "temp_c": temp,
    }
    Path(args.out).write_text(json.dumps(out, indent=1) + "\n")

    print(f"Wrote {args.out} for {day} ({day.strftime('%A')}, {args.bzn}).")
    print(f"  price min {min(prices)} @ {prices.index(min(prices)):02d}:00, max {max(prices)} @ {prices.index(max(prices)):02d}:00 EUR/MWh")
    print(f"  solar peak {max(solar)} GW, load range {min(load)}-{max(load)} GW")
    print("Now re-check src/shared/cases.ts: the Case 1 trap needs a cheap midday and an expensive evening,")
    print("and the reference schedule assumes no morning peak (Sunday). Run `npm test`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
