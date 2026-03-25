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

export async function refineTranscriptText(inputText) {
  const original = String(inputText ?? '').trim();
  if (!original) {
    return { text: '', applied: false, reason: 'empty-input' };
  }

  const config = getRefineConfig();
  if (!config.enabled) {
    return { text: original, applied: false, reason: 'disabled' };
  }

  if (!config.apiKey) {
    return { text: original, applied: false, reason: 'missing-api-key' };
  }

  if (!config.baseUrl) {
    return { text: original, applied: false, reason: 'missing-base-url' };
  }

  if (!config.model) {
    return { text: original, applied: false, reason: 'missing-model' };
  }

  const apiKey = normalizeApiKey(config.apiKey);
  if (!apiKey) {
    return { text: original, applied: false, reason: 'invalid-api-key' };
  }

  try {
    const systemPrompt = config.prompt?.trim();
    if (!systemPrompt) {
      return { text: original, applied: false, reason: 'missing-prompt' };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        temperature: 0.2,
        messages: buildMessages(original, systemPrompt),
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

    if (isRefusalLike(text)) {
      return { text: original, applied: false, reason: 'refusal-like-output' };
    }

    return { text, applied: true, reason: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { text: original, applied: false, reason: `request-failed:${message}` };
  }
}
