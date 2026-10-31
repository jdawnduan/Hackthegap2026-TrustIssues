# Gate Closure — one-page design

**Problem.** Juniors on a trading desk now get an AI copilot from day one. It is right most of the time, which is exactly what stops them from building the judgement to catch it when it is not. Alpiq needs, in five years, people who can still make the call.

**Design.** A judgement gym: short, realistic trading cases under a gate-closure countdown, with an AI copilot that is sometimes planted wrong and an AI senior that challenges reasoning but never answers. Every decision is scored, logged and fed back.

## Who does what

| Role | Does | Does not |
|---|---|---|
| **Junior trader** (Mia) | Reviews the copilot's proposal, investigates data tabs, argues with the senior, decides (accept / modify / reject / escalate), states confidence and rationale | Delegate the decision to the AI |
| **AI copilot** | Proposes a bid or plan with sources and a confident rationale. Scripted per case; in some cases the trap | Book trades. Hold any accountability |
| **AI senior** (live LLM) | Asks "what would change your mind?", "what's the downside?", "what did you not check?"; hint ladder climbs only while key evidence is unopened; grades reasoning quality | Give the answer, confirm or deny the copilot |
| **Human senior trader** | Reviews the audit trail and rubber-stamp flags, holds the weekly debrief, approves every new case the AI drafts from debrief notes, owns escalated decisions | Rubber-stamp: a share of what seniors review is known-wrong AI output |
| **Desk / organisation** | Feeds real debriefs into the gym so juniors practise last week's real mistakes | Use real personal data |

## Who is accountable

The **junior** owns every decision inside their limit, including the decision to accept the AI. "The AI said so" is not a defence; the log shows what they checked. Escalated decisions belong to the **senior**. The **copilot owns nothing**: it proposes and never books. A human senior signs off every training case before any junior sees it.

## What the junior learns (six sub-skills)

1. **Checks own book** before trusting a market story (position, state of charge, limits).
2. **Reads market fundamentals** (residual load, solar/wind, price shape).
3. **Verifies with independent sources** rather than the copilot's own citations.
4. **Judges news relevance** (real driver vs. red herring).
5. **Catches AI errors, and trusts a correct AI after checking** (calibrated trust, not blanket distrust).
6. **Risk and sizing** (feasible volumes, price limits, unwind conditions, escalating above limit).

Plus the meta-skill the whole design is about: knowing when something "feels off".

## How we measure it

| Measure | Source | Shown in |
|---|---|---|
| Sub-skill scores 0–100 per case | Rule engine (decision vs. truth, tabs opened, feasibility, P&L) blended with an LLM grade of the written reasoning | Debrief, profile radar, trend |
| Trap catch rate | Planted wrong-AI cases | Profile header |
| Calibration | Stated confidence vs. hit rate, by band | Profile |
| Independence | Hints used per case, anchoring (good first take overturned by the AI) | Profile, audit trail |
| Rubber-stamping | Accept in < 45 s or with < 2 evidence tabs opened | Senior dashboard flags |
| Oversight quality | How often the human overruled the AI and was right; trusted it and was right | Senior dashboard |
| Progression | Hints fall, countdown shortens, traps get subtler as scores pass 70; missed lessons return in a new form | Replay queue |

## Feedback loop

Desk debrief note → AI drafts a case (brief, copilot script, trap, rubric) → human senior edits and approves → case enters the gym → juniors practise the desk's real mistake. This keeps the gym current, including regulation changes, and lets seniors see their experience passed on.

## Honest limit

Juniors can learn to spot *our* traps instead of real problems, and gamification can reward speed. Mitigations: cases sourced from real debriefs, a mix of correct and wrong AI, scoring on evidence and calibration rather than speed, human approval of every case. Detail in `pitch.md`.
