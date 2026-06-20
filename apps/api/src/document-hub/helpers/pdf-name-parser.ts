export interface ParsedPdfProductName {
  originalName: string;
  baseName: string;
  productModel: string;
  normalizedProductModel: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'parsed' | 'needs_confirmation' | 'error';
  reason?: string;
  removedVersion?: string;
}

const DATE_SEGMENT_PATTERN =
  /(^|[\s_-]+)(20\d{2}(?:[-_]?)(?:0[1-9]|1[0-2])(?:[-_]?)(?:0[1-9]|[12]\d|3[01]))(?=$|[\s_-]+)/g;
const VERSION_SEGMENT_PATTERN =
  /(^|[\s_-]+)((?:rev\.?\s*[-.]?\s*[a-z0-9]+)|(?:version\s+[0-9]+(?:\.[0-9]+)?)|(?:ver\.?\s*[0-9]+(?:\.[0-9]+)?)|(?:v\s*[0-9]+(?:\.[0-9]+)?))(?=$|[\s_-]+)/gi;
const NOISE_SEGMENT_PATTERN =
  /(^|[\s_-]+)(?:\u539f\u56fe|\u56fe\u7eb8|\u626b\u63cf\u4ef6|drawing|blueprint|scan)(?=$|[\s_-]+)/gi;
const PRODUCT_CANDIDATE_PATTERN = /[A-Za-z0-9][A-Za-z0-9_-]*[A-Za-z0-9]/g;

function getFileBaseName(value: string) {
  return value.split(/[\\/]/).pop() ?? '';
}

function normalizeCommonCharacters(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-')
    .replace(/[\uff3f]/g, '_')
    .replace(/[\uff0e\u3002\ufe52]/g, '.')
    .replace(/[\uff08\uff09\u3010\u3011\u300c\u300d\u300e\u300f\u300a\u300b()[\]{}]/g, ' ')
    .replace(/[;,\u3001\uff0c\uff1b\uff1a:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removePdfExtension(value: string) {
  return value.replace(/\.pdf$/i, '');
}

function replaceSegment(value: string, pattern: RegExp, onMatch?: (match: string) => void) {
  return value.replace(pattern, (match) => {
    onMatch?.(match.trim().replace(/^[\s_-]+/, ''));
    return ' ';
  });
}

function normalizeVersion(value: string) {
  const version = normalizeCommonCharacters(value).replace(/\s+/g, ' ').trim();
  const revMatch = version.match(/^rev\.?\s*[-.]?\s*([a-z0-9]+)$/i);
  if (revMatch) {
    return `Rev.${revMatch[1].toUpperCase()}`;
  }

  const versionMatch = version.match(/^version\s+([0-9]+(?:\.[0-9]+)?)$/i);
  if (versionMatch) {
    return `Version ${versionMatch[1]}`;
  }

  const verMatch = version.match(/^ver\.?\s*([0-9]+(?:\.[0-9]+)?)$/i);
  if (verMatch) {
    return `Ver${verMatch[1]}`;
  }

  const vMatch = version.match(/^v\s*([0-9]+(?:\.[0-9]+)?)$/i);
  if (vMatch) {
    return `V${vMatch[1]}`;
  }

  return version;
}

function stripKnownNonModelSegments(value: string) {
  let removedVersion: string | undefined;
  let normalized = replaceSegment(value, VERSION_SEGMENT_PATTERN, (match) => {
    removedVersion ??= normalizeVersion(match);
  });

  normalized = replaceSegment(normalized, DATE_SEGMENT_PATTERN);
  normalized = replaceSegment(normalized, NOISE_SEGMENT_PATTERN);

  return {
    value: normalized.replace(/\s+/g, ' ').trim(),
    removedVersion,
  };
}

function isDateOnly(value: string) {
  return /^(?:20\d{6}|20\d{2}[-_](?:0[1-9]|1[0-2])[-_](?:0[1-9]|[12]\d|3[01]))$/.test(value);
}

function isVersionOnly(value: string) {
  return /^(?:rev\.?[-_]?[a-z0-9]+|ver(?:sion)?[-_]?[0-9]+(?:\.[0-9]+)?|v[0-9]+(?:\.[0-9]+)?)$/i.test(value);
}

export function normalizeProductModel(value: string) {
  return normalizeCommonCharacters(value)
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/[_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function isValidProductModel(value: string) {
  return (
    value.length >= 4 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    !isDateOnly(value) &&
    !isVersionOnly(value)
  );
}

function extractProductCandidates(value: string) {
  const matches = value.match(PRODUCT_CANDIDATE_PATTERN) ?? [];
  const candidates = matches
    .map(normalizeProductModel)
    .filter(Boolean)
    .filter(isValidProductModel);

  return [...new Set(candidates)];
}

export function parseProductModelFromPdfName(fileName: string): ParsedPdfProductName {
  const originalName = fileName || '';
  const normalizedBaseName = normalizeCommonCharacters(removePdfExtension(getFileBaseName(originalName)));
  const { value: baseName, removedVersion } = stripKnownNonModelSegments(normalizedBaseName);
  const candidates = extractProductCandidates(baseName);
  const productModel = candidates[0] ?? '';
  const ambiguous = candidates.length > 1;
  const status = productModel && !ambiguous ? 'parsed' : 'needs_confirmation';
  const confidence = !productModel || ambiguous ? 'low' : removedVersion ? 'high' : 'medium';

  return {
    originalName,
    baseName,
    productModel,
    normalizedProductModel: productModel,
    confidence,
    status,
    removedVersion,
    reason: !productModel
      ? 'No reliable product model found in PDF file name.'
      : ambiguous
        ? `Multiple product model candidates found: ${candidates.join(', ')}.`
        : undefined,
  };
}
