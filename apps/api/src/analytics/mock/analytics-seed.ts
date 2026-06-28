import type { DemoAnalyticsSnapshot } from '../analytics.types';

const today = new Date();

function dateOffset(days: number) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const demoAnalyticsSnapshotSeed: DemoAnalyticsSnapshot = {
  generatedAt: new Date().toISOString(),
  source: 'demo-analytics-snapshot',
  notes: [
    'V2.6 demo analytics fallback only.',
    'No Sealos, WeCom disk, real voice, migrate, db push, seed, or database write is used.',
  ],
  trends: [-6, -5, -4, -3, -2, -1, 0].map((offset, index) => ({
    date: dateOffset(offset),
    completionRate: 58 + index * 5,
    defectRate: Math.max(0.2, 1.4 - index * 0.12),
    exceptionCount: index % 3,
    pendingReviewDocuments: Math.max(1, 8 - index),
    missingFiles: Math.max(0, 5 - Math.floor(index / 2)),
    pendingKnowledge: Math.max(1, 7 - index),
  })),
};
