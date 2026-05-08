// Plans B-roll and media assets given a storyboard.

import type { Storyboard } from './storyboard-engine';

export interface AssetPlanItem {
  sceneIndex: number;
  assetType: string;
  searchQuery: string;
  licenseRequirement: string;
  fallback: string;
}

export interface AssetPlan {
  total: number;
  items: AssetPlanItem[];
  licenseChecklist: string[];
  notes: string[];
}

export function planAssets(storyboard: Storyboard, niche: string): AssetPlan {
  const items: AssetPlanItem[] = storyboard.scenes.map((scene) => ({
    sceneIndex: scene.index,
    assetType: scene.assetType,
    searchQuery: `${niche} ${scene.assetType} ${scene.caption}`.trim().slice(0, 80),
    licenseRequirement: scene.assetLicenseRequirement,
    fallback: scene.assetType === 'stock footage' ? 'animated text or chart' : 'creator-owned footage or generated illustration'
  }));
  return {
    total: items.length,
    items,
    licenseChecklist: storyboard.licenseChecklist,
    notes: [
      'Do not download copyrighted YouTube clips without written permission',
      'Do not use logos or trademarks beyond editorial fair-use review',
      'Document license source for every asset'
    ]
  };
}
