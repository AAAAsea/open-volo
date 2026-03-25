import type { VoiceMode } from "../types";

export function insertToCurrentInput(text: string): boolean {
  const active = document.activeElement;

  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    const start = active.selectionStart ?? active.value.length;
    const end = active.selectionEnd ?? active.value.length;
    const before = active.value.slice(0, start);
    const after = active.value.slice(end);
    const nextValue = `${before}${text}${after}`;

    active.value = nextValue;
    const cursor = start + text.length;
    active.setSelectionRange(cursor, cursor);
    active.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    active.focus();
    document.execCommand("insertText", false, text);
    return true;
  }

  return false;
}

export function applyModeTransform(text: string, mode: VoiceMode): string {
  if (mode === "input") return text;

  if (mode === "edit") {
    const trimmed = text.trim();
    const withPunctuation = /[。！？]$/.test(trimmed)
      ? trimmed
      : `${trimmed}。`;
    return `优化后：${withPunctuation}`;
  }

  return `翻译结果：${text.replace(/。?$/, "。")}`;
}
