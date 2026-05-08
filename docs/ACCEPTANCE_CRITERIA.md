# Acceptance criteria

The app is complete only when every item below is satisfied.

- Landing page renders
- Dashboard renders
- Trend Radar page works
- Niche scorer works
- Demographic engine works
- Idea engine works
- Script engine works
- Storyboard engine works
- Video plan engine works
- Metadata engine works
- Compliance engine works
- Disclaimer engine works
- Monetization engine works
- Subscriber growth strategy works without fake engagement
- Export package works (Markdown + JSON)
- YouTube OAuth routes exist
- Upload preparation works
- Upload publish route requires explicit user authorization
- Analytics feedback architecture exists
- Stripe checkout route exists
- Stripe webhook route verifies signatures
- Billing disabled mode is safe
- No fake uploads exist
- No fake analytics exist
- No fake subscribers or likes exist
- No copyrighted media is bundled without license
- Docs are complete
- Tests exist
- Build passes
- No hardcoded secrets exist
- No TODO comments exist
- No placeholder code exists

## Shorts upgrade

- /shorts page renders
- /shorts/from-longform page renders
- /shorts/calendar page renders
- /shorts/analytics page renders
- POST /api/shorts/generate works
- POST /api/shorts/from-longform works
- POST /api/shorts/calendar works
- POST /api/shorts/funnel works
- POST /api/shorts/metadata works
- POST /api/shorts/analytics works
- 15s, 30s, and 60s variants are produced for every Short
- Shorts metadata, calendar, and funnel are returned in structured JSON
- Shorts export package includes Markdown and JSON
- Long-form-plus-Shorts combined bundle works
- Shorts cadence engine refuses spam-level recommendations
- Shorts compliance engine triggers needed disclaimers
- Shorts monetization paths are returned for every Short
- Shorts analytics engine recommends concrete next moves and never suggests bots, paid pods, or fake engagement
