export type DemoDataMode = 'empty' | 'minimal' | 'demo';

const allowedModes = new Set<DemoDataMode>(['empty', 'minimal', 'demo']);

export function getDemoDataMode(): DemoDataMode {
  const raw = String(process.env.DEMO_DATA_MODE ?? 'empty').trim().toLowerCase();
  return allowedModes.has(raw as DemoDataMode) ? raw as DemoDataMode : 'empty';
}

export function shouldLoadDemoBusinessData() {
  return getDemoDataMode() === 'demo';
}

export function shouldLoadMinimalSystemData() {
  const mode = getDemoDataMode();
  return mode === 'minimal' || mode === 'demo';
}
