# data/

- The app ships with **synthetic** series in `src/shared/market.ts` (a sunny German spring weekday), so the demo is deterministic and works offline.
- `real/` (git-ignored) is where `scripts/fetch_real_data.py` saves raw JSON from Energy-Charts and Open-Meteo.

| Source | Licence | Used for |
|---|---|---|
| [Energy-Charts API](https://api.energy-charts.info), Fraunhofer ISE | CC BY 4.0 | Day-ahead prices, load, solar, wind (DE-LU) |
| [Open-Meteo](https://open-meteo.com) historical API | CC BY 4.0 | Hourly cloud cover and temperature, southern Germany |
| [ENTSO-E Transparency Platform](https://transparency.entsoe.eu) | ENTSO-E terms; API token required | Outages, cross-border capacity (not fetched yet) |

Battery state of charge, the curtailment note, Alpiq's position, intraday indications, border capacities and the news feed are invented for the cases.
