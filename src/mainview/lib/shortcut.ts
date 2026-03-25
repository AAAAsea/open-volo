import type { ShortcutConfig } from "../types";
import { FN_SHORTCUT, getDefaultShortcut } from "../constants";

const MODIFIER_KEYS = new Set(["shift", "control", "alt", "meta"]);
const KEY_DISPLAY_LABELS: Record<string, string> = {
  controlleft: "Left Ctrl",
  controlright: "Right Ctrl",
  shiftleft: "Left Shift",
  shiftright: "Right Shift",
  altleft: "Left Alt",
  altright: "Right Alt",
  metaleft: "Left Cmd",
  metaright: "Right Cmd",
  fn: "Fn",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === " ") return "space";
  if (lower === "arrowup") return "up";
  if (lower === "arrowdown") return "down";
  if (lower === "arrowleft") return "left";
  if (lower === "arrowright") return "right";
  return lower;
}

export function isModifierOnlyEvent(e: KeyboardEvent): boolean {
  return MODIFIER_KEYS.has(normalizeKey(e.key));
}

function getKeyIdentity(e: KeyboardEvent): string {
  const normalizedKey = normalizeKey(e.key);
  if (MODIFIER_KEYS.has(normalizedKey)) {
    return e.code.toLowerCase();
  }
  return normalizedKey;
}

function getDisplayKeyLabel(key: string): string {
  if (KEY_DISPLAY_LABELS[key]) return KEY_DISPLAY_LABELS[key]!;
  if (key.length === 1) return key.toUpperCase();
  return key[0]!.toUpperCase() + key.slice(1);
}

function buildDisplayFromParts(parts: {
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  key: string;
}) {
  const labels: string[] = [];
  if (parts.meta) labels.push("Cmd");
  if (parts.ctrl) labels.push("Ctrl");
  if (parts.alt) labels.push("Alt");
  if (parts.shift) labels.push("Shift");
  labels.push(getDisplayKeyLabel(parts.key));
  return labels.join(" + ");
}

export function loadStoredShortcut(storageKey: string, platform = "web"): ShortcutConfig | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShortcutConfig> | null;
    if (!parsed) return null;
    if (isFnShortcut(parsed as ShortcutConfig)) {
      return platform === "darwin" ? { ...FN_SHORTCUT } : getDefaultShortcut(platform);
    }
    if (!parsed.accelerator || !parsed.display || !parsed.key) return null;
    return {
      accelerator: parsed.accelerator,
      display: buildDisplayFromParts({
        ctrl: Boolean(parsed.ctrl),
        meta: Boolean(parsed.meta),
        alt: Boolean(parsed.alt),
        shift: Boolean(parsed.shift),
        key: parsed.key,
      }),
      key: parsed.key,
      ctrl: Boolean(parsed.ctrl),
      meta: Boolean(parsed.meta),
      alt: Boolean(parsed.alt),
      shift: Boolean(parsed.shift),
      kind: "standard",
    };
  } catch {
    return null;
  }
}

export function isFnShortcut(
  shortcut: Pick<ShortcutConfig, "kind" | "accelerator" | "key"> | null | undefined,
) {
  return shortcut?.kind === "fn" || shortcut?.accelerator === FN_SHORTCUT.accelerator || shortcut?.key === "fn";
}

export function toDisplayShortcut(e: KeyboardEvent): ShortcutConfig | null {
  if (normalizeKey(e.key) === "fn") {
    return { ...FN_SHORTCUT };
  }

  const normalizedKey = normalizeKey(e.key);
  const keyIdentity = getKeyIdentity(e);
  const isModifierKey = MODIFIER_KEYS.has(normalizedKey);

  const parts: string[] = [];
  if (!isModifierKey) {
    if (e.metaKey) parts.push("Cmd");
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
  }
  const displayKey = getDisplayKeyLabel(keyIdentity);
  parts.push(displayKey);

  const acceleratorParts: string[] = [];
  if (!isModifierKey) {
    if (e.metaKey) acceleratorParts.push("Command");
    if (e.ctrlKey) acceleratorParts.push("Control");
    if (e.altKey) acceleratorParts.push("Alt");
    if (e.shiftKey) acceleratorParts.push("Shift");
  }

  const acceleratorKey = (() => {
    if (isModifierKey) {
      if (normalizedKey === "control") return "Control";
      if (normalizedKey === "shift") return "Shift";
      if (normalizedKey === "alt") return "Alt";
      if (normalizedKey === "meta") return "Command";
      return displayKey;
    }
    if (normalizedKey === "space") return "Space";
    return displayKey;
  })();

  acceleratorParts.push(acceleratorKey);

  return {
    display: parts.join(" + "),
    accelerator: acceleratorParts.join("+"),
    key: keyIdentity,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
    kind: "standard",
  };
}

export function matchesShortcut(e: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  if (isFnShortcut(shortcut)) return false;
  const normalizedKey = getKeyIdentity(e);
  return (
    normalizedKey === shortcut.key &&
    e.ctrlKey === shortcut.ctrl &&
    e.metaKey === shortcut.meta &&
    e.altKey === shortcut.alt &&
    e.shiftKey === shortcut.shift
  );
}

export function shouldReleaseOnKeyUp(
  e: KeyboardEvent,
  shortcut: ShortcutConfig,
): boolean {
  if (isFnShortcut(shortcut)) return false;
  const key = getKeyIdentity(e);
  if (key === shortcut.key) return true;
  const normalizedKey = normalizeKey(e.key);
  if (normalizedKey === "shift" && shortcut.shift) return true;
  if (normalizedKey === "control" && shortcut.ctrl) return true;
  if (normalizedKey === "meta" && shortcut.meta) return true;
  if (normalizedKey === "alt" && shortcut.alt) return true;
  return false;
}
