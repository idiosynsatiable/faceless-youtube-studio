// Compliance engine. Reads script and metadata, returns the disclaimer
// requirements, risk list, and remediation advice.

import type { ComplianceInput } from './validators';
import { runDisclaimerEngine, type DisclaimerEngineOutput, type DisclaimerKey } from './disclaimer-engine';

export interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  suggestedFix: string;
}

export interface ComplianceReport {
  topicFlags: string[];
  disclaimers: DisclaimerEngineOutput;
  triggeredKeys: DisclaimerKey[];
  issues: ComplianceIssue[];
  passed: boolean;
}

const FINANCIAL = ['money', 'invest', 'investment', 'stock', 'crypto', 'bitcoin', 'ethereum', 'tax', 'loan', 'income', 'side hustle', 'finance', 'business model', 'salary'];
const MEDICAL = ['medical', 'doctor', 'health', 'symptom', 'medicine', 'mental', 'nutrition', 'diet', 'fitness'];
const LEGAL = ['legal', 'law', 'attorney', 'contract', 'court'];
const AI = ['ai voice', 'ai narration', 'generated voice', 'synthetic voice', 'text to speech', 'generated image'];
const OPINION = ['my opinion', 'i think', 'i believe', 'in my view'];

function scan(haystack: string, list: string[]): boolean {
  return list.some((k) => haystack.includes(k));
}

function detectTopicFlags(scriptText: string, metadata: ComplianceInput['metadata']): string[] {
  const haystack = (`${scriptText} ${metadata.title} ${metadata.description} ${metadata.tags.join(' ')}`).toLowerCase();
  const flags: string[] = [];
  if (scan(haystack, FINANCIAL)) flags.push('financial');
  if (scan(haystack, MEDICAL)) flags.push('medical');
  if (scan(haystack, LEGAL)) flags.push('legal');
  if (scan(haystack, AI)) flags.push('ai_content');
  if (scan(haystack, OPINION)) flags.push('opinion');
  return flags;
}

function detectIssues(scriptText: string, metadata: ComplianceInput['metadata']): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const text = `${scriptText} ${metadata.title} ${metadata.description}`.toLowerCase();
  if (/\bguaranteed\b|\boverlay night\b|\bovernight riches\b|\bfree money\b/.test(text)) {
    issues.push({
      severity: 'high',
      category: 'misleading_claim',
      message: 'Script or metadata contains a guarantee or overnight-riches phrasing.',
      suggestedFix: 'Remove the guarantee. Replace with conditional language and add the no-guaranteed-results disclaimer.'
    });
  }
  if (/\bbuy subscribers\b|\bfake views\b|\bfake likes\b|\bbot subscribers\b|\bbot views\b|\bengagement pod\b/.test(text)) {
    issues.push({
      severity: 'high',
      category: 'fake_engagement',
      message: 'Script or metadata references fake engagement tactics.',
      suggestedFix: 'Remove all references to fake engagement, bot traffic, or engagement pods.'
    });
  }
  if (metadata.title.length > 100) {
    issues.push({
      severity: 'medium',
      category: 'metadata',
      message: 'Title exceeds 100 characters.',
      suggestedFix: 'Shorten to fit within 70 characters for ideal display.'
    });
  }
  if (metadata.tags.length > 25) {
    issues.push({
      severity: 'low',
      category: 'metadata',
      message: 'More than 25 tags. YouTube ignores excessive tags.',
      suggestedFix: 'Trim to 15-25 high-relevance tags.'
    });
  }
  return issues;
}

export function runCompliance(input: ComplianceInput): ComplianceReport {
  const flags = detectTopicFlags(input.scriptText, input.metadata);
  const disc = runDisclaimerEngine({ flags: input.flags, topicFlags: flags });
  const issues = detectIssues(input.scriptText, input.metadata);
  const triggeredKeys = disc.required.map((r) => r.key);
  return {
    topicFlags: flags,
    disclaimers: disc,
    triggeredKeys,
    issues,
    passed: issues.every((i) => i.severity !== 'high')
  };
}
