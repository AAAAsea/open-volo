export type AsrProvider = "doubao" | "custom-compatible";

export type AsrModelPreset = {
  id: string;
  label: string;
  description: string;
  wsUrl: string;
  flashUrl: string;
  resourceId: string;
};

export type AsrProviderPreset = {
  id: AsrProvider;
  label: string;
  description: string;
  supported: boolean;
};

export type AsrProviderConfig = {
  appId: string;
  accessToken: string;
  accessSecret: string;
  cluster: string;
  authMethod: string;
  wsUrl: string;
  resourceId: string;
  flashUrl: string;
  language: string;
  modelVersion: string;
  ssdVersion: string;
  commonWords: string[];
  enableChannelSplit: boolean;
  enableDdc: boolean;
  enableSpeakerInfo: boolean;
  enablePunc: boolean;
  enableItn: boolean;
  boostingTableName: string;
  correctTableName: string;
  context: string;
  apiKey: string;
  baseUrl: string;
  compatibleModel: string;
};

export type AsrProviderConfigs = Record<AsrProvider, AsrProviderConfig>;

export const DEFAULT_ASR_PROVIDER: AsrProvider = "doubao";

export const ASR_PROVIDER_PRESETS: Record<AsrProvider, AsrProviderPreset> = {
  doubao: {
    id: "doubao",
    label: "豆包 ASR",
    description: "火山引擎语音识别。当前版本正式支持的内置识别服务。",
    supported: true,
  },
  "custom-compatible": {
    id: "custom-compatible",
    label: "自定义 Compatible（预留）",
    description: "为后续兼容 provider 预留的通用配置，当前版本尚未联通。",
    supported: false,
  },
};

export const ASR_PROVIDER_OPTIONS = Object.values(ASR_PROVIDER_PRESETS);

export const DOUBAO_ASR_MODEL_PRESETS: AsrModelPreset[] = [
  {
    id: "bigmodel_flash",
    label: "bigmodel_flash（推荐）",
    description: "短语音实时识别，响应快，适合语音输入场景",
    wsUrl: "",
    flashUrl: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
    resourceId: "volc.bigasr.auc_turbo",
  },
  {
    id: "bigmodel_streaming",
    label: "bigmodel 流式（暂不支持）",
    description: "长语音流式识别，需要 WebSocket 支持",
    wsUrl: "wss://openspeech.bytedance.com/api/v2/asr",
    flashUrl: "",
    resourceId: "volc.bigasr.auc_turbo",
  },
  {
    id: "custom",
    label: "自定义接口地址",
    description: "手动填写 Flash URL",
    wsUrl: "",
    flashUrl: "",
    resourceId: "",
  },
];

function createEmptyAsrProviderConfig(): AsrProviderConfig {
  return {
    appId: "",
    accessToken: "",
    accessSecret: "",
    cluster: "",
    authMethod: "token",
    wsUrl: "",
    resourceId: "",
    flashUrl: "",
    language: "",
    modelVersion: "",
    ssdVersion: "",
    commonWords: [],
    enableChannelSplit: true,
    enableDdc: true,
    enableSpeakerInfo: true,
    enablePunc: true,
    enableItn: true,
    boostingTableName: "",
    correctTableName: "",
    context: "",
    apiKey: "",
    baseUrl: "",
    compatibleModel: "",
  };
}

export function normalizeAsrProvider(value?: string): AsrProvider {
  const next = String(value ?? "").trim();
  return next in ASR_PROVIDER_PRESETS ? (next as AsrProvider) : DEFAULT_ASR_PROVIDER;
}

export function getAsrProviderPreset(value?: string): AsrProviderPreset {
  return ASR_PROVIDER_PRESETS[normalizeAsrProvider(value)];
}

export function getDoubaoModelPreset(id?: string): AsrModelPreset {
  return DOUBAO_ASR_MODEL_PRESETS.find((p) => p.id === id) ?? DOUBAO_ASR_MODEL_PRESETS[0];
}

export function createDefaultAsrProviderConfigs(): AsrProviderConfigs {
  return {
    doubao: {
      ...createEmptyAsrProviderConfig(),
      cluster: "volcengine_input_common",
      authMethod: "token",
      wsUrl: "wss://openspeech.bytedance.com/api/v2/asr",
      resourceId: "volc.bigasr.auc_turbo",
      flashUrl: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
    },
    "custom-compatible": createEmptyAsrProviderConfig(),
  };
}

export function getAsrProviderConfig(
  configs: Partial<AsrProviderConfigs> | undefined,
  provider?: string,
): AsrProviderConfig {
  const normalizedProvider = normalizeAsrProvider(provider);
  const fallback = createDefaultAsrProviderConfigs()[normalizedProvider];
  const config = configs?.[normalizedProvider];
  return {
    appId: String(config?.appId ?? fallback.appId ?? "").trim(),
    accessToken: String(config?.accessToken ?? fallback.accessToken ?? "").trim(),
    accessSecret: String(config?.accessSecret ?? fallback.accessSecret ?? "").trim(),
    cluster: String(config?.cluster ?? fallback.cluster ?? "").trim(),
    authMethod: String(config?.authMethod ?? fallback.authMethod ?? "").trim(),
    wsUrl: String(config?.wsUrl ?? fallback.wsUrl ?? "").trim(),
    resourceId: String(config?.resourceId ?? fallback.resourceId ?? "").trim(),
    flashUrl: String(config?.flashUrl ?? fallback.flashUrl ?? "").trim(),
    language: String(config?.language ?? fallback.language ?? "").trim(),
    modelVersion: String(config?.modelVersion ?? fallback.modelVersion ?? "").trim(),
    ssdVersion: String(config?.ssdVersion ?? fallback.ssdVersion ?? "").trim(),
    commonWords: Array.isArray(config?.commonWords)
      ? config.commonWords.map((item) => String(item ?? "").trim()).filter(Boolean)
      : fallback.commonWords,
    enableChannelSplit:
      typeof config?.enableChannelSplit === "boolean"
        ? config.enableChannelSplit
        : fallback.enableChannelSplit,
    enableDdc: typeof config?.enableDdc === "boolean" ? config.enableDdc : fallback.enableDdc,
    enableSpeakerInfo:
      typeof config?.enableSpeakerInfo === "boolean"
        ? config.enableSpeakerInfo
        : fallback.enableSpeakerInfo,
    enablePunc: typeof config?.enablePunc === "boolean" ? config.enablePunc : fallback.enablePunc,
    enableItn: typeof config?.enableItn === "boolean" ? config.enableItn : fallback.enableItn,
    boostingTableName: String(config?.boostingTableName ?? fallback.boostingTableName ?? "").trim(),
    correctTableName: String(config?.correctTableName ?? fallback.correctTableName ?? "").trim(),
    context: String(config?.context ?? fallback.context ?? "").trim(),
    apiKey: String(config?.apiKey ?? fallback.apiKey ?? "").trim(),
    baseUrl: String(config?.baseUrl ?? fallback.baseUrl ?? "").trim(),
    compatibleModel: String(config?.compatibleModel ?? fallback.compatibleModel ?? "").trim(),
  };
}
