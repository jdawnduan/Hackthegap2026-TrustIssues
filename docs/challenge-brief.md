# The Junior Loop — challenge brief (Alpiq, Hack the Gap 2026)

Transcribed from the Alpiq brief and kickoff talk (30 Oct 2026) so the whole team has it in the repo.

> Design how Juniors and AI work together so that the people in the loop get better, not weaker, and keep the judgement to oversee the machine.

## 1. The challenge

AI now does well the tasks that used to teach people their profession: the first draft, the data clean-up, the summary, the routine check. Good for output today; two problems for tomorrow.

1. **The ladder gets shorter.** If entry-level work disappears or is handed to a machine, where does the next generation of experts learn?
2. **The seat at the wheel gets empty.** Every serious AI rule assumes a human can check the AI's work. Checking is a skill. Skills fade without practice.

**Task:** pick a real problem in a company like Alpiq and design, then prototype, a way of working where a junior colleague and an AI do the job together such that the work is done well, the junior measurably learns something from every task, and a human stays accountable and capable of catching the AI when it is wrong. You do not need to solve hiring. Show what a good first year with AI looks like.

## 2. Domains (any Alpiq function is fair game)

| Domain | Example junior task |
|---|---|
| Trading | Explaining a price move, checking a hedge, preparing a morning market note |
| Asset management | Reading sensor and outage data from a hydro plant or battery, drafting a maintenance recommendation |
| Sales | Preparing a customer proposal, pricing a supply contract, qualifying a lead |
| Operations | Handling a grid or plant disturbance, writing a shift handover, triaging alarms |
| Finance | Reconciling accounts, explaining a variance, preparing a forecast pack |
| Procurement | Comparing supplier bids, reviewing contract clauses, assessing supplier risk |

## 3. Tracks (pick one)

**Track A, Learning Partner.** Skill map of 4–6 sub-skills; a help dial per skill (show me / hint only / check my work / stay out of the way) that fades; think-first moments; a junior-owned learning log; an escape hatch under time pressure with a follow-up exercise. *Show: the same task at week 1 and week 8.*

**Track B, Judgement Gym (our track).** A scenario engine with realistic and rare cases; a sceptical AI senior who challenges reasoning ("what would change your mind?", "what is the downside?", "what did you not check?") and grades its quality; planted traps (wrong AI suggestion, data glitch, misleading framing); progression and replay of mistakes in a new form; a readable judgement profile for a development conversation. *Show: one scenario start to finish, including a trap the junior falls for and what the gym does next.*

**Track C, Trust and Oversight Protocol.** The review layer between AI output and sign-off: what the reviewer sees (sources, confidence, weak spots), verify/challenge/escalate triggers, keeping reviewers practised, a calibration view, clear accountability. *Show: a reviewer's day with one wrong decision stopped and one oversight failure.*

## 4. Deliverables

- A **running prototype** (any stack, any AI tool; a clickable mock is fine if the learning or oversight logic is real).
- A **one-page design**: who does what, who is accountable, what the junior learns, how you would measure it.
- A **5-minute pitch** including one honest failure case: how the design could make juniors worse or oversight weaker, and what you would do about it.
- A short note on **where you used AI** in building it.

## 5. Data and rules

Public or synthetic data only (ENTSO-E Transparency Platform and similar open sources suggested). Any AI model or tool. No real personal data about employees: invent your junior.

## 6. Judging

| Criterion | Weight | What good looks like |
|---|---|---|
| Learning effect | 30 % | The design makes skill growth measurable |
| Real oversight | 25 % | Clear who decides, how the AI is challenged, how the human stays capable |
| Fit to a real business problem | 20 % | A concrete task in a real function, with messy data and time pressure |
| Working prototype | 15 % | Demonstrably works on a realistic scenario |
| Honesty about limits | 10 % | The pitch names a way the design could fail |

## Notes from the talk and from an Alpiq contact

- A prototype says more than a slide deck; the pitch still matters ("you don't get a board decision without a good pitch").
- Learning should fit how the new generation learns: short, app-like loops with quick feedback, not A4 pages.
- Oversight should include a way to check afterwards what happened (reporting, audit trail).
- Alpiq's trading is mainly **asset-backed**: sell the power its hydro, gas and batteries can produce at a price that makes sense, across CWE, FR, CH, IT, DE, Nordics and Spain. Cross-border capacity is limited; you need capacity on the line to move power.
- **Residual load** (consumption minus solar and wind) is the number traders watch.
- A trader's case: challenge or propose a bidding scenario; prepare next day's intraday trading from auction results, price/temperature/solar forecasts and news.
- Batteries: charge on cheap midday solar, sell at the evening peak. Regulation changes can end a strategy that worked before.
- Traders hold debriefs; what comes out of them should feed the simulator over time.
- Also check Hugging Face for datasets.
