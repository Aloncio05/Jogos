---
phase: Uno Rule Alignment
reviewers: [claude]
reviewed_at: 2026-06-16T07:47:13.3442005-03:00
plans_reviewed: [gsd-review-prompt-uno.md]
notes: "No .planning phase artifacts were found; review was generated from the provided Uno requirements and detected project context."
---

# Cross-AI Plan Review - Phase Uno Rule Alignment

## the agent Review

# Cross-AI Plan Review: Uno Rule Alignment

## 1. Summary

The phase targets rule compliance for a Uno-inspired browser card game with an existing vanilla JS + Firebase implementation. The good news: roughly half the listed rules are already correctly implemented, including Wild Draw 4 legality, numeric/action/wild scoring values, draw-one mechanic, reverse direction, and draw pile reshuffle. The bad news: the phase document reads as a requirements list, not an implementation plan. It says nothing about task ordering, what currently exists vs. what needs to be built, or how online multiplayer state will be kept consistent when rules change mid-game. The most significant unaddressed gaps are the 500-point cumulative game victory, which requires persistent cross-round state that does not currently exist, and the player-limit change from 8 to 10, which is simple in the UI but non-trivial for Firebase synchronization. Without a concrete task breakdown, this phase risks either leaving gaps or scope-creeping into large refactors mid-sprint.

## 2. Strengths

- **Wild Draw 4 legality is already correct.** `script.js:858` enforces that +4 can only be played when the player holds no card of the active color. No rework needed.
- **Scoring values are already correct.** `script.js:1092-1096` already implements face-value for numbers, 20 for action cards, 50 for wilds. The plan's scoring table matches the code.
- **Draw mechanic is already aligned.** "Draw one; if playable, play it; otherwise pass" is implemented for both bots (`script.js:1119-1132`) and presumably human turns. This is the official rule, not draw-until-playable.
- **Direction reversal is implemented including 2-player edge case.** `script.js:921-924` flips `cardDirection *= -1` and advances 2 turns in 2-player mode, making Reverse act as Skip, which matches the most widely accepted 2-player interpretation.
- **Firebase sync is comprehensive.** Full game state serialization (`script.js:1233-1250`) plus self-update deduplication (`script.js:1253`) form a reasonable foundation.

## 3. Concerns

### HIGH - 500-Point Game Victory Requires Cross-Round Persistence

Current state: no evidence of cumulative score tracking across rounds. The `getCardScore()` function calculates round scores, but there is no game-level score accumulator, no "game over at 500" check, and no persistent state between rounds.

Impact: this is not a small fix. Cumulative scoring requires a per-player score ledger, round-end aggregation, a "game over at 500" check, and for online rooms, Firebase persistence of that ledger so a page refresh does not reset the game total.

Risk: if overlooked, the game remains a single-round variant, not an official Uno game.

### HIGH - Player Limit Change From 8 To 10 Has Multiplayer Implications

Current state: `script.js:575` hard-codes a limit of 8 with an explicit error string. Changing the cap to 10 requires updating the guard condition and message, verifying Firebase Realtime Database write size remains acceptable, and ensuring the UI renders correctly at 9 and 10 players.

The plan does not mention these downstream effects.

### HIGH - Uno Catch Mechanic Does Not Match Official Rules

Current state: `script.js:1037-1039` applies the 2-card penalty automatically when a player reaches 1 card without calling Uno. Official rules require another player to catch the omission before the next play begins; the offender is only penalized if caught.

Impact: the current mechanic removes player agency and is factually incorrect per the stated goal. Fixing it requires a catch window, such as a time-boxed period or explicit catch button, with multiplayer synchronization rules for who can trigger the penalty, the window boundary, and duplicate catches.

### MEDIUM - Wild Draw 4 Challenge Mechanic Is Ambiguous

Current state: `script.js:919` references `lastPlusFour` being cleared, suggesting a challenge mechanic may have been partially designed. The plan neither mentions nor explicitly excludes the challenge rule.

