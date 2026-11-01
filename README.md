# Gate Closure

**A judgement gym for junior energy traders.** Team **Trust Issues** · [Hack The Gap 2026](https://ai-weeks.ch/events/hack-the-gap-hackathon-for-women-flinta) (Swiss {ai} Weeks) · Alpiq challenge "The Junior Loop", **Track B: Judgement Gym**, trading domain.

> Juniors a few months into the job can't yet tell when an AI's confident proposal "feels off". Gate Closure trains exactly that, and measures it.

A junior trader works through short trading cases under a gate-closure countdown. An AI **copilot** proposes a bid. Sometimes it is subtly wrong. The junior investigates the data tabs, argues it out with an AI **senior** who challenges the reasoning but never gives the answer, then decides: accept, modify, reject or escalate. Every tab opened, hint used and decision taken is logged, scored across six sub-skills, and feeds a judgement profile a manager can use.

- **When:** 31 Oct – 1 Nov 2026 · **Where:** PB Labs, ETH Zurich
- **Team (Discord):** iori · Khanak · KillingPhysics · Vasiliki

## The demo in two cases (one trading day)

| | Case 1a · Day-ahead battery bid (09:30) | Case 1b · Intraday preparation (15:00) |
|---|---|---|
| Junior's task | Review the copilot's bid for a 50 MW / 100 MWh battery, approve or correct it | Prepare tomorrow's intraday plan after the auction results and the afternoon forecast update |
| The copilot is… | **Wrong by omission.** Its market story is true, but the battery is already 80 % full after a curtailed discharge; 80 of the 100 MWh it wants to buy cannot be stored | **Right, and says hold.** A cloud band lifts afternoon prices by ~40 EUR, but the midday trough is ~200 EUR deep, so moving the charging would cost ~EUR 8k. A real Flamanville 3 return notice is the red herring |
| What we test | Checking your own book before trusting a market story; improving on the AI's plan (on a Sunday, that means selling pre-dawn, since there is no morning peak) | Verifying a correct AI instead of rubber-stamping it, and resisting the urge to act after being burned |
| Builds on | – | The position 1a created. Fell for the trap? 1b opens with an urgent clean-up and a loss |

The market day is **real**: Sunday 11 May 2025 in the German zone, when residual load went negative at midday, Germany exported 12 GW, and the day-ahead price cleared at **−250 EUR/MWh** at 13:00 (Energy-Charts / SMARD, Open-Meteo, ENTSO-E Transparency Platform). Border capacities and the French nuclear notice in Case 1b are real too. The junior ("Dawn"), the battery and its curtailment, the afternoon cloud update, intraday indications and the other headlines are **invented**. No Alpiq data or people. See [Using real data](#using-real-data) to load a different day.

## Run it

```bash
npm install
cp .env.example .env        # optional: add ANTHROPIC_API_KEY for the live senior + grader
npm run dev                 # web on http://localhost:5173, API on :8787
```

Without an API key the app runs in **offline mode**: the senior follows a scripted Socratic hint ladder and grading is rule-based. With a key, the senior is a live Claude model (`claude-opus-5-5`) and reasoning quality is graded by Claude on top of the rules. The UI shows which mode is active.

```bash
npm test          # unit tests: battery simulator, scoring, offline senior
npm run build     # typecheck + production build
npm start         # serve the built app + API on :8787
```

## What's where

```
src/shared/      domain logic shared by browser and server
  market.ts        market day (from realday.json) + battery simulator (feasibility, P&L, correction cost)
  realday.json     real hourly series for 11 May 2025, written by scripts/fetch_real_data.py
  entsoe.json      real border capacities + French outage notices, written by scripts/parse_entsoe_exports.py
  cases.ts         the two cases: briefs, copilot scripts, traps, hidden senior notes, rubric
  scoring.ts       rule-based scoring of six sub-skills, calibration buckets
  offline.ts       scripted senior + template case drafter (no API key needed)
  history.ts       seeded weeks 1–7 for the invented junior
src/components/  Case desk, Debrief, Judgement profile, Senior dashboard, Debrief inbox
server/          Express API: /api/senior, /api/grade, /api/draft-case (Claude with offline fallback)
docs/            challenge brief, one-page design, pitch outline
scripts/         fetch_real_data.py (Energy-Charts + Open-Meteo), parse_entsoe_exports.py (ENTSO-E GUI CSVs)
AI_USAGE.md      where we used AI to build this (required deliverable)
```

## How it answers the brief

| Judging criterion | Where it shows |
|---|---|
| Learning effect (30 %) | Six sub-skills scored per case; calibration (confidence vs. accuracy); hints per case falling week over week; missed traps replayed in a new form; week 1 vs week 8 radar |
| Real oversight (25 %) | The junior decides and is accountable; the copilot never books a trade; every decision in an audit trail with the AI proposal, evidence opened and override; rubber-stamp flags; seniors approve every new case |
| Fit to a real business problem (20 %) | Asset-backed day-ahead bidding and intraday prep, the daily job on a short-term desk; messy data (curtailment buried in an ops log, a red-herring headline); a live gate-closure countdown |
| Working prototype (15 %) | Runs offline or live; two cases end to end; the second depends on the first |
| Honesty about limits (10 %) | See [docs/pitch.md](docs/pitch.md), "Honest failure case" |

## Using real data

`src/shared/realday.json` holds the hourly series the app runs on (24 CET/CEST delivery hours). To load a different day:

```bash
python3 scripts/fetch_real_data.py --date 2025-05-11
```

This pulls day-ahead prices, load, solar and wind for DE-LU from the [Energy-Charts API](https://api.energy-charts.info) (Fraunhofer ISE, data from Bundesnetzagentur / SMARD, CC BY 4.0) and hourly cloud cover and temperature for Munich from [Open-Meteo](https://open-meteo.com) (CC BY 4.0), writes `src/shared/realday.json`, and keeps the raw responses in `data/real/` (git-ignored). After loading a new day, re-read the Case 1a hidden notes in `src/shared/cases.ts`: the trap only works if midday is cheap and the evening is expensive, and the reference schedule assumes a Sunday with no morning peak.

Border capacities and outage notices come from the [ENTSO-E Transparency Platform](https://transparency.entsoe.eu). Its API needs a token, but the GUI exports are free after sign-in (table view → ⋮ → Export → CSV). Download *Transmission → Forecasted Transfer Capacities – Day Ahead* for DE-LU and *Outages → Unavailability of Production and Generation Units* for France, then:

```bash
python3 scripts/parse_entsoe_exports.py --capacities data/real/GUI_FORECASTED_*.csv --outages data/real/UNAVAILABILITY_*.csv --date 2025-05-11
```

If you see `CERTIFICATE_VERIFY_FAILED` on macOS with a python.org Python, run `/Applications/Python 3.x/Install Certificates.command` or `pip3 install certifi`.

## License

See [LICENSE](LICENSE).
