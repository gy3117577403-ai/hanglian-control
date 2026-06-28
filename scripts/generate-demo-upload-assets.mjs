import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join(process.cwd(), 'demo-upload-assets');
const demoNotice = 'DEMO ONLY - non-real customer material - generated for Hanglian local prototype testing.';

function escapePdfText(value) {
  return value.replace(/[()\\]/g, (match) => `\\${match}`);
}

async function writePdf(fileName, title, revision) {
  const lines = [
    demoNotice,
    title,
    `Revision: ${revision}`,
    'This file is synthetic. It is not a real drawing, SOP, production document, or customer file.',
    'Do not use for manufacturing release.',
  ];
  const text = lines.map((line, index) => `BT /F1 ${index === 0 ? 14 : 12} Tf 54 ${744 - index * 28} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(text, 'utf8')} >> stream\n${text}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  await writeFile(join(outputDir, fileName), pdf);
}

function demoSvg(title, subtitle, accent = '#c45f24') {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff8ea"/>
      <stop offset="1" stop-color="#efc47c"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#8a5a2b" stroke-width="1" opacity="0.24"/>
    </pattern>
  </defs>
  <rect width="1280" height="800" rx="28" fill="url(#paper)"/>
  <rect x="52" y="52" width="1176" height="696" rx="20" fill="url(#grid)" stroke="#9c6330" stroke-width="4"/>
  <rect x="92" y="92" width="1096" height="126" rx="16" fill="#fffaf0" stroke="${accent}" stroke-width="3"/>
  <text x="126" y="148" font-family="Microsoft YaHei, Arial, sans-serif" font-size="40" font-weight="800" fill="#342316">${title}</text>
  <text x="126" y="192" font-family="Microsoft YaHei, Arial, sans-serif" font-size="24" fill="#76512a">${subtitle}</text>
  <text x="126" y="690" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#8a4d20">${demoNotice}</text>
  <g transform="translate(150 300)" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity="0.82">
    <path d="M0 20 C160 150 330 -85 510 54 S810 174 990 18"/>
    <path d="M4 220 C200 70 350 320 548 190 S830 70 990 230"/>
    <path d="M50 128H940"/>
  </g>
  <g fill="${accent}">
    <circle cx="235" cy="320" r="22"/>
    <circle cx="520" cy="350" r="22"/>
    <circle cx="822" cy="312" r="22"/>
    <circle cx="370" cy="522" r="24"/>
    <circle cx="725" cy="510" r="24"/>
  </g>
</svg>`;
}

async function writePngOrSvgFallback(fileName, title, subtitle, accent) {
  const svg = demoSvg(title, subtitle, accent);
  try {
    const { default: sharp } = await import('sharp');
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(join(outputDir, fileName), png);
  } catch {
    const fallbackName = fileName.replace(/\.png$/i, '.svg');
    await writeFile(join(outputDir, fallbackName), svg);
  }
}

await mkdir(outputDir, { recursive: true });
await writePdf('demo-drawing-rev-a.pdf', 'Demo harness drawing placeholder', 'Rev.A');
await writePdf('demo-drawing-rev-b.pdf', 'Demo harness drawing placeholder', 'Rev.B');
await writePngOrSvgFallback('demo-sop-step-01.png', 'Demo SOP Step 01', 'Synthetic workstation instruction card', '#c45f24');
await writePngOrSvgFallback('demo-pinout-16p.png', 'Demo 16P Pinout', 'Synthetic connector pin map', '#229a66');
await writePngOrSvgFallback('demo-finished-detail.png', 'Demo Finished Detail', 'Synthetic finished product inspection image', '#7b5bb8');
await writeFile(join(outputDir, 'demo-unsupported.txt'), `${demoNotice}

This TXT file is intentionally unsupported for online preview boundary testing.
It is synthetic demo data and contains no real customer information.
`);

console.log(`Demo upload assets generated in ${outputDir}`);
