#!/usr/bin/env python3
"""Turn two ENTSO-E Transparency Platform CSV exports into src/shared/entsoe.json.

The platform's REST API needs a token, but the GUI exports are free after sign-in
(table view -> menu -> Export -> CSV). Download for the delivery day:

  1. Transmission -> Forecasted Transfer Capacities - Day Ahead (TR 11.1), zone DE-LU,
     all borders selected.
  2. Outages -> Unavailability of Production and Generation Units (TR 15.1.A&B),
     area France, a few days around the delivery day.

Usage:
  python3 scripts/parse_entsoe_exports.py \
      --capacities data/real/GUI_FORECASTED_TRANSFER_CAPACITIES_DAY-AHEAD_*.csv \
      --outages data/real/UNAVAILABILITY_OF_PRODUCTION_AND_GENERATION_UNITS_*.csv \
      --date 2025-05-11

"n/e" in the capacity export means "not explicitly published": the border sits in a
flow-based market coupling (Core, or the Nordic HVDC links), where no fixed
day-ahead transfer capacity exists. Source: ENTSO-E Transparency Platform
(https://transparency.entsoe.eu), reuse with attribution.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
from datetime import datetime
from pathlib import Path

FLOW_BASED_NOTE = "n/e: flow-based market coupling (no fixed day-ahead capacity published)"


def parse_capacities(path: Path, zone: str):
    rows = list(csv.DictReader(path.open(encoding="utf-8-sig")))
    per_border: dict[tuple[str, str], list[float | None]] = collections.defaultdict(list)
    for r in rows:
        out_a = r["Out Area"].replace("BZN|", "")
        in_a = r["In Area"].replace("BZN|", "")
        v = r["Capacity (MW)"].strip()
        per_border[(out_a, in_a)].append(float(v) if v not in ("n/e", "N/A", "") else None)
    borders = []
    for (out_a, in_a), vals in sorted(per_border.items()):
        if zone not in (out_a, in_a):
            continue
        nums = [v for v in vals if v is not None]
        borders.append(
            {
                "from": out_a,
                "to": in_a,
                "published": bool(nums),
                "min_mw": min(nums) if nums else None,
                "max_mw": max(nums) if nums else None,
                "hourly_mw": vals if nums else None,
                "note": "" if nums else FLOW_BASED_NOTE,
            }
        )
    return borders


def parse_outages(path: Path, day: datetime):
    rows = list(csv.DictReader(path.open(encoding="utf-8-sig")))
    inst: dict[str, dict] = {}
    for r in rows:
        i = inst.setdefault(
            r["Instance Code"],
            {
                "unit": r["Unit Name"],
                "area": r["Area"].replace("BZN|", ""),
                "status": r["Status"],
                "window": r["Start & End Time (CET/CEST)"],
                "reason": "",
                "comment": "",
                "type": "",
                "installed_mw": None,
                "available_mw": None,
            },
        )
        if r["Reason"]:
            i["reason"] = r["Reason"]
            i["comment"] = r["Comment"]
        if r["Affected Asset Production Type"]:
            i["type"] = r["Affected Asset Production Type"]
        if r["Installed (MW)"]:
            i["installed_mw"] = float(r["Installed (MW)"])
            i["available_mw"] = float(r["Available (MW)"])

    def ts(s: str) -> datetime:
        return datetime.strptime(s.strip(), "%d/%m/%Y %H:%M")

    out = []
    for i in inst.values():
        start_s, end_s = i["window"].split(" - ")
        start, end = ts(start_s), ts(end_s)
        # keep outages that overlap the delivery day or end within 2 days after it
        if end < day.replace(hour=0) or (start - day).days > 1:
            continue
        i = dict(i, start=start.isoformat(timespec="minutes"), end=end.isoformat(timespec="minutes"))
        i["unavailable_mw"] = (
            round(i["installed_mw"] - i["available_mw"], 1) if i["installed_mw"] is not None else None
        )
        del i["window"]
        out.append(i)
    out.sort(key=lambda i: (i["type"] != "Nuclear", -(i["unavailable_mw"] or 0)))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--capacities", required=True, type=Path)
    ap.add_argument("--outages", required=True, type=Path)
    ap.add_argument("--date", required=True)
    ap.add_argument("--zone", default="DE-LU")
    ap.add_argument("--out", default="src/shared/entsoe.json")
    args = ap.parse_args()
    day = datetime.fromisoformat(args.date)

    borders = parse_capacities(args.capacities, args.zone)
    outages = parse_outages(args.outages, day)
    nuclear = [o for o in outages if o["type"] == "Nuclear"]
    data = {
        "date": args.date,
        "zone": args.zone,
        "source": "ENTSO-E Transparency Platform (transparency.entsoe.eu), GUI CSV exports; reuse with attribution",
        "capacity_note": FLOW_BASED_NOTE,
        "borders": borders,
        "outages_fr": outages,
    }
    Path(args.out).write_text(json.dumps(data, indent=1) + "\n")
    print(f"Wrote {args.out}: {len(borders)} border directions ({sum(b['published'] for b in borders)} with published MW), "
          f"{len(outages)} French outages overlapping {args.date} ({len(nuclear)} nuclear, "
          f"{sum(o['unavailable_mw'] or 0 for o in nuclear):.0f} MW nuclear unavailable).")
    for b in borders:
        if b["published"]:
            print(f"  {b['from']:>6} -> {b['to']:<6} {b['min_mw']:.0f}-{b['max_mw']:.0f} MW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
