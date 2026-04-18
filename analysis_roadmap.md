# Shatranj Analysis Engine Roadmap

This document tracking the progress of replicating Chess.com-level analysis features in Shatranj using **Stockfish** and **Llama 3 70B Instruct**.

## 🟢 Fully Replicable (Powered by Stockfish)

| Status | Feature | Implementation Approach | 
| :---: | :--- | :--- |
| [ ] | **Move classifications** (Brilliant → Blunder) | Centipawn loss thresholds formula mapping |
| [ ] | **Accuracy score** (overall %) | Use formula: `103.1668 * exp(-0.04354 * avg_centipawn_loss) - 3.1669` |
| [x] | **Evaluation bar / graph** | Expose Stockfish CP score per position via API |
| [x] | **Top 3 engine moves per position** | Configure Stockfish with `MultiPV=3` |
| [x] | **Best move highlighting** | Ensure Stockfish evaluations run at Depth 18-20 |
| [ ] | **Missed tactics / "Miss" detection** | Compare centipawn evaluations of the played move vs. best move |
| [ ] | **Phase accuracy** | Split games by move numbers (Opening -> Midgame -> Endgame) and calculate individual accuracy |

## 🟣 Replicable with GenAI (LLM)

| Status | Feature | Implementation Approach |
| :---: | :--- | :--- |
| [x] | **Natural language move explanations** | Feed FEN + played move + best move to LLM and prompt for "why?" |
| [ ] | **Threat identification narration** | LLM explains tactical motifs based on engine evaluation deltas |
| [ ] | **Opening name identification** | LLM classification or ECO lookup table from PGN headers |
| [ ] | **Report card / coach summary** | LLM generates phase-based conversational feedback based on game JSON |
| [ ] | **Performance rating estimate** | LLM evaluates accuracy stats to estimate approximate Elo performance |

## 🟡 Partially Replicable

| Status | Feature | Implementation Approach & Limitation |
| :---: | :--- | :--- |
| [ ] | **Brilliant move detection** | Best move + unexpected/sacrifice + eval improves. (*Chess.com uses a proprietary algorithm, so this will be an approximation using piece-sacrifice heuristics*) |
| [ ] | **Opening Explorer stats** | Pull stats via public endpoints (e.g. Lichess public API) due to the lack of an enormous local player game database |
| [ ] | **Performance Rating (Elo)** | Provide a rough estimate through the LLM. (*Exact Chess.com formulas remain proprietary*) |

## 🔴 Not Replicable (Infrastructure limits)

| Status | Feature | Reason |
| :---: | :--- | :--- |
| [ ] | **Retry Mistakes as puzzles** | Needs dedicated puzzle UI workflows. (Possible, but requires significant ad-hoc frontend labor outside the scope of raw analysis). |
| [ ] | **Cloud analysis at high depth** | Depends on server-side Stockfish instances running at Depth 22+. (Limited directly by the local host computer's CPU speed during play). |

---

## 🔢 The Core Formula Implementation Reference

**Target Centipawn loss thresholds**:
```text
Brilliant  → Best move + unexpected/sacrifice + eval improves
Great      → 0–5 cp loss
Best       → 0–10 cp loss
Good       → 10–25 cp loss
Inaccuracy → 25–100 cp loss
Mistake    → 100–300 cp loss
Blunder    → 300+ cp loss
Miss       → Didn't find a winning tactic/mate when it existed
```

## 🏗️ Full Stack Architecture

```text
[ PGN input ]
      ↓
[ python-chess ] (parse moves, generate sequential FENs)
      ↓
[ Stockfish ] (evaluate every position, MultiPV=3, depth 18)
      ↓
[ Custom Classifier ] (calculate centipawn loss → Brilliant/Blunder/etc.)
      ↓
[ Meta Llama 3 70B ] (explain critical inaccuracies & brilliant moves in plain English)
      ↓
[ JSON Report Generator ] (accuracy %, phase grades, coach summary)
      ↓
[ Next.js Frontend ] (Display interactive eval bar and UI report card)
```
