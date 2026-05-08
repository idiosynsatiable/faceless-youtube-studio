// Prompt templates for the AI provider. The engines do NOT depend on these
// to function - they are used only when an AI provider is configured.

export const prompts = {
  hook: (title: string, audience: string) =>
    `Write a 5-second factual hook for a faceless YouTube video titled "${title}" aimed at ${audience}. Avoid clickbait, false claims, fake authority, or fabricated urgency.`,
  script: (title: string, audience: string, tone: string, durationMinutes: number) =>
    `Outline a voiceover-ready faceless YouTube script for "${title}" aimed at ${audience}, tone "${tone}", target length ${durationMinutes} minutes. Mark unverified statistics. Insert disclaimer placement notes for financial, medical, legal, AI, and affiliate content where relevant.`,
  storyboard: (title: string, scenes: number) =>
    `Convert the script for "${title}" into ${scenes} faceless scenes. For each scene return timestamp range, narration, visual concept, asset type, motion direction, caption, sound design, transition, retention purpose, and asset license requirement.`,
  metadata: (title: string, niche: string, audience: string) =>
    `Generate YouTube metadata for "${title}" in the ${niche} niche for ${audience}. Output title options, description, chapters, tags, hashtags, pinned comment, community post, end-screen CTA, playlist suggestion, category, language, region note, disclosure block, disclaimer block. No clickbait. Truthful packaging only.`
};
