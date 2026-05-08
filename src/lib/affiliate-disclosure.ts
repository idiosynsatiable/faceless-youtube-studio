// Standard affiliate disclosure block builder.

export interface AffiliateDisclosureInput {
  channelName: string;
  hasAffiliateLinks: boolean;
  hasSponsorship: boolean;
  sponsorName?: string;
}

export function buildAffiliateDisclosure(input: AffiliateDisclosureInput): string {
  const lines: string[] = [];
  if (input.hasAffiliateLinks) {
    lines.push(
      `${input.channelName} may earn a commission at no extra cost to you when you use the affiliate links in this description. We only recommend tools we have used and would still recommend without a commission.`
    );
  }
  if (input.hasSponsorship) {
    lines.push(
      `This video includes a paid sponsorship${input.sponsorName ? ` from ${input.sponsorName}` : ''}. The sponsor segment is clearly marked in the video.`
    );
  }
  if (!input.hasAffiliateLinks && !input.hasSponsorship) {
    lines.push('This video does not contain affiliate links or sponsorship.');
  }
  lines.push('All disclosures follow FTC guidance on endorsements and testimonials.');
  return lines.join('\n');
}
