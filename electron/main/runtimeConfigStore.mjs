import {
  createDefaultTextRefineProviderConfigs,
  getTextRefineProviderConfig,
  getTextRefineProviderPreset,
  inferTextRefineProvider,
} from './textRefineProviders.mjs';

export function createRuntimeConfigStore({
  app,
  env,
  fs,
  fsSync,
  path,
  defaultPrompt,
  onShortcutChange,
}) {
  let envFileLoaded = false;
  let runtimeConfig = null;

  const DEFAULT_TEXT_REFINE_PROMPT = defaultPrompt;

  const loadEnvFile = () => {
    if (envFileLoaded) return;
    envFileLoaded = true;
    const envPath = path.join(process.cwd(), '.env');
    if (!fsSync.existsSync(envPath)) return;

    const content = fsSync.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index <= 0) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!env[key]) {
        env[key] = value;
      }
    }
  };

  const getEnvValue = (...keys) => {
    loadEnvFile();
    for (const key of keys) {
      const value = env[key];
      if (value) return value;
    }
    return '';
  };

  const getEnvBackedRuntimeDefaults = () => {
    const shortcutFinishModeRaw = getEnvValue('VOLO_SHORTCUT_FINISH_MODE');
    const audioInputDeviceIdRaw = getEnvValue('VOLO_AUDIO_INPUT_DEVICE_ID');
    const debugEnabledRaw = getEnvValue('VOLO_DEBUG_ENABLED');
    const textRefineEnabledRaw = getEnvValue('VOLO_TEXT_REFINE_ENABLED');
    const textRefinePromptRaw = getEnvValue('VOLO_TEXT_REFINE_PROMPT');
    const rawTextRefineBaseUrl = getEnvValue('VOLO_TEXT_REFINE_BASE_URL', 'VOLCENGINE_ARK_BASE_URL') || '';
    const rawTextRefineModel = getEnvValue('VOLO_TEXT_REFINE_MODEL', 'VOLCENGINE_ARK_MODEL') || '';
    const textRefineProvider = inferTextRefineProvider({
      provider: getEnvValue('VOLO_TEXT_REFINE_PROVIDER'),
      baseUrl: rawTextRefineBaseUrl,
      model: rawTextRefineModel,
    });
    const textRefineProviderConfigs = createDefaultTextRefineProviderConfigs();
    textRefineProviderConfigs[textRefineProvider] = {
      apiKey: getEnvValue('VOLO_TEXT_REFINE_API_KEY', 'VOLCENGINE_ARK_API_KEY', 'ARK_API_KEY') || '',
      baseUrl: rawTextRefineBaseUrl || getTextRefineProviderPreset(textRefineProvider).baseUrl || '',
      model: rawTextRefineModel || getTextRefineProviderPreset(textRefineProvider).model || '',
    };
    const activeTextRefineConfig = getTextRefineProviderConfig(textRefineProviderConfigs, textRefineProvider);
    const asrEnableChannelSplitRaw = getEnvValue('VOLO_ASR_ENABLE_CHANNEL_SPLIT');
    const asrEnableDdcRaw = getEnvValue('VOLO_ASR_ENABLE_DDC');
    const asrEnableSpeakerInfoRaw = getEnvValue('VOLO_ASR_ENABLE_SPEAKER_INFO');
    const asrEnablePuncRaw = getEnvValue('VOLO_ASR_ENABLE_PUNC');
    const asrEnableItnRaw = getEnvValue('VOLO_ASR_ENABLE_ITN');
    return {
      cancelShortcut: 'Escape',
      shortcutFinishMode: shortcutFinishModeRaw === 'press-again' ? 'press-again' : 'release',
      audioInputDeviceId: audioInputDeviceIdRaw || '',
      debugEnabled: debugEnabledRaw === '1',
      asrModel: 'bigmodel_flash',
      asrAppId: getEnvValue('VOLO_ASR_APPID', 'APPID', 'ASR_APPID') || '',
      asrAccessToken: getEnvValue('VOLO_ASR_ACCESS_TOKEN', 'ACCESS_TOKEN', 'ASR_ACCESS_TOKEN') || '',
      asrAccessSecret: getEnvValue('VOLO_ASR_ACCESS_SECRET', 'ACCESS_SECRET', 'ASR_ACCESS_SECRET') || '',
      asrCluster: getEnvValue('VOLO_ASR_CLUSTER', 'CLUSTER', 'ASR_CLUSTER') || '',
      asrAuthMethod: getEnvValue('VOLO_ASR_AUTH_METHOD', 'ASR_AUTH_METHOD') || 'token',
      asrWsUrl: getEnvValue('VOLO_ASR_WS_URL', 'ASR_WS_URL') || '',
      asrResourceId: getEnvValue('VOLO_ASR_RESOURCE_ID') || '',
      asrFlashUrl: getEnvValue('VOLO_ASR_FLASH_URL') || '',
      asrLanguage: getEnvValue('VOLO_ASR_LANGUAGE'),
      asrModelVersion: getEnvValue('VOLO_ASR_MODEL_VERSION'),
      asrSsdVersion: getEnvValue('VOLO_ASR_SSD_VERSION'),
      asrCommonWords: (() => {
        const raw = getEnvValue('VOLO_ASR_COMMON_WORDS');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed)
            ? parsed.map((item) => String(item || '').trim()).filter(Boolean)
            : [];
        } catch {
          return raw
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
        }
      })(),
      asrEnableChannelSplit: asrEnableChannelSplitRaw ? asrEnableChannelSplitRaw !== '0' : true,
      asrEnableDdc: asrEnableDdcRaw ? asrEnableDdcRaw !== '0' : true,
      asrEnableSpeakerInfo: asrEnableSpeakerInfoRaw ? asrEnableSpeakerInfoRaw !== '0' : true,
      asrEnablePunc: asrEnablePuncRaw ? asrEnablePuncRaw !== '0' : true,
      asrEnableItn: asrEnableItnRaw ? asrEnableItnRaw !== '0' : true,
      asrBoostingTableName: getEnvValue('VOLO_ASR_BOOSTING_TABLE_NAME') || '',
      asrCorrectTableName: getEnvValue('VOLO_ASR_CORRECT_TABLE_NAME') || '',
      asrContext: getEnvValue('VOLO_ASR_CONTEXT') || '',
      textRefineEnabled: textRefineEnabledRaw ? textRefineEnabledRaw !== '0' : false,
      textRefineProvider,
      textRefineProviderConfigs,
      textRefineApiKey: activeTextRefineConfig.apiKey,
      textRefineBaseUrl: activeTextRefineConfig.baseUrl,
      textRefineModel: activeTextRefineConfig.model,
      textRefinePrompt: textRefinePromptRaw || DEFAULT_TEXT_REFINE_PROMPT,
    };
  };

  const defaultRuntimeConfig = getEnvBackedRuntimeDefaults();

  const getRuntimeConfigStorePath = () => path.join(app.getPath('userData'), 'runtime-config.json');

  const normalizeRuntimeConfig = (payload = {}) => {
    const normalizeString = (value, fallback = '') => {
      const next = String(value ?? '').trim();
      return next || fallback;
    };
    const normalizeOptionalString = (value, fallback = '') => String(value ?? fallback).trim();
    const normalizeStringArray = (value, fallback = []) => {
      if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
      if (typeof value === 'string') {
        return value
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return fallback;
    };
    const normalizeShortcutFinishMode = (value, fallback = defaultRuntimeConfig.shortcutFinishMode) =>
      value === 'press-again' || value === 'release' ? value : fallback;

    const textRefineEnabled =
      typeof payload.textRefineEnabled === 'boolean'
        ? payload.textRefineEnabled
        : defaultRuntimeConfig.textRefineEnabled;
    const debugEnabled =
      typeof payload.debugEnabled === 'boolean' ? payload.debugEnabled : defaultRuntimeConfig.debugEnabled;
    const asrEnableChannelSplit =
      typeof payload.asrEnableChannelSplit === 'boolean'
        ? payload.asrEnableChannelSplit
        : defaultRuntimeConfig.asrEnableChannelSplit;
    const asrEnableDdc =
      typeof payload.asrEnableDdc === 'boolean' ? payload.asrEnableDdc : defaultRuntimeConfig.asrEnableDdc;
    const asrEnableSpeakerInfo =
      typeof payload.asrEnableSpeakerInfo === 'boolean'
        ? payload.asrEnableSpeakerInfo
        : defaultRuntimeConfig.asrEnableSpeakerInfo;
    const asrEnablePunc =
      typeof payload.asrEnablePunc === 'boolean' ? payload.asrEnablePunc : defaultRuntimeConfig.asrEnablePunc;
    const asrEnableItn =
      typeof payload.asrEnableItn === 'boolean' ? payload.asrEnableItn : defaultRuntimeConfig.asrEnableItn;
    const textRefineProvider = inferTextRefineProvider({
      provider: payload.textRefineProvider,
      baseUrl: payload.textRefineBaseUrl,
      model: payload.textRefineModel,
    });
    const defaultProviderConfigs = createDefaultTextRefineProviderConfigs();
    const payloadProviderConfigs =
      payload.textRefineProviderConfigs && typeof payload.textRefineProviderConfigs === 'object'
        ? payload.textRefineProviderConfigs
        : {};
    const textRefineProviderConfigs = {
      doubao: {
        ...defaultProviderConfigs.doubao,
        ...(payloadProviderConfigs.doubao ?? {}),
      },
      glm: {
        ...defaultProviderConfigs.glm,
        ...(payloadProviderConfigs.glm ?? {}),
      },
      'custom-openai-compatible': {
        ...defaultProviderConfigs['custom-openai-compatible'],
        ...(payloadProviderConfigs['custom-openai-compatible'] ?? {}),
      },
    };
    textRefineProviderConfigs[textRefineProvider] = {
      apiKey: normalizeOptionalString(payload.textRefineApiKey, textRefineProviderConfigs[textRefineProvider]?.apiKey || ''),
      baseUrl: normalizeOptionalString(payload.textRefineBaseUrl, textRefineProviderConfigs[textRefineProvider]?.baseUrl || ''),
      model: normalizeOptionalString(payload.textRefineModel, textRefineProviderConfigs[textRefineProvider]?.model || ''),
    };
    const activeTextRefineConfig = getTextRefineProviderConfig(textRefineProviderConfigs, textRefineProvider);

    return {
      cancelShortcut: normalizeString(payload.cancelShortcut, defaultRuntimeConfig.cancelShortcut),
      shortcutFinishMode: normalizeShortcutFinishMode(payload.shortcutFinishMode),
      audioInputDeviceId: normalizeString(payload.audioInputDeviceId, ''),
      debugEnabled,
      // Force ASR 2.0 极速版 only.
      asrModel: 'bigmodel_flash',
      asrAppId: normalizeString(payload.asrAppId, defaultRuntimeConfig.asrAppId),
      asrAccessToken: normalizeString(payload.asrAccessToken, defaultRuntimeConfig.asrAccessToken),
      asrAccessSecret: normalizeString(payload.asrAccessSecret, defaultRuntimeConfig.asrAccessSecret),
      asrCluster: normalizeString(payload.asrCluster, defaultRuntimeConfig.asrCluster),
      asrAuthMethod: normalizeString(payload.asrAuthMethod, defaultRuntimeConfig.asrAuthMethod),
      asrWsUrl: normalizeString(payload.asrWsUrl, defaultRuntimeConfig.asrWsUrl),
      asrResourceId: normalizeString(payload.asrResourceId, defaultRuntimeConfig.asrResourceId),
      asrFlashUrl: normalizeString(payload.asrFlashUrl, defaultRuntimeConfig.asrFlashUrl),
      asrLanguage: normalizeString(payload.asrLanguage, defaultRuntimeConfig.asrLanguage),
      asrModelVersion: normalizeString(payload.asrModelVersion, defaultRuntimeConfig.asrModelVersion),
      asrSsdVersion: normalizeString(payload.asrSsdVersion, defaultRuntimeConfig.asrSsdVersion),
      asrCommonWords: normalizeStringArray(payload.asrCommonWords, defaultRuntimeConfig.asrCommonWords),
      asrEnableChannelSplit,
      asrEnableDdc,
      asrEnableSpeakerInfo,
      asrEnablePunc,
      asrEnableItn,
      asrBoostingTableName: normalizeString(
        payload.asrBoostingTableName,
        defaultRuntimeConfig.asrBoostingTableName,
      ),
      asrCorrectTableName: normalizeString(
        payload.asrCorrectTableName,
        defaultRuntimeConfig.asrCorrectTableName,
      ),
      asrContext: normalizeString(payload.asrContext, defaultRuntimeConfig.asrContext),
      textRefineEnabled,
      textRefineProvider,
      textRefineProviderConfigs,
      textRefineApiKey: activeTextRefineConfig.apiKey,
      textRefineBaseUrl: activeTextRefineConfig.baseUrl,
      textRefineModel: activeTextRefineConfig.model,
      textRefinePrompt: normalizeString(payload.textRefinePrompt, defaultRuntimeConfig.textRefinePrompt),
    };
  };

  const applyRuntimeEnv = (config) => {
    env.VOLO_ASR_APPID = config.asrAppId;
    env.VOLO_SHORTCUT_FINISH_MODE = config.shortcutFinishMode;
    env.VOLO_AUDIO_INPUT_DEVICE_ID = config.audioInputDeviceId;
    env.VOLO_DEBUG_ENABLED = config.debugEnabled ? '1' : '0';
    env.VOLO_ASR_MODEL = config.asrModel;
    env.VOLO_ASR_ACCESS_TOKEN = config.asrAccessToken;
    env.VOLO_ASR_ACCESS_SECRET = config.asrAccessSecret;
    env.VOLO_ASR_CLUSTER = config.asrCluster;
    env.VOLO_ASR_AUTH_METHOD = config.asrAuthMethod;
    env.VOLO_ASR_WS_URL = config.asrWsUrl;
    env.VOLO_ASR_RESOURCE_ID = config.asrResourceId;
    env.VOLO_ASR_FLASH_URL = config.asrFlashUrl;
    env.VOLO_ASR_LANGUAGE = config.asrLanguage;
    env.VOLO_ASR_MODEL_VERSION = config.asrModelVersion;
    env.VOLO_ASR_SSD_VERSION = config.asrSsdVersion;
    env.VOLO_ASR_COMMON_WORDS = JSON.stringify(config.asrCommonWords || []);
    env.VOLO_ASR_ENABLE_CHANNEL_SPLIT = config.asrEnableChannelSplit ? '1' : '0';
    env.VOLO_ASR_ENABLE_DDC = config.asrEnableDdc ? '1' : '0';
    env.VOLO_ASR_ENABLE_SPEAKER_INFO = config.asrEnableSpeakerInfo ? '1' : '0';
    env.VOLO_ASR_ENABLE_PUNC = config.asrEnablePunc ? '1' : '0';
    env.VOLO_ASR_ENABLE_ITN = config.asrEnableItn ? '1' : '0';
    env.VOLO_ASR_BOOSTING_TABLE_NAME = config.asrBoostingTableName;
    env.VOLO_ASR_CORRECT_TABLE_NAME = config.asrCorrectTableName;
    env.VOLO_ASR_CONTEXT = config.asrContext;
    env.VOLO_TEXT_REFINE_ENABLED = config.textRefineEnabled ? '1' : '0';
    env.VOLO_TEXT_REFINE_PROVIDER = config.textRefineProvider;
    env.VOLO_TEXT_REFINE_API_KEY = config.textRefineApiKey;
    env.VOLO_TEXT_REFINE_BASE_URL = config.textRefineBaseUrl;
    env.VOLO_TEXT_REFINE_MODEL = config.textRefineModel;
    env.VOLO_TEXT_REFINE_PROMPT = config.textRefinePrompt;
  };

  const loadConfig = async () => {
    try {
      const raw = await fs.readFile(getRuntimeConfigStorePath(), 'utf-8');
      const parsed = JSON.parse(raw);
      runtimeConfig = {
        ...defaultRuntimeConfig,
        ...normalizeRuntimeConfig(parsed),
      };
    } catch {
      runtimeConfig = { ...defaultRuntimeConfig };
    }
    applyRuntimeEnv(runtimeConfig);
    return runtimeConfig;
  };

  const saveConfig = async () => {
    await fs.writeFile(getRuntimeConfigStorePath(), JSON.stringify(runtimeConfig));
  };

  const updateConfig = async (partial) => {
    const prevCancelShortcut = runtimeConfig.cancelShortcut;
    runtimeConfig = {
      ...runtimeConfig,
      ...normalizeRuntimeConfig({
        ...runtimeConfig,
        ...partial,
      }),
    };
    applyRuntimeEnv(runtimeConfig);
    await saveConfig();

    if (app.isReady() && runtimeConfig.cancelShortcut !== prevCancelShortcut && onShortcutChange) {
      onShortcutChange(runtimeConfig, prevCancelShortcut);
    }

    return runtimeConfig;
  };

  const getConfig = () => runtimeConfig ?? { ...defaultRuntimeConfig };

  return {
    defaultRuntimeConfig,
    getConfig,
    loadConfig,
    updateConfig,
  };
}
