# WEBSITE REVAMP ACCEPTANCE CHECKLIST

## Product Bar
- [ ] Visual identity feels consistent across Home, Market, Matchups, Meta, Collection, Decks, Deckbuilder
- [ ] Clear “command deck” hierarchy (headline → key intel → action)
- [ ] Mobile one-thumb usability on all major pages

## UX & IA
- [ ] No duplicate nav/footer shells or conflicting layouts
- [ ] Primary CTA is obvious on every page
- [ ] Empty states are polished and actionable

## Data Clarity
- [ ] Matchups: key insight visible above fold
- [ ] Meta: top deck + trend + source confidence clearly shown
- [ ] Market/Collection: pricing freshness and confidence readable

## Quality Gates
- [ ] `npm run build` passes
- [ ] Browser verification pass on key routes (`/`, `/market`, `/matchups`, `/meta`, `/collection`, `/decks`, `/deckbuilder`)
- [ ] No obvious visual regressions (desktop + mobile)

## Ship Gate
- [ ] Final summary sent with tested routes + remaining known issues (if any)