Risk: this ambiguity can leave dead code or a confusing half-feature. The plan should explicitly decide whether to implement the challenge rule or exclude it.

### MEDIUM - Variant Settings Have No Defined UI Or Data Model

The plan correctly says variants should be opt-in settings rather than implicit default behavior, but neither the plan nor the existing code defines settings infrastructure. Variant settings require a room-level data model, host-only controls before game start, Firebase persistence, and rule logic conditioned on those flags.

Without this structure, variant logic will become hardcoded or the variant language will remain dead text.

### MEDIUM - Draw 2 / Wild Draw 4 Stacking Behavior Is Silently Off

The current behavior appears to apply draw effects immediately with no stacking. This is correct official behavior, but the plan should explicitly state that stacking is disabled by default and only enabled through an opt-in setting.

### LOW - Reshuffle Edge Case: Empty Discard After Reshuffle

The reshuffle logic should be verified when the discard pile has exactly one card and a draw is triggered. This edge case can produce an empty or undefined discard pile depending on implementation details.

### LOW - Bot Behavior Alignment With New Rules

If an Uno catch window is added, bots need logic to decide when to call catches. If 500-point victory is added, bots likely need no strategic changes but should be tested across multi-round sessions.

## 4. Suggestions

1. Audit what is already done before writing new code. Wild Draw 4 legality, scoring values, draw-one mechanic, and direction reversal appear already compliant.
2. Decompose 500-point victory into a separate sub-task because it touches round flow, Firebase persistence, and scoreboard UI.
3. Define the Uno catch window before coding it. Decide whether it is time-based or button-based, who can send the catch event, how ties are resolved, and how online clients validate timing.
4. Add a room-level `settings` node to Firebase, such as `rooms/{code}/settings: { stackingEnabled: false, drawUntilPlayable: false }`, and lock settings once the game starts.
5. Test UI layout at 9 and 10 players in a real browser session before marking the player-limit task complete.
6. Explicitly document or remove the Wild Draw 4 challenge path. If `lastPlusFour` is leftover from an incomplete challenge feature, either complete it or remove the dead code.
7. Add a regression test session for the reshuffle edge case.

## 5. Risk Assessment

**Overall Risk: HIGH**

The phase conflates low-risk rule tweaks with larger new features: 500-point game victory, Uno catch window, and variant settings infrastructure. The new features each require Firebase schema changes, multiplayer synchronization design, and UI work that are not yet planned in detail.

The main risk is the 500-point game victory because it does not exist as a complete game-level system and is non-trivial to add correctly in a Firebase-synchronized, multi-round context. The secondary risk is the Uno catch mechanic rewrite because moving from automatic penalty to player-triggered catch introduces synchronization and abuse risks.

Recommendation: split the work into smaller phases. Phase A should handle rule compliance and narrow fixes such as player limit, Uno catch window, and variant settings scaffold. Phase B should handle cumulative scoring and full-game victory.

---

## Consensus Summary

Only one external reviewer was available, so this section is a single-reviewer synthesis rather than a true cross-model consensus.

### Agreed Strengths

- Several official Uno mechanics appear already implemented and should be audited before rewriting: Wild Draw 4 legality, scoring values, draw-one behavior, and reverse direction.
- The existing Firebase state synchronization gives a foundation for multiplayer rule work.

### Agreed Concerns

- The 500-point full-game victory is the highest-risk missing feature because it requires cumulative scoring, round lifecycle, persistence, and UI updates.
- The requested 2-10 player support cannot be treated as just changing a numeric limit; UI and multiplayer synchronization need validation at 9 and 10 players.
- The Uno declaration/penalty behavior likely needs redesign because automatic penalty does not match the stated catch-before-next-play rule.
- Variant rules need explicit settings and default-off behavior to avoid silently changing official rules.

### Divergent Views

- No divergent reviewer views were available because only `claude` was successfully invoked.
