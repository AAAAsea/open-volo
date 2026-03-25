export type TextRefineProvider = "doubao" | "glm" | "custom-openai-compatible";

export type TextRefineProviderPreset = {
  id: TextRefineProvider;
  label: string;
  description: string;
  baseUrl: string;
  model: string;
};

export type TextRefineProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type TextRefineProviderConfigs = Record<TextRefineProvider, TextRefineProviderConfig>;

export const DEFAULT_TEXT_REFINE_PROVIDER: TextRefineProvider = "doubao";

export const TEXT_REFINE_PROVIDER_PRESETS: Record<TextRefineProvider, TextRefineProviderPreset> = {
  doubao: {
    id: "doubao",
    label: "豆包",
    description: "火山引擎 Ark，走 OpenAI-compatible `chat/completions`。",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-1-5-lite-32k-250115",
  },
  glm: {
    id: "glm",
    label: "智谱 GLM 4.7 Flash",
    description: "智谱 OpenAI 兼容接口，适合轻量文本修正。",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4.7-flash",
  },
  "custom-openai-compatible": {
    id: "custom-openai-compatible",
    label: "自定义 OpenAI-compatible",
    description: "手动填写兼容 OpenAI Chat Completions 的 Base URL 和模型名。",
    baseUrl: "",
    model: "",
  },
};

export const TEXT_REFINE_PROVIDER_OPTIONS = Object.values(TEXT_REFINE_PROVIDER_PRESETS);

export function normalizeTextRefineProvider(value?: string): TextRefineProvider {
  const next = String(value ?? "").trim();
  return next in TEXT_REFINE_PROVIDER_PRESETS
    ? (next as TextRefineProvider)
    : DEFAULT_TEXT_REFINE_PROVIDER;
}

export function getTextRefineProviderPreset(value?: string): TextRefineProviderPreset {
  return TEXT_REFINE_PROVIDER_PRESETS[normalizeTextRefineProvider(value)];
}

export function createDefaultTextRefineProviderConfigs(): TextRefineProviderConfigs {
  return {
    doubao: {
      apiKey: "",
      baseUrl: TEXT_REFINE_PROVIDER_PRESETS.doubao.baseUrl,
      model: TEXT_REFINE_PROVIDER_PRESETS.doubao.model,
    },
    glm: {
      apiKey: "",
      baseUrl: TEXT_REFINE_PROVIDER_PRESETS.glm.baseUrl,
      model: TEXT_REFINE_PROVIDER_PRESETS.glm.model,
    },
    "custom-openai-compatible": {
      apiKey: "",
      baseUrl: "",
      model: "",
    },
  };
}

export function getTextRefineProviderConfig(
  configs: Partial<TextRefineProviderConfigs> | undefined,
  provider?: string,
): TextRefineProviderConfig {
  const normalizedProvider = normalizeTextRefineProvider(provider);
  const fallback = createDefaultTextRefineProviderConfigs()[normalizedProvider];
  const config = configs?.[normalizedProvider];
  return {
    apiKey: String(config?.apiKey ?? fallback.apiKey ?? "").trim(),
    baseUrl: String(config?.baseUrl ?? fallback.baseUrl ?? "").trim(),
    model: String(config?.model ?? fallback.model ?? "").trim(),
  };
}
