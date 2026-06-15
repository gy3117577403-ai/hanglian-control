import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function exists(path) {
  return existsSync(join(root, path));
}

function read(path) {
  return exists(path) ? readFileSync(join(root, path), 'utf8') : '';
}

function add(label, ok, message, level = 'error') {
  if (ok) return;
  const line = `${label}: ${message}`;
  if (level === 'warning') warnings.push(line);
  else errors.push(line);
}

const requiredFiles = [
  'apps/api/src/settings/settings.module.ts',
  'apps/api/src/settings/settings.controller.ts',
  'apps/api/src/settings/settings.service.ts',
  'apps/api/src/settings/mock/settings-seed.ts',
  'apps/tablet/src/components/settings/WarmSettingsCenterDialog.vue',
  'apps/tablet/src/components/settings/WarmAnnouncementBanner.vue',
  'apps/tablet/src/components/settings/WarmSystemFeedbackDialog.vue',
  'apps/tablet/src/components/settings/WarmPilotCheckDialog.vue',
  'apps/tablet/src/stores/settings-store.ts',
  'docs/v3.1-system-settings-field-pilot.md',
  'docs/field-pilot-guide.md',
];

for (const file of requiredFiles) add(file, exists(file), 'missing');

const apiText = read('apps/tablet/src/services/api.ts');
for (const method of [
  'getSettingsSummary',
  'getSystemSettings',
  'updateSystemSettings',
  'getDictionaries',
  'updateDictionary',
  'getStationProfiles',
  'createStationProfile',
  'updateStationProfile',
  'getDisplaySettings',
  'updateDisplaySettings',
  'getAnnouncements',
  'createSystemFeedback',
  'runPilotCheck',
  'getSettingsHistory',
]) {
  add(`api ${method}`, apiText.includes(method), 'settings API method missing');
}

const gitignore = read('.gitignore');
for (const file of [
  'system-settings.json',
  'dictionary-settings.json',
  'station-profiles.json',
  'display-settings.json',
  'announcement-records.json',
  'system-feedback-records.json',
  'pilot-check-records.json',
  'settings-records.json',
]) {
  add(`gitignore ${file}`, gitignore.includes(`apps/api/storage/metadata/${file}`), 'metadata file not ignored');
}

const readme = read('README.md');
add('README V3.1', readme.includes('settings-flow:check') && readme.includes('系统配置中心'), 'README missing V3.1 settings notes');

console.log('V3.1 settings flow check');
console.log('This script is local-only: no database connection, no migration, no db push, no seed, no writes to database.');
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors: ${errors.length}`);
if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
if (errors.length) {
  console.log('\nErrors:');
  for (const error of errors) console.log(`- ${error}`);
  process.exit(1);
}
console.log('V3.1 settings flow check passed.');
