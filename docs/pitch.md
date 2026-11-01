# Pitch outline (5 minutes)

Team **Trust Issues** · project **Gate Closure**

## 0:00 Hook (30 s)

"We're Trust Issues, and so should your juniors be."

Alpiq earns money by selling its flexibility at the right price. A junior approving a bid the AI drafted, without checking, is real money on the line. The problem isn't that the AI is wrong. It's that it's right 80 % of the time, so nobody practises catching the 20 %.

## 0:30 The two problems from the brief (30 s)

The ladder gets shorter: the AI does the work that used to teach the job. The seat at the wheel gets empty: checking is a skill, and skills fade. We built a gym for that skill.

## 1:00 Live demo: Dawn's day (2 min 30)

- **Case 1, 09:30.** Battery bid for Sunday 11 May 2025, a real day when German prices hit −250 EUR/MWh. The copilot's story is perfect: record solar, we get paid to charge at noon, sell into the evening peak. The senior asks: "Where would the 100 MWh physically go?" Dawn doesn't check the asset. She accepts. *Debrief:* the battery was 80 % full after yesterday's curtailment. 80 MWh had nowhere to go. "Check your own book before you trust a market story."
- **Case 2, 15:00.** Her flawed position is now live: urgent clean-up and a loss on screen. New copilot proposal: a cloud band lifts afternoon prices, but not enough to move the charging, so hold. Burned once, the temptation is to distrust it and 'do something'. The gym scores that as a failure too: re-shifting would cost EUR 8k. She checks the weather tab, compares 11:00 with 13:00, dismisses the Flamanville 3 headline (returns Monday, flow-based border, Germany is exporting), and holds with a limit and an unwind rule.
- **Profile.** Week 1 vs week 8 radar, calibration table, hints per case falling, the missed lesson queued to come back as a hydro reservoir case.
- **Senior dashboard.** Every decision: what the AI said, what Dawn decided, what she opened, who is accountable. Rubber-stamp flags.
- **Debrief inbox.** Paste a real desk debrief, the AI drafts the next case, a senior approves it.

## 3:30 Why this scores (30 s)

Learning is measured, not claimed: six sub-skills, calibration, independence. Oversight is real: the junior decides and is accountable, the copilot never books, the audit trail shows the evidence. Business fit: asset-backed bidding and intraday prep is the daily job, with messy data and a live countdown.

## 4:00 Honest failure case (45 s)

**The gym can teach juniors to beat the gym.** If traps become predictable, juniors learn to spot *our* traps rather than real problems, and the scoring rewards a reflex ("always open Asset status") instead of judgement. Worse, a gamified loop can reward speed.

What we do about it: cases come from real desk debriefs, so the traps are last week's real mistakes; a share of cases has a correct AI, so blanket distrust is penalised; we score evidence and calibration, never speed; a human senior approves every case and rubric; and we would A/B the gym against real desk outcomes, not gym scores.

A second risk we name: the AI senior can leak the answer or carry its own blind spots. Hint levels are counted and capped, and seniors review the transcripts.

## 4:45 Close (15 s)

"The goal isn't zero trust. It's calibrated trust. Gate Closure trains the judgement to catch the AI before the auction does."

---

### Backup slides / likely questions

- **Why trading, not asset management?** Natural time pressure and messy public data; it is Alpiq's core business. The architecture (cases, copilot script, senior, rubric) is domain-agnostic.
- **Is the data real?** The market day is: Sunday 11 May 2025, when German residual load went negative at midday and day-ahead cleared at −250 EUR/MWh (Energy-Charts / SMARD, Open-Meteo), plus real ENTSO-E border capacities and the real Flamanville 3 outage notice. The battery, curtailment, the afternoon cloud update, intraday indications and the other headlines are invented.
- **What's offline vs. live?** Without an API key: scripted senior and rule-based grading. With one: live senior and LLM-graded reasoning, blended 50/50 with the rules.
- **How does help fade?** The hint ladder only climbs while key evidence is unopened; hints are penalised; countdowns shorten and traps get subtler as sub-skills pass 70.
