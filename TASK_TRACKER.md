# TASK_TRACKER

## Today
- [ ] Ship stable eBay pricing quality pass on production branch
- [ ] Remove all "Kaizoku" references from user-facing site copy (eBay-only wording)
- [ ] Verify homepage + market card identity consistency
- [ ] Push tested changes and confirm deploy state
- [ ] Full website revamp + brand refresh (luxury pirate command deck aesthetic)
- [ ] Finalize revamp sweep including Home screen consistency pass
- [ ] Execute `REVAMP_ACCEPTANCE.md` checklist before final ship
- [ ] Add all One Piece cards for OP15, EB03, and verify completeness for OP11–OP14 + EB02
- [x] Run market history backfill job (seed 1W/1M/3M/6M/1Y chart ranges for high-traffic cards)
- [ ] Build reliable matchup-matrix backend source (replace seeded fallback; no GumGum dependency)
- [ ] Full data integrity sweep: every card visible across all pages with correct real backing data and consistency checks

## This Week
- [ ] Integrate Kaizoku matchup table as primary backend source for matchup matrix (real player-usable data)
- [ ] Add automated ID/name consistency checks for featured card lists
- [ ] Add market regression script (smoke checks)
- [x] Reduce multi-folder run confusion with explicit startup script (added canonical-path guard + start-devilfruittcg.sh)

## Backlog
- [ ] Improve source labeling per sale row (completed vs fallback)
- [ ] Extend confidence model with historical volatility

## Rule
Whenever user says “remember this” or assigns work, update this file immediately.

## Threading
- [x] Use this webchat thread as the primary execution thread for status syncs
