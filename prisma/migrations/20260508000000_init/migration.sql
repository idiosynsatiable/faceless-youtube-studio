-- Faceless YouTube Studio — initial schema
--
-- This migration was crafted to match `prisma/schema.prisma` exactly so that
-- operators can apply it with `npx prisma migrate deploy` against a fresh
-- PostgreSQL database without first running `prisma migrate dev`.
--
-- All foreign keys use `ON UPDATE CASCADE` (Prisma's default). `ON DELETE`
-- behaviour matches the schema: required parents cascade, optional parents
-- set the child column to NULL.

-- =========================================================================
-- Tables
-- =========================================================================

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeChannelId" TEXT,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "regionFocus" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "oauthConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendTopic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "trendScore" INTEGER NOT NULL,
    "monetizationScore" INTEGER NOT NULL,
    "competitionScore" INTEGER NOT NULL,
    "advertiserSafetyScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoIdea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "monetizationAngle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "scriptJson" JSONB NOT NULL,
    "storyboardJson" JSONB NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "complianceJson" JSONB NOT NULL,
    "monetizationJson" JSONB NOT NULL,
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "uploadStatus" TEXT NOT NULL DEFAULT 'draft_ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoProjectId" TEXT NOT NULL,
    "youtubeVideoId" TEXT,
    "privacyStatus" TEXT NOT NULL DEFAULT 'private',
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft_ready',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "videoProjectId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clickThroughRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageViewDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "subscribersGained" INTEGER NOT NULL DEFAULT 0,
    "estimatedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoProjectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceIssue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoProjectId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortsProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "videoProjectId" TEXT,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "scriptJson" JSONB NOT NULL,
    "visualPlanJson" JSONB NOT NULL,
    "metadataJson" JSONB NOT NULL,
    "retentionScore" INTEGER NOT NULL DEFAULT 0,
    "uploadPriorityScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft_ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortsProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortsCalendarItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "shortsProjectId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "topicCluster" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortsCalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortsAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "shortsProjectId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "averageViewDurationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewedVsSwipedRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "subscribersGained" INTEGER NOT NULL DEFAULT 0,
    "longFormClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortsAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortsFunnel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shortsProjectId" TEXT NOT NULL,
    "relatedLongFormProjectId" TEXT,
    "ctaType" TEXT NOT NULL,
    "pinnedComment" TEXT NOT NULL,
    "descriptionCta" TEXT NOT NULL,
    "playlistTarget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortsFunnel_pkey" PRIMARY KEY ("id")
);

-- =========================================================================
-- Indexes
-- =========================================================================

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Channel_userId_idx" ON "Channel"("userId");

-- CreateIndex
CREATE INDEX "TrendTopic_userId_idx" ON "TrendTopic"("userId");

-- CreateIndex
CREATE INDEX "VideoIdea_userId_idx" ON "VideoIdea"("userId");
CREATE INDEX "VideoIdea_channelId_idx" ON "VideoIdea"("channelId");
CREATE INDEX "VideoIdea_topicId_idx" ON "VideoIdea"("topicId");

-- CreateIndex
CREATE INDEX "VideoProject_userId_idx" ON "VideoProject"("userId");
CREATE INDEX "VideoProject_channelId_idx" ON "VideoProject"("channelId");
CREATE INDEX "VideoProject_ideaId_idx" ON "VideoProject"("ideaId");

