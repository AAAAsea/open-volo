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

export const DEFAULT_TRANSLATE_SHORTCUT = (platform = "web"): ShortcutConfig =>
  platform === "darwin"
    ? {
        accelerator: "Alt+Shift+T",
        display: "Option + Shift + T",
        key: "t",
        ctrl: false,
        meta: false,
        alt: true,
        shift: true,
        kind: "standard",
      }
    : {
        accelerator: "Control+Shift+T",
        display: "Ctrl + Shift + T",
        key: "t",
        ctrl: true,
        meta: false,
        alt: false,
        shift: true,
        kind: "standard",
      };

export const DEFAULT_TRANSLATE_PROMPT = `你是一个专业翻译。请将以下文本翻译为{language}。

## 规则
- 只做翻译，不解释、不评论、不添加任何内容
- 保持原文的语气、风格和格式
- 专有名词使用通用译名，人名和地名使用约定俗成的译法
- 如有不确定的词语，选择最自然的表达
- 直接输出翻译结果，不加引号、不加说明、不加注释`;

export const TRANSLATE_PROMPT_PRESETS = [
  {
    id: "standard",
    label: "标准翻译",
    description: "忠实原文，保持语气和格式",
    prompt: DEFAULT_TRANSLATE_PROMPT,
  },
  {
    id: "concise",
    label: "简洁翻译",
    description: "去除冗余表达，更简洁地输出",
    prompt: `你是一个专业翻译。请将以下文本翻译为{language}。

## 规则
- 只做翻译，不解释、不评论
- 去除口语中的冗余表达、重复和废话
- 保持核心语义不变，但输出更简洁
- 直接输出翻译结果，不加说明`,
  },
  {
    id: "formal",
    label: "正式翻译",
    description: "适合商务、学术等正式场合",
    prompt: `你是一个专业翻译。请将以下文本翻译为{language}。

## 规则
- 只做翻译，不解释、不评论
- 使用正式、专业的表达方式
- 保持原文的语义完整性
- 专业术语使用目标语言中的通用说法
- 直接输出翻译结果，不加说明`,
  },
  {
    id: "casual",
    label: "口语化翻译",
    description: "自然流畅的日常口语风格",
    prompt: `你是一个专业翻译。请将以下文本翻译为{language}。

## 规则
- 只做翻译，不解释、不评论
- 使用目标语言中自然的日常口语表达
- 不要过于书面化，保持对话感
- 直接输出翻译结果，不加说明`,
  },
];

export const TRANSLATE_TARGET_LANGUAGES = [
  { value: "English", label: "英语" },
  { value: "Japanese", label: "日语" },
  { value: "Korean", label: "韩语" },
  { value: "French", label: "法语" },
  { value: "German", label: "德语" },
  { value: "Spanish", label: "西班牙语" },
  { value: "Chinese", label: "中文" },
  { value: "Russian", label: "俄语" },
];

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
