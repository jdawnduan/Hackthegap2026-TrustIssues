# Where we used AI in building Gate Closure

Required deliverable: a short note on where AI was used. Kept honest and specific; update as the build continues.

## In the product itself

| Component | AI | Notes |
|---|---|---|
| AI senior (chat coach) | Claude (`claude-opus-5-5`) via the Anthropic SDK, structured JSON output | Sees the hidden answer, trap, rubric and the junior's tab-open log; prompted to challenge, never answer; reports the hint level it used so the app can count it. Falls back to a scripted hint ladder without an API key |
| Grader | Same model | Scores reasoning quality and news judgement 0–100 and writes 2–3 sentences of feedback; blended 50/50 with a deterministic rule engine that owns the facts (decision, tabs opened, feasibility, P&L) |
| Debrief-to-case drafter | Same model | Turns a pasted desk debrief note into a draft case; a human senior must approve it before use. Template fallback offline |
| AI copilot (the recommendation the junior reviews) | **No live model** | Deliberately scripted per case so the trap is controlled and the demo is reproducible |

Refusal handling: requests opt into Anthropic's server-side default fallback; a declined or malformed reply degrades to offline mode rather than failing the case.

## In building it

- **Claude Code** (Anthropic) was used throughout: summarising the kickoff slides and talk transcript, comparing domains and tracks against the judging rubric, designing the two cases and the scoring rubric, writing the first version of the codebase (React + Vite front end, Express API, battery simulator, scoring engine, tests, docs), running it headless to screenshot and debug the flow, and drafting this note.
- Team members reviewed and steered every design decision in conversation (domain choice, Track B, the two cases, the team name) and hold the final say on what ships.
- Parts of the UI may be rebuilt or extended in **Lovable** by the team; those sections should be noted here when they land.

## What AI did not do

- It did not supply any Alpiq data. Market data is a real public day (11 May 2025, Energy-Charts / SMARD and Open-Meteo) fetched by a team member with the repo script; the rest is invented and labelled as such in `data/README.md`.
- It did not invent facts about Alpiq beyond the public kickoff material; statements about the desk are illustrative.
- No real person is modelled; the junior "Dawn" is invented.

## Honest caveats

- The LLM senior can leak hints too early or too late; it is prompted and tested against this but not formally evaluated.
- The LLM grade is blended with rules precisely because a model grading free text can be gamed by confident wording.
