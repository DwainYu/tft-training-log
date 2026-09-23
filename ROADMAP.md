# ROADMAP

Direction of travel: **manual training log → structured game data → automatic capture →
analytics → agent coach → MCP**. Each phase must stay useful on its own; nothing here is a
prerequisite for the tool being worth using today.

## Phase 1 — Manual Training Log (MVP) ✅

- [x] Bootstrap: Vite 6 + React 19 + TypeScript + Tailwind v4 + Dexie + Recharts + Vitest
- [x] Domain model + IndexedDB storage (`matches` / `decisions` / `reviews` / `trainingGoals`)
- [x] Match CRUD with cascade cleanup of decisions and reviews
- [x] Quick Add — placement on `1–8`, one game logged in 1–2 minutes
- [x] Full match form (basic info / game state / composition, items, augments / training-window warning)
- [x] Match list & detail (search, filters, sorting, pagination)
- [x] Post-game review (opening / mid / late / conclusion, four required conclusion fields)
- [x] Decision log (round, type, situation, decision, reasoning, result, hindsight)
- [x] Statistics (overall, recent trend, mistake bars, per composition, per time slot)
- [x] Training goals (`active` / `completed` / `archived` + related mistake types)
- [x] Weekly review (rule-based summary behind a `ReviewSummaryProvider` seam)
- [x] Dashboard (core metrics, recent games, current goal, frequent mistakes)
- [x] JSON export / merge-import, CSV export, storage overview, wipe
- [x] Read-only agent tool facade (`src/services/agent-tools.ts`)
- [x] Responsive layout (desktop-first, tablet and mobile usable)
- [x] Fictional demo dataset + one-click load / remove (`data/examples/demo-matches.json`)
- [x] Repository hygiene: `.gitignore` for personal data, MIT license, English README with screenshots

## Phase 2 — S18 Static Data

- [ ] Units, traits, items and augments as structured data
- [ ] Replace free-text fields with pickers / autocomplete backed by that data

## Phase 3 — China Client (LCU) Adapter

- [ ] Read the player's own client through the LCU API
- [ ] Human confirmation before anything is written into the log

## Phase 4 — Automatic Match Ingestion

- [ ] Detect and record games inside the training window

## Phase 5 — Screenshot / Replay / Key Rounds

- [ ] Screenshot adapter
- [ ] Key-round captures with annotation

## Phase 6 — Agent Coach

- [ ] `LLMSummary` weekly review
- [ ] Personalised advice grounded in the player's own decision log (tool calling)

## Phase 7 — MCP

- [ ] Expose `agent-tools` as an MCP server

## Phase 8 — Personal TFT AI Coach

- [ ] Memory + retrieval over personal decision history
- [ ] Evaluation: does the training loop actually move the numbers?

## Explicitly out of scope

- Anything that reads game state for a live advantage (cheat-adjacent tooling).
- Server-side accounts, cloud sync and telemetry — the tool is local-first by design.
- Deployment targets (GitHub Pages / Vercel / Cloudflare Pages) until the tool is finished.
- Riot Match API dependence: the Chinese server does not expose one to this project, and the
  roadmap does not assume it.