-- CreateIndex
CREATE INDEX "UploadJob_userId_idx" ON "UploadJob"("userId");
CREATE INDEX "UploadJob_videoProjectId_idx" ON "UploadJob"("videoProjectId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_idx" ON "AnalyticsSnapshot"("userId");
CREATE INDEX "AnalyticsSnapshot_channelId_idx" ON "AnalyticsSnapshot"("channelId");
CREATE INDEX "AnalyticsSnapshot_videoProjectId_idx" ON "AnalyticsSnapshot"("videoProjectId");

-- CreateIndex
CREATE INDEX "ExportFile_userId_idx" ON "ExportFile"("userId");
CREATE INDEX "ExportFile_videoProjectId_idx" ON "ExportFile"("videoProjectId");

-- CreateIndex
CREATE INDEX "ComplianceIssue_userId_idx" ON "ComplianceIssue"("userId");
CREATE INDEX "ComplianceIssue_videoProjectId_idx" ON "ComplianceIssue"("videoProjectId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_idx" ON "UsageEvent"("userId");
CREATE INDEX "UsageEvent_eventType_idx" ON "UsageEvent"("eventType");

-- CreateIndex
CREATE INDEX "ShortsProject_userId_idx" ON "ShortsProject"("userId");
CREATE INDEX "ShortsProject_channelId_idx" ON "ShortsProject"("channelId");
CREATE INDEX "ShortsProject_videoProjectId_idx" ON "ShortsProject"("videoProjectId");

-- CreateIndex
CREATE INDEX "ShortsCalendarItem_userId_idx" ON "ShortsCalendarItem"("userId");
CREATE INDEX "ShortsCalendarItem_channelId_idx" ON "ShortsCalendarItem"("channelId");
CREATE INDEX "ShortsCalendarItem_shortsProjectId_idx" ON "ShortsCalendarItem"("shortsProjectId");

-- CreateIndex
CREATE INDEX "ShortsAnalyticsSnapshot_userId_idx" ON "ShortsAnalyticsSnapshot"("userId");
CREATE INDEX "ShortsAnalyticsSnapshot_channelId_idx" ON "ShortsAnalyticsSnapshot"("channelId");
CREATE INDEX "ShortsAnalyticsSnapshot_shortsProjectId_idx" ON "ShortsAnalyticsSnapshot"("shortsProjectId");

-- CreateIndex
CREATE INDEX "ShortsFunnel_userId_idx" ON "ShortsFunnel"("userId");
CREATE INDEX "ShortsFunnel_shortsProjectId_idx" ON "ShortsFunnel"("shortsProjectId");
CREATE INDEX "ShortsFunnel_relatedLongFormProjectId_idx" ON "ShortsFunnel"("relatedLongFormProjectId");

-- =========================================================================
-- Foreign keys
-- =========================================================================

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendTopic" ADD CONSTRAINT "TrendTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoIdea" ADD CONSTRAINT "VideoIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoIdea" ADD CONSTRAINT "VideoIdea_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoIdea" ADD CONSTRAINT "VideoIdea_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TrendTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "VideoIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadJob" ADD CONSTRAINT "UploadJob_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportFile" ADD CONSTRAINT "ExportFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportFile" ADD CONSTRAINT "ExportFile_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceIssue" ADD CONSTRAINT "ComplianceIssue_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortsProject" ADD CONSTRAINT "ShortsProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortsProject" ADD CONSTRAINT "ShortsProject_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortsProject" ADD CONSTRAINT "ShortsProject_videoProjectId_fkey" FOREIGN KEY ("videoProjectId") REFERENCES "VideoProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortsCalendarItem" ADD CONSTRAINT "ShortsCalendarItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortsCalendarItem" ADD CONSTRAINT "ShortsCalendarItem_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortsCalendarItem" ADD CONSTRAINT "ShortsCalendarItem_shortsProjectId_fkey" FOREIGN KEY ("shortsProjectId") REFERENCES "ShortsProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortsAnalyticsSnapshot" ADD CONSTRAINT "ShortsAnalyticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortsAnalyticsSnapshot" ADD CONSTRAINT "ShortsAnalyticsSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShortsAnalyticsSnapshot" ADD CONSTRAINT "ShortsAnalyticsSnapshot_shortsProjectId_fkey" FOREIGN KEY ("shortsProjectId") REFERENCES "ShortsProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortsFunnel" ADD CONSTRAINT "ShortsFunnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortsFunnel" ADD CONSTRAINT "ShortsFunnel_shortsProjectId_fkey" FOREIGN KEY ("shortsProjectId") REFERENCES "ShortsProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortsFunnel" ADD CONSTRAINT "ShortsFunnel_relatedLongFormProjectId_fkey" FOREIGN KEY ("relatedLongFormProjectId") REFERENCES "VideoProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
