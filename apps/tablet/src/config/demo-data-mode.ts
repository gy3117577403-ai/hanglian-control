export type DemoDataMode = 'empty' | 'minimal' | 'demo'

const allowedModes: DemoDataMode[] = ['empty', 'minimal', 'demo']

export const DEMO_DATA_MODE = (() => {
  const raw = String(import.meta.env.VITE_DEMO_DATA_MODE ?? 'empty').trim().toLowerCase()
  return allowedModes.includes(raw as DemoDataMode) ? raw as DemoDataMode : 'empty'
})()

export function shouldUseFrontendDemoData() {
  return DEMO_DATA_MODE === 'demo'
}
