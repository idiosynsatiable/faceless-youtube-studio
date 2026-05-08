# Video production workflow

The production pipeline transforms one approved idea into a complete export package.

## Steps

1. Idea is approved from the idea queue.
2. Script engine produces a structured script with hook, intro, body sections, transitions, retention beats, visual directions, B-roll notes, captions emphasis, disclaimer placements, CTA, outro, sources-needed, and fact-check checklist.
3. Storyboard engine converts the script into scene-by-scene timestamps, narration, visual concepts, asset types, motion direction, captions, sound design, transitions, retention purpose, and asset license requirements.
4. Voiceover planner returns delivery, lines, and recording notes.
5. Video assembler returns the timeline plan, pacing, transitions, B-roll placement, captions, zooms, cuts, music notes, sound-effect notes, color style, export profiles (long-form 16:9, Shorts 9:16, square 1:1, thumbnail still), short clips for repurposing, and an FFmpeg pipeline plan.
6. Caption engine returns SRT-ready text, short captions, emphasis words, lower-thirds, chapter titles, and accessibility notes.
7. Metadata engine returns title options, final title, short and long descriptions, chapters, tags, hashtags, pinned comment, community post, end-screen CTA, playlist recommendation, category recommendation, language, region targeting note, disclosure, and disclaimer.
8. Compliance engine confirms every disclaimer that must appear and identifies any high-severity issue.
9. Export engine assembles the Markdown and JSON deliverables.

## FFmpeg architecture

The FFmpeg pipeline is documented in `video-assembler.ts`. Routes never run shell commands. A worker process executes the documented pipeline against an allowlist of validated inputs.

## Asset licensing

Every storyboard scene carries an asset license requirement. Creator-owned, public-domain, or properly licensed stock are the only valid options. Generated illustrations require the AI-content disclosure when material to the video.
