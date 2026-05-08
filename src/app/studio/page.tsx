import AppShell from '@/components/AppShell';
import StoryboardPanel from '@/components/StoryboardPanel';
import VideoTimeline from '@/components/VideoTimeline';
import AssetPlanPanel from '@/components/AssetPlanPanel';
import ThumbnailBriefCard from '@/components/ThumbnailBriefCard';
import MetadataOptimizer from '@/components/MetadataOptimizer';

export default function StudioPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Studio</h1>
      <p className="text-sm text-ink-300">Storyboard, timeline plan, asset plan, captions, thumbnail brief, and metadata package for one project.</p>
      <StoryboardPanel />
      <VideoTimeline />
      <AssetPlanPanel />
      <ThumbnailBriefCard />
      <MetadataOptimizer />
    </AppShell>
  );
}
