import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'apps', 'tablet', 'public', 'pwa');
mkdirSync(outDir, { recursive: true });

function appIconSvg(size = 512, maskable = false) {
  const padding = maskable ? 72 : 38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" role="img" aria-label="线束车间资料管控演示图标">
  <defs>
    <linearGradient id="bg" x1="80" y1="24" x2="430" y2="480" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff7ed"/>
      <stop offset="0.55" stop-color="#f0b35f"/>
      <stop offset="1" stop-color="#c25a1d"/>
    </linearGradient>
    <linearGradient id="panel" x1="110" y1="92" x2="390" y2="395" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fffdf7"/>
      <stop offset="1" stop-color="#f6d7a1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 92}" fill="url(#bg)"/>
  <rect x="${padding}" y="${padding + 14}" width="${512 - padding * 2}" height="${512 - padding * 2 - 28}" rx="42" fill="url(#panel)" stroke="#7c431b" stroke-width="12"/>
  <rect x="142" y="140" width="228" height="52" rx="18" fill="#d97706"/>
  <rect x="142" y="220" width="130" height="30" rx="15" fill="#8a5a2a"/>
  <rect x="142" y="272" width="200" height="30" rx="15" fill="#b45f22"/>
  <path d="M124 374 C174 320 218 426 266 374 S354 328 404 374" fill="none" stroke="#2f6f54" stroke-width="22" stroke-linecap="round"/>
  <circle cx="124" cy="374" r="20" fill="#2f6f54"/>
  <circle cx="266" cy="374" r="20" fill="#2f6f54"/>
  <circle cx="404" cy="374" r="20" fill="#2f6f54"/>
</svg>`;
}

function shortcutSvg(kind) {
  const isUpload = kind === 'upload';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${isUpload ? '上传资料' : '生产计划'}">
  <rect width="96" height="96" rx="18" fill="#fff7ed"/>
  <rect x="10" y="12" width="76" height="72" rx="14" fill="#f4d6a6" stroke="#9a541f" stroke-width="3"/>
  ${isUpload
    ? '<path d="M48 66V30M34 44l14-14 14 14" fill="none" stroke="#c45f24" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="28" y="68" width="40" height="6" rx="3" fill="#2f6f54"/>'
    : '<rect x="24" y="28" width="48" height="8" rx="4" fill="#c45f24"/><rect x="24" y="44" width="38" height="7" rx="3.5" fill="#7c431b"/><rect x="24" y="59" width="30" height="7" rx="3.5" fill="#2f6f54"/>'}
</svg>`;
}

writeFileSync(join(outDir, 'icon.svg'), appIconSvg(512), 'utf8');
writeFileSync(join(outDir, 'maskable-icon.svg'), appIconSvg(512, true), 'utf8');
writeFileSync(join(outDir, 'shortcut-plan.svg'), shortcutSvg('plan'), 'utf8');
writeFileSync(join(outDir, 'shortcut-upload.svg'), shortcutSvg('upload'), 'utf8');

try {
  const sharp = (await import('sharp')).default;
  const iconSvg = Buffer.from(appIconSvg(512));
  await sharp(iconSvg).resize(192, 192).png().toFile(join(outDir, 'icon-192.png'));
  await sharp(iconSvg).resize(512, 512).png().toFile(join(outDir, 'icon-512.png'));
  console.log(`PWA SVG and PNG assets generated in ${outDir}`);
} catch {
  console.log(`PWA SVG assets generated in ${outDir}`);
  console.log('PNG generation skipped because sharp is not available in this workspace runtime.');
}
