# Gate Closure

**A judgement gym for junior energy traders.** Team **Trust Issues** · [Hack The Gap 2026](https://ai-weeks.ch/events/hack-the-gap-hackathon-for-women-flinta) (Swiss {ai} Weeks) · Alpiq challenge "The Junior Loop", **Track B: Judgement Gym**, trading domain.

> Juniors a few months into the job can't yet tell when an AI's confident proposal "feels off". Gate Closure trains exactly that, and measures it.

A junior trader works through short trading cases under a gate-closure countdown. An AI **copilot** proposes a bid. Sometimes it is subtly wrong. The junior investigates the data tabs, argues it out with an AI **senior** who challenges the reasoning but never gives the answer, then decides: accept, modify, reject or escalate. Every tab opened, hint used and decision taken is logged, scored across six sub-skills, and feeds a judgement profile a manager can use.

- **When:** 31 Oct – 1 Nov 2026 · **Where:** PB Labs, ETH Zurich
- **Team (Discord):** iori · Khanak · KillingPhysics · Vasiliki

## The demo in two cases (one trading day)

| | Case 1 · Day-ahead battery bid (09:30) | Case 2 · Intraday preparation (15:00) |
|---|---|---|
| Junior's task | Review the copilot's bid for a 50 MW / 100 MWh battery, approve or correct it | Prepare tomorrow's intraday plan after the auction results and the afternoon forecast update |
| The copilot is… | **Wrong by omission.** Its market story is true, but the battery is already 80 % full after a curtailed discharge; 80 of the 100 MWh it wants to buy cannot be stored | **Right.** A cloud front cuts German solar by ~6 GW in the afternoon. A French nuclear headline is a red herring |
| What we test | Checking your own book before trusting a market story; improving on the AI's plan | Verifying a correct AI instead of rubber-stamping it, or rejecting it out of distrust |
| Builds on | – | The position Case 1 created. Fell for the trap? Case 2 opens with an urgent clean-up and a loss |

Everything is **synthetic**: the junior ("Mia"), the asset, the desk, and the market day (modelled on a sunny German spring weekday). No real Alpiq data or people. See [Using real data](#using-real-data) to swap in a real day from public sources.

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
  market.ts        synthetic market day + battery simulator (feasibility, P&L, correction cost)
  cases.ts         the two cases: briefs, copilot scripts, traps, hidden senior notes, rubric
  scoring.ts       rule-based scoring of six sub-skills, calibration buckets
  offline.ts       scripted senior + template case drafter (no API key needed)
  history.ts       seeded weeks 1–7 for the invented junior
src/components/  Case desk, Debrief, Judgement profile, Senior dashboard, Debrief inbox
server/          Express API: /api/senior, /api/grade, /api/draft-case (Claude with offline fallback)
docs/            challenge brief, one-page design, pitch outline
scripts/         fetch_real_data.py: pull a real day from Energy-Charts + Open-Meteo
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

The simulator ships with synthetic series so the demo is deterministic and works offline. To anchor it on a real day:

```bash
python3 scripts/fetch_real_data.py --date 2025-05-11 --out data/real
```

This pulls day-ahead prices, load, solar and wind for DE-LU from the [Energy-Charts API](https://api.energy-charts.info) (Fraunhofer ISE, CC BY 4.0) and hourly cloud cover and temperature for southern Germany from [Open-Meteo](https://open-meteo.com) (CC BY 4.0), and prints TypeScript arrays you can paste into `src/shared/market.ts`. ENTSO-E Transparency Platform data (outages, cross-border capacity) needs an API token; see the script header. `data/real/` is git-ignored.

## License

See [LICENSE](LICENSE).
