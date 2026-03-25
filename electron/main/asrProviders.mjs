export const DEFAULT_ASR_PROVIDER = 'doubao';

export const ASR_PROVIDER_PRESETS = {
  doubao: {
    id: 'doubao',
    label: '豆包 ASR',
    supported: true,
  },
  'custom-compatible': {
    id: 'custom-compatible',
    label: '自定义 Compatible（预留）',
    supported: false,
  },
};

function createEmptyAsrProviderConfig() {
  return {
    appId: '',
    accessToken: '',
    accessSecret: '',
    cluster: '',
    authMethod: 'token',
    wsUrl: '',
    resourceId: '',
    flashUrl: '',
    language: '',
    modelVersion: '',
    ssdVersion: '',
    commonWords: [],
    enableChannelSplit: true,
    enableDdc: true,
    enableSpeakerInfo: true,
    enablePunc: true,
    enableItn: true,
    boostingTableName: '',
    correctTableName: '',
    context: '',
    apiKey: '',
    baseUrl: '',
    compatibleModel: '',
  };
}

export function normalizeAsrProvider(value) {
  const key = String(value ?? '').trim();
  return key && ASR_PROVIDER_PRESETS[key] ? key : DEFAULT_ASR_PROVIDER;
}

export function createDefaultAsrProviderConfigs() {
  return {
    doubao: {
      ...createEmptyAsrProviderConfig(),
      cluster: 'volcengine_input_common',
      authMethod: 'token',
      wsUrl: 'wss://openspeech.bytedance.com/api/v2/asr',
      resourceId: 'volc.bigasr.auc_turbo',
      flashUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
    },
    'custom-compatible': createEmptyAsrProviderConfig(),
  };
}

export function getAsrProviderConfig(configs, provider) {
  const normalizedProvider = normalizeAsrProvider(provider);
  const fallback = createDefaultAsrProviderConfigs()[normalizedProvider];
  const config = configs?.[normalizedProvider];
  return {
    appId: String(config?.appId ?? fallback.appId ?? '').trim(),
    accessToken: String(config?.accessToken ?? fallback.accessToken ?? '').trim(),
    accessSecret: String(config?.accessSecret ?? fallback.accessSecret ?? '').trim(),
    cluster: String(config?.cluster ?? fallback.cluster ?? '').trim(),
    authMethod: String(config?.authMethod ?? fallback.authMethod ?? '').trim(),
    wsUrl: String(config?.wsUrl ?? fallback.wsUrl ?? '').trim(),
    resourceId: String(config?.resourceId ?? fallback.resourceId ?? '').trim(),
    flashUrl: String(config?.flashUrl ?? fallback.flashUrl ?? '').trim(),
    language: String(config?.language ?? fallback.language ?? '').trim(),
    modelVersion: String(config?.modelVersion ?? fallback.modelVersion ?? '').trim(),
    ssdVersion: String(config?.ssdVersion ?? fallback.ssdVersion ?? '').trim(),
    commonWords: Array.isArray(config?.commonWords)
      ? config.commonWords.map((item) => String(item ?? '').trim()).filter(Boolean)
      : fallback.commonWords,
    enableChannelSplit:
      typeof config?.enableChannelSplit === 'boolean'
        ? config.enableChannelSplit
        : fallback.enableChannelSplit,
    enableDdc:
      typeof config?.enableDdc === 'boolean'
        ? config.enableDdc
        : fallback.enableDdc,
    enableSpeakerInfo:
      typeof config?.enableSpeakerInfo === 'boolean'
        ? config.enableSpeakerInfo
        : fallback.enableSpeakerInfo,
    enablePunc:
      typeof config?.enablePunc === 'boolean'
        ? config.enablePunc
        : fallback.enablePunc,
    enableItn:
      typeof config?.enableItn === 'boolean'
        ? config.enableItn
        : fallback.enableItn,
    boostingTableName: String(config?.boostingTableName ?? fallback.boostingTableName ?? '').trim(),
    correctTableName: String(config?.correctTableName ?? fallback.correctTableName ?? '').trim(),
    context: String(config?.context ?? fallback.context ?? '').trim(),
    apiKey: String(config?.apiKey ?? fallback.apiKey ?? '').trim(),
    baseUrl: String(config?.baseUrl ?? fallback.baseUrl ?? '').trim(),
    compatibleModel: String(config?.compatibleModel ?? fallback.compatibleModel ?? '').trim(),
  };
}
