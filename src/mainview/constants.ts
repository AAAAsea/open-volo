import type { AppNavItem, MenuItem, ModeOption, ShortcutConfig } from "./types";

export const FN_SHORTCUT: ShortcutConfig = {
  accelerator: "__VOLO_FN__",
  display: "Fn",
  key: "fn",
  ctrl: false,
  meta: false,
  alt: false,
  shift: false,
  kind: "fn",
};

export const WINDOWS_DEFAULT_SHORTCUT: ShortcutConfig = {
  accelerator: "Control+Shift+Space",
  display: "Ctrl + Shift + Space",
  key: "space",
  ctrl: true,
  meta: false,
  alt: false,
  shift: true,
  kind: "standard",
};

export function getDefaultShortcut(platform = "web"): ShortcutConfig {
  return platform === "darwin" ? { ...FN_SHORTCUT } : { ...WINDOWS_DEFAULT_SHORTCUT };
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "shortcut", label: "快捷键设置", description: "录音触发方式" },
  { id: "mode", label: "模式选择", description: "转写文本处理" },
];

export const MODE_OPTIONS: ModeOption[] = [
  { value: "input", label: "输入", description: "保留原始转写文本" },
  { value: "edit", label: "编辑", description: "模拟小模型润色、补全标点" },
  { value: "translate", label: "翻译", description: "模拟翻译为中文输出" },
];

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: "home", label: "首页", description: "总览与统计" },
  { id: "history", label: "历史记录", description: "本地历史记录" },
  { id: "dictionary", label: "词典", description: "常用词与术语" },
  { id: "settings", label: "设置", description: "快捷键与识别服务" },
  { id: "about", label: "关于", description: "版本、更新与调试" },
];

export const WAVEFORM_BARS = 28;
export const SHORTCUT_STORAGE_KEY = "volo:shortcut";
export const HISTORY_STORAGE_KEY = "volo:history";
export const STATS_STORAGE_KEY = "volo:stats";
