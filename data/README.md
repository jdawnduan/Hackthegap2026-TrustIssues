# data/

- The app runs on **real** hourly series for Sunday 11 May 2025 (DE-LU), stored in `src/shared/realday.json` and written by `scripts/fetch_real_data.py`. That day residual load went negative at midday and the day-ahead price hit −250 EUR/MWh.
- `real/` (git-ignored) is where the script keeps the raw JSON responses.

| Source | Licence | Used for |
|---|---|---|
| [Energy-Charts API](https://api.energy-charts.info), Fraunhofer ISE | CC BY 4.0 | Day-ahead prices, load, solar, wind (DE-LU) |
| [Open-Meteo](https://open-meteo.com) historical API | CC BY 4.0 | Hourly cloud cover and temperature, southern Germany |
| [ENTSO-E Transparency Platform](https://transparency.entsoe.eu) | ENTSO-E terms; API token required | Outages, cross-border capacity (not fetched yet) |

Invented for the cases: the battery, its state of charge and curtailment note, the afternoon cloud-band forecast update (the real day stayed cloudless), intraday price indications, border capacities and the news feed.
