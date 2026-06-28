import { existsSync, unlinkSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export function safeDeleteUploadedFile(uploadsDir: string, storedFileName?: string) {
  if (!storedFileName) {
    return { deleted: false, reason: 'no_file' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(storedFileName) || basename(storedFileName) !== storedFileName) {
    return { deleted: false, reason: 'unsafe_file_name' };
  }
  const target = resolve(uploadsDir, storedFileName);
  const root = resolve(uploadsDir);
  if (!target.startsWith(root)) {
    return { deleted: false, reason: 'unsafe_path' };
  }
  if (!existsSync(target)) {
    return { deleted: false, reason: 'file_not_found' };
  }
  unlinkSync(target);
  return { deleted: true, reason: 'deleted' };
}
