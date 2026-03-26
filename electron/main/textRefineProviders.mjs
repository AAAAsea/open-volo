export const DEFAULT_TEXT_REFINE_PROVIDER = 'doubao';

export const TEXT_REFINE_PROVIDER_PRESETS = {
  doubao: {
    id: 'doubao',
    label: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-1-5-lite-32k-250115',
  },
  glm: {
    id: 'glm',
    label: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.7-flash',
  },
  'custom-openai-compatible': {
    id: 'custom-openai-compatible',
    label: '自定义 OpenAI-compatible',
    baseUrl: '',
    model: '',
  },
};

export function normalizeTextRefineProvider(value) {
  const key = String(value ?? '').trim();
  return key && TEXT_REFINE_PROVIDER_PRESETS[key]
    ? key
    : DEFAULT_TEXT_REFINE_PROVIDER;
}

export function getTextRefineProviderPreset(provider) {
  return TEXT_REFINE_PROVIDER_PRESETS[normalizeTextRefineProvider(provider)];
}

export function createDefaultTextRefineProviderConfigs() {
  return {
    doubao: {
      apiKey: '',
      baseUrl: TEXT_REFINE_PROVIDER_PRESETS.doubao.baseUrl,
      model: TEXT_REFINE_PROVIDER_PRESETS.doubao.model,
    },
    glm: {
      apiKey: '',
      baseUrl: TEXT_REFINE_PROVIDER_PRESETS.glm.baseUrl,
      model: TEXT_REFINE_PROVIDER_PRESETS.glm.model,
    },
    'custom-openai-compatible': {
      apiKey: '',
      baseUrl: '',
      model: '',
    },
  };
}

export function getTextRefineProviderConfig(configs, provider) {
  const normalizedProvider = normalizeTextRefineProvider(provider);
  const fallback = createDefaultTextRefineProviderConfigs()[normalizedProvider];
  const config = configs?.[normalizedProvider];
  return {
    apiKey: String(config?.apiKey ?? fallback.apiKey ?? '').trim(),
    baseUrl: String(config?.baseUrl ?? fallback.baseUrl ?? '').trim(),
    model: String(config?.model ?? fallback.model ?? '').trim(),
  };
}

export function inferTextRefineProvider({ provider, baseUrl, model } = {}) {
  const explicit = String(provider ?? '').trim();
  if (explicit && TEXT_REFINE_PROVIDER_PRESETS[explicit]) {
    return explicit;
  }

  const normalizedBaseUrl = String(baseUrl ?? '').trim().replace(/\/$/, '');
  const normalizedModel = String(model ?? '').trim();

  for (const preset of Object.values(TEXT_REFINE_PROVIDER_PRESETS)) {
    if (!preset.baseUrl || !preset.model) continue;
    if (
      normalizedBaseUrl === preset.baseUrl.replace(/\/$/, '') &&
      normalizedModel === preset.model
    ) {
      return preset.id;
    }
  }

  if (!normalizedBaseUrl && !normalizedModel) {
    return DEFAULT_TEXT_REFINE_PROVIDER;
  }

  return 'custom-openai-compatible';
}
