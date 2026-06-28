import { createHash } from 'node:crypto';
import { basename } from 'node:path';

export function shortFingerprint(value, prefix = 'ref') {
  const text = String(value ?? '').trim() || 'empty';
  const digest = createHash('sha256').update(text).digest('hex').slice(0, 12);
  return `${prefix}-${digest}`;
}

export function safeDocumentRef(document) {
  return shortFingerprint([
    document?.documentId,
    document?.id,
    document?.productId,
    document?.documentType,
    document?.title,
    document?.storedFileName,
  ].filter(Boolean).join('|'), 'doc');
}

export function safeProductRef(value) {
  return shortFingerprint(value, 'product');
}

export function safeFileRef(value) {
  return shortFingerprint(basename(String(value ?? '')), 'file');
}

export function safeGroupRef(value) {
  return shortFingerprint(value, 'group');
}
