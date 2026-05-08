# Market Intelligence

## Trend Radar

The Trend Radar engine accepts a topic, region, language, and source, then returns a structured trend record:

- topic, region, language, audience segment
- rising reason
- search intent (informational, commercial, transactional, navigational)
- urgency, monetization, competition, evergreen, advertiser-safety scores
- composite trend score
- suggested angles, formats, publish timing

Every score uses a transparent formula. There is no scraping. Trend sources are creator-supplied, official APIs, manual CSVs, or curated notes.

## Demographic engine

Maps a topic + niche + region + monetization goal to:

- best audience and secondary audience
- age bands, region, language
- income intent, education level, consumer intent
- platform behavior, short-vs-long fit, US fit, international fit
- pain points, curiosity triggers, objections
- preferred tone, video length, thumbnail style
- monetization fit (display, affiliate, sponsor, product)
- audience fit score

## Niche scorer

```
score = 100
  - high_competition_penalty
  - weak_monetization_penalty
  - low_audience_urgency_penalty
  - low_retention_potential_penalty
  - low_advertiser_safety_penalty
  + evergreen_bonus
  + high_intent_bonus
  + affiliate_fit_bonus
  + series_potential_bonus
  + international_scalability_bonus
```

Score labels: 95-100 Exceptional, 85-94 Strong, 70-84 Promising, 50-69 Risky, below 50 Avoid.

## Opportunity score

Combines trend score, niche score, and audience fit into a single 0-100 score with a verdict (`green_light`, `cautious`, `avoid`) and a written rationale.
