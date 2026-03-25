import path from 'node:path';
import fs from 'node:fs/promises';

export const FN_SHORTCUT_ACCELERATOR = '__VOLO_FN__';
export const WINDOWS_DEFAULT_SHORTCUT = {
  accelerator: 'Control+Shift+Space',
  display: 'Ctrl + Shift + Space',
  kind: 'standard',
};

export function getDefaultShortcutForPlatform(platform = process.platform) {
  return platform === 'darwin'
    ? {
        accelerator: FN_SHORTCUT_ACCELERATOR,
        display: 'Fn',
        kind: 'fn',
      }
    : { ...WINDOWS_DEFAULT_SHORTCUT };
}

export function isFnShortcut(payload) {
  return payload?.kind === 'fn' || String(payload?.accelerator ?? '').trim() === FN_SHORTCUT_ACCELERATOR;
}

export function sanitizeShortcut(payload) {
  if (isFnShortcut(payload)) {
    return {
      accelerator: FN_SHORTCUT_ACCELERATOR,
      display: 'Fn',
      kind: 'fn',
    };
  }

  const accelerator = String(payload?.accelerator ?? '').trim();
  const display = String(payload?.display ?? '').trim();
  if (!accelerator || !display) return null;
  return { accelerator, display, kind: 'standard' };
}

export function getShortcutStorePath(app) {
  return path.join(app.getPath('userData'), 'shortcut.json');
}

export async function loadStoredShortcut(app) {
  try {
    const raw = await fs.readFile(getShortcutStorePath(app), 'utf-8');
    const parsed = JSON.parse(raw);
    const normalized = sanitizeShortcut(parsed);
    if (isFnShortcut(normalized) && process.platform !== 'darwin') {
      return getDefaultShortcutForPlatform(process.platform);
    }
    return normalized;
  } catch {
    return null;
  }
}

export async function saveShortcut(app, nextShortcut) {
  const normalized = sanitizeShortcut(nextShortcut);
  if (!normalized) return;
  await fs.writeFile(getShortcutStorePath(app), JSON.stringify(normalized));
}
