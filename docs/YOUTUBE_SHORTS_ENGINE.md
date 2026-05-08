# YouTube Shorts engine

The Shorts engine treats short-form as a first-class production module that lives alongside long-form video. Inputs come from trends, demographics, long-form scripts, or comment threads — not from scraping or impersonation.

## Generation

`src/lib/shorts-engine.ts` produces `ShortsConcept` records that include:

- shortTitle (truthful packaging, clickbait phrases stripped)
- hook (matched to format)
- script (beats with timestamp ranges and visuals)
- visualPlan (9:16 scenes, motion direction, license-aware asset types)
- captionPlan (burned-in lines, emphasis words, accessibility note)
- hashtags (max 5, niche-specific)
- description (3 lines, FTC-aligned)
- pinnedComment (long-form anchor + disclosures)
- targetAudience
- retentionStrategy
- longFormConnection
- cta
- disclaimers (from the disclaimer engine)
- riskFlags
- estimatedDurationSeconds (15, 30, 45, or 60)
- uploadPriorityScore

## Formats

15s quick hook, 30s mini explainer, 45s story arc, 60s high-retention breakdown, list-style, myth vs fact, three-things-you-missed, before-you-try-this, market insight, history timeline, product comparison, finance-disclaimer-safe, tutorial micro-step, long-form teaser, comment response.

## Long-form to Shorts extraction

`src/lib/shorts-cutter.ts` segments a script (or accepts user-supplied transcript segments) and ranks segments by reason: myth_vs_fact, surprising_fact, comparison_moment, before_after, list_point, transformation_moment, safe_controversial_angle, strong_claim, emotional_peak, quote_worthy, high_curiosity. Each clip carries an estimated time range, hook, script, caption, and expected retention score.

## Calendar

`src/lib/shorts-calendar.ts` returns a quality-first cadence based on channel stage, production capacity, audience fatigue, and long-form schedule. It fans daily slots into long-form-support and standalone clips, rotates topic clusters, and explicitly refuses to recommend duplicates or spam.

## Funnel

`src/lib/shorts-funnel.ts` connects every Short to a long-form anchor with pinned comment, description CTA, playlist recommendation, end-screen strategy, monetization path, and FTC-aligned affiliate disclosure when relevant.

## Analytics feedback

`src/lib/shorts-analytics.ts` reads only the user-supplied snapshot. It computes view ratio, swipe-away rate, long-form click rate, subscriber rate, and engagement rate, and returns concrete next moves: make more like this, convert to long-form, pause topic cluster, revise hook/caption, improve pacing, improve visual motion, improve CTA, recommended next Shorts.
