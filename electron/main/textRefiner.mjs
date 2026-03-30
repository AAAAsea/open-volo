import fsSync from 'node:fs';
import path from 'node:path';
import {
  getTextRefineProviderPreset,
  inferTextRefineProvider,
} from './textRefineProviders.mjs';

function getEnvValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

let envLoaded = false;

function loadEnvFile() {
  if (envLoaded) return;
  envLoaded = true;

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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getRefineConfig() {
  loadEnvFile();

  const apiKey = getEnvValue('VOLO_TEXT_REFINE_API_KEY', 'VOLCENGINE_ARK_API_KEY', 'ARK_API_KEY');
  const rawBaseUrl = getEnvValue('VOLO_TEXT_REFINE_BASE_URL', 'VOLCENGINE_ARK_BASE_URL');
  const rawModel = getEnvValue('VOLO_TEXT_REFINE_MODEL', 'VOLCENGINE_ARK_MODEL');
  const provider = inferTextRefineProvider({
    provider: getEnvValue('VOLO_TEXT_REFINE_PROVIDER'),
    baseUrl: rawBaseUrl,
    model: rawModel,
  });
  const preset = getTextRefineProviderPreset(provider);
  const baseUrl = rawBaseUrl || preset.baseUrl;
  const model = rawModel || preset.model;
  const enabledRaw = getEnvValue('VOLO_TEXT_REFINE_ENABLED');
  const enabled = enabledRaw ? enabledRaw !== '0' : false;
  const prompt = getEnvValue('VOLO_TEXT_REFINE_PROMPT');

  return { apiKey, baseUrl, model, enabled, prompt, provider };
}

function hasTranslateShortcutConfigured() {
  return Boolean(getEnvValue('VOLO_TRANSLATE_SHORTCUT').trim());
}

function buildMessages(inputText, systemPrompt) {
  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `请修整以下语音转写文本：\n\n${inputText}`,
    },
  ];
}

function buildTranslateMessages(inputText, systemPrompt, targetLanguage) {
  const rendered = systemPrompt.replace(/\{language\}/g, targetLanguage || 'English');
  return [
    {
      role: 'system',
      content: rendered,
    },
    {
      role: 'user',
      content: inputText,
    },
  ];
}

function normalizeApiKey(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  return /^bearer\s+/i.test(value) ? value : `Bearer ${value}`;
}

function isRefusalLike(text) {
  const normalized = String(text ?? '')
    .trim()
    .replace(/\s+/g, '');
  if (!normalized) return false;
  const markers = [
    '无法',
    '不能',
    '不提供',
    '不支持',
    '无逻辑',
    '看不懂',
    '请提供',
    '更多信息',
    '我无法',
    '我不能',
    '作为',
    '助手',
  ];
  return markers.some((m) => normalized.includes(m));
}

export async function refineTranscriptText(inputText, options = {}) {
  const original = String(inputText ?? '').trim();
  if (!original) {
    return { text: '', applied: false, reason: 'empty-input' };
  }

  const mode = options.mode || 'input';
  const isTranslate = mode === 'translate';
  const config = getRefineConfig();

  const enabled = isTranslate
    ? (getEnvValue('VOLO_TRANSLATE_ENABLED') === '1' || hasTranslateShortcutConfigured())
    : config.enabled;

  if (!enabled) {
    return { text: original, applied: false, reason: 'disabled' };
  }

  // Translate mode reads its own API key/base URL/model from env
  let apiKey, baseUrl, model, systemPrompt;
  if (isTranslate) {
    apiKey = getEnvValue('VOLO_TEXT_REFINE_API_KEY', 'VOLCENGINE_ARK_API_KEY', 'ARK_API_KEY');
    baseUrl = getEnvValue('VOLO_TEXT_REFINE_BASE_URL', 'VOLCENGINE_ARK_BASE_URL');
    model = getEnvValue('VOLO_TEXT_REFINE_MODEL', 'VOLCENGINE_ARK_MODEL');
    const preset = getTextRefineProviderPreset(
      getEnvValue('VOLO_TEXT_REFINE_PROVIDER'),
    );
    baseUrl = baseUrl || preset.baseUrl;
    model = model || preset.model;
    const rawPrompt = getEnvValue('VOLO_TRANSLATE_PROMPT');
    const DEFAULT_TRANSLATE_PROMPT = `你是一个专业翻译。请将以下文本翻译为{language}。\n\n## 规则\n- 只做翻译，不解释、不评论、不添加任何内容\n- 保持原文的语气、风格和格式\n- 专有名词使用通用译名，人名和地名使用约定俗成的译法\n- 如有不确定的词语，选择最自然的表达\n- 直接输出翻译结果，不加引号、不加说明、不加注释`;
    systemPrompt = rawPrompt || DEFAULT_TRANSLATE_PROMPT;
    if (!systemPrompt) {
      return { text: original, applied: false, reason: 'missing-prompt' };
    }
    const targetLanguage = getEnvValue('VOLO_TRANSLATE_TARGET_LANGUAGE') || 'English';
    systemPrompt = systemPrompt.replace(/\{language\}/g, targetLanguage);
  } else {
    apiKey = config.apiKey;
    baseUrl = config.baseUrl;
    model = config.model;
    systemPrompt = config.prompt?.trim();
  }

  if (!apiKey) {
    return { text: original, applied: false, reason: 'missing-api-key' };
  }
  if (!baseUrl) {
    return { text: original, applied: false, reason: 'missing-base-url' };
  }
  if (!model) {
    return { text: original, applied: false, reason: 'missing-model' };
  }
  apiKey = normalizeApiKey(apiKey);
  if (!apiKey) {
    return { text: original, applied: false, reason: 'invalid-api-key' };
  }
  if (!systemPrompt) {
    return { text: original, applied: false, reason: 'missing-prompt' };
  }

  try {
    const messages = isTranslate
      ? buildTranslateMessages(original, systemPrompt)
      : buildMessages(original, systemPrompt);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.2,
        messages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message =
        parsed?.error?.message ||
        parsed?.message ||
        raw ||
        `HTTP ${response.status}`;
      return { text: original, applied: false, reason: `http-error:${message}` };
    }

    const content = parsed?.choices?.[0]?.message?.content;
    const text =
      typeof content === 'string'
        ? content.trim()
        : Array.isArray(content)
          ? content
              .map((item) => (typeof item?.text === 'string' ? item.text : ''))
              .join('')
              .trim()
          : '';

    if (!text) {
      return { text: original, applied: false, reason: 'empty-model-output' };
    }

    if (!isTranslate && isRefusalLike(text)) {
      return { text: original, applied: false, reason: 'refusal-like-output' };
    }

    return { text, applied: true, reason: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: original, applied: false, reason: `request-failed:${message}` };
  }
}
