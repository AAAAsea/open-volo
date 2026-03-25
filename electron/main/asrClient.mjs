import crypto from 'node:crypto';
import fsSync from 'node:fs';
import path from 'node:path';
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import WebSocket from 'ws';

const PROTOCOL_VERSION = 0b0001;
const CLIENT_FULL_REQUEST = 0b0001;
const CLIENT_AUDIO_ONLY_REQUEST = 0b0010;
const SERVER_FULL_RESPONSE = 0b1001;
const SERVER_ACK = 0b1011;
const SERVER_ERROR_RESPONSE = 0b1111;
const NO_SEQUENCE = 0b0000;
const NEG_SEQUENCE = 0b0010;
const NO_SERIALIZATION = 0b0000;
const JSON_SERIAL = 0b0001;
const GZIP = 0b0001;

function generateHeader(options = {}) {
  const {
    version = PROTOCOL_VERSION,
    messageType = CLIENT_FULL_REQUEST,
    messageTypeSpecificFlags = NO_SEQUENCE,
    serialMethod = JSON_SERIAL,
    compressionType = GZIP,
    reservedData = 0x00,
    extensionHeader = Buffer.alloc(0),
  } = options;

  const headerSize = Math.floor(extensionHeader.length / 4) + 1;
  const header = Buffer.alloc(4 + extensionHeader.length);
  let off = 0;
  header[off++] = (version << 4) | headerSize;
  header[off++] = (messageType << 4) | messageTypeSpecificFlags;
  header[off++] = (serialMethod << 4) | compressionType;
  header[off++] = reservedData;
  extensionHeader.copy(header, off);
  return header;
}

function generateFullDefaultHeader() {
  return generateHeader({});
}

function generateAudioDefaultHeader() {
  return generateHeader({ messageType: CLIENT_AUDIO_ONLY_REQUEST });
}

function generateLastAudioDefaultHeader() {
  return generateHeader({
    messageType: CLIENT_AUDIO_ONLY_REQUEST,
    messageTypeSpecificFlags: NEG_SEQUENCE,
  });
}

function parseResponse(res) {
  const headerSize = res[0] & 0x0f;
  const messageType = res[1] >> 4;
  const serializationMethod = res[2] >> 4;
  const messageCompression = res[2] & 0x0f;
  const payload = res.subarray(headerSize * 4);

  const result = {};
  let payloadMsg = null;
  let payloadSize = 0;

  if (messageType === SERVER_FULL_RESPONSE) {
    payloadSize = payload.readInt32BE(0);
    payloadMsg = payload.subarray(4);
  } else if (messageType === SERVER_ACK) {
    result.seq = payload.readInt32BE(0);
    if (payload.length >= 8) {
      payloadSize = payload.readUInt32BE(4);
      payloadMsg = payload.subarray(8);
    }
  } else if (messageType === SERVER_ERROR_RESPONSE) {
    result.code = payload.readUInt32BE(0);
    payloadSize = payload.readUInt32BE(4);
    payloadMsg = payload.subarray(8);
  }

  if (!payloadMsg) return result;

  let decoded = payloadMsg;
  if (messageCompression === GZIP) {
    decoded = zlib.gunzipSync(payloadMsg);
  }

  if (serializationMethod === JSON_SERIAL) {
    result.payload_msg = JSON.parse(decoded.toString('utf-8'));
  } else if (serializationMethod !== NO_SERIALIZATION) {
    result.payload_msg = decoded.toString('utf-8');
  }

  result.payload_size = payloadSize;
  return result;
}

function readWavInfo(data) {
  const nchannels = data.readUInt16LE(22);
  const bitsPerSample = data.readUInt16LE(34);
  const sampwidth = bitsPerSample / 8;
  const framerate = data.readUInt32LE(24);
  const dataChunkSize = data.readUInt32LE(40);
  const nframes = dataChunkSize / (nchannels * sampwidth);
  return { nchannels, sampwidth, framerate, nframes, wavBytesLen: dataChunkSize };
}

function* sliceData(data, chunkSize) {
  const dataLen = data.length;
  let offset = 0;
  while (offset + chunkSize < dataLen) {
    yield [data.subarray(offset, offset + chunkSize), false];
    offset += chunkSize;
  }
  yield [data.subarray(offset, dataLen), true];
}

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

function getAsrConfig() {
  loadEnvFile();
  const asBool = (value, fallback) => {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    return raw !== '0' && raw.toLowerCase() !== 'false';
  };
  const model = 'bigmodel_flash';
  const appid = getEnvValue('VOLO_ASR_APPID', 'APPID', 'ASR_APPID');
  const token = getEnvValue('VOLO_ASR_ACCESS_TOKEN', 'ACCESS_TOKEN', 'ASR_ACCESS_TOKEN');
  const secret = getEnvValue('VOLO_ASR_ACCESS_SECRET', 'ACCESS_SECRET', 'ASR_ACCESS_SECRET');
  const cluster = getEnvValue('VOLO_ASR_CLUSTER', 'CLUSTER', 'ASR_CLUSTER');
  const authMethod = getEnvValue('VOLO_ASR_AUTH_METHOD', 'ASR_AUTH_METHOD') || 'token';
  const wsUrl =
    getEnvValue('VOLO_ASR_WS_URL', 'ASR_WS_URL') ||
    'wss://openspeech.bytedance.com/api/v2/asr';
  const flashUrl =
    getEnvValue('VOLO_ASR_FLASH_URL') ||
    'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
  const resourceId = getEnvValue('VOLO_ASR_RESOURCE_ID') || 'volc.bigasr.auc_turbo';
  const language = getEnvValue('VOLO_ASR_LANGUAGE');
  const modelVersion = getEnvValue('VOLO_ASR_MODEL_VERSION');
  const ssdVersion = getEnvValue('VOLO_ASR_SSD_VERSION');
  const commonWordsRaw = getEnvValue('VOLO_ASR_COMMON_WORDS');
  let commonWords = [];
  if (commonWordsRaw) {
    try {
      const parsed = JSON.parse(commonWordsRaw);
      if (Array.isArray(parsed)) {
        commonWords = parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
    } catch {
      commonWords = commonWordsRaw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  const enableChannelSplit = asBool(getEnvValue('VOLO_ASR_ENABLE_CHANNEL_SPLIT'), true);
  const enableDdc = asBool(getEnvValue('VOLO_ASR_ENABLE_DDC'), true);
  const enableSpeakerInfo = asBool(getEnvValue('VOLO_ASR_ENABLE_SPEAKER_INFO'), true);
  const enablePunc = asBool(getEnvValue('VOLO_ASR_ENABLE_PUNC'), true);
  const enableItn = asBool(getEnvValue('VOLO_ASR_ENABLE_ITN'), true);
  const boostingTableName = getEnvValue('VOLO_ASR_BOOSTING_TABLE_NAME');
  const correctTableName = getEnvValue('VOLO_ASR_CORRECT_TABLE_NAME');
  const context = getEnvValue('VOLO_ASR_CONTEXT');

  return {
    model,
    appid,
    token,
    secret,
    cluster,
    authMethod,
    wsUrl,
    flashUrl,
    resourceId,
    language,
    modelVersion,
    ssdVersion,
    commonWords,
    enableChannelSplit,
    enableDdc,
    enableSpeakerInfo,
    enablePunc,
    enableItn,
    boostingTableName,
    correctTableName,
    context,
  };
}

function extractText(payload) {
  if (!payload || typeof payload !== 'object') return '';

  if (payload.text && Array.isArray(payload.text)) {
    return payload.text
      .map((item) => (item && typeof item.text === 'string' ? item.text : ''))
      .filter(Boolean)
      .join('');
  }

  if (Array.isArray(payload.result)) {
    return payload.result
      .map((item) => (item && typeof item.text === 'string' ? item.text : ''))
      .filter(Boolean)
      .join('');
  }

  if (payload.result && payload.result.text) return payload.result.text;
  if (payload.data && payload.data.result && payload.data.result.text) return payload.data.result.text;
  if (payload.data && payload.data.text) return payload.data.text;
  if (payload.text) return payload.text;
  return '';
}

async function resolveAudioData(audioInput) {
  if (Buffer.isBuffer(audioInput)) {
    return Buffer.from(audioInput);
  }

  if (audioInput instanceof Uint8Array) {
    return Buffer.from(audioInput);
  }

  if (typeof audioInput === 'string') {
    const data = await fs.readFile(audioInput);
    return Buffer.from(data);
  }

  throw new Error('不支持的音频输入');
}

class AsrWsClient {
  constructor(audioInput, cluster, options = {}) {
    this.audioInput = audioInput;
    this.cluster = cluster;
    this.successCode = 1000;
    this.segDuration = options.seg_duration ?? 15000;
    this.nbest = options.nbest ?? 1;
    this.appid = options.appid ?? '';
    this.token = options.token ?? '';
    this.wsUrl = options.ws_url ?? 'wss://openspeech.bytedance.com/api/v2/asr';
    this.uid = options.uid ?? 'volo-client';
    this.workflow = options.workflow ?? 'audio_in,resample,partition,vad,fe,decode,itn,nlu_punctuate';
    this.showLanguage = options.show_language ?? false;
    this.showUtterances = options.show_utterances ?? false;
    this.resultType = options.result_type ?? 'full';
    this.format = options.format ?? 'wav';
    this.rate = options.sample_rate ?? 16000;
    this.language = options.language ?? 'zh-CN';
    this.bits = options.bits ?? 16;
    this.channel = options.channel ?? 1;
    this.codec = options.codec ?? 'raw';
    this.authMethod = options.auth_method ?? 'token';
    this.secret = options.secret ?? '';
    this.mp3SegSize = options.mp3_seg_size ?? 10000;
    this.modelName = options.model_name ?? 'default';
    this.enableChannelSplit = options.enable_channel_split ?? true;
    this.enableDdc = options.enable_ddc ?? true;
    this.enableSpeakerInfo = options.enable_speaker_info ?? true;
    this.enablePunc = options.enable_punc ?? true;
    this.enableItn = options.enable_itn ?? true;
    this.boostingTableName = options.boosting_table_name ?? '';
    this.correctTableName = options.correct_table_name ?? '';
    this.context = options.context ?? '';
  }

  constructRequest(reqid) {
    const workflowSteps = ['audio_in', 'resample', 'partition', 'vad', 'fe', 'decode'];
    if (this.enableItn) workflowSteps.push('itn');
    if (this.enableDdc) workflowSteps.push('nlu_ddc');
    if (this.enablePunc) workflowSteps.push('nlu_punctuate');

    const corpus = {};
    if (this.boostingTableName) corpus.boosting_table_name = this.boostingTableName;
    if (this.correctTableName) corpus.correct_table_name = this.correctTableName;
    if (this.context) corpus.context = this.context;

    const request = {
      reqid,
      nbest: this.nbest,
      workflow: workflowSteps.join(','),
      show_language: this.showLanguage,
      show_utterances: this.showUtterances,
      result_type: this.resultType,
      sequence: 1,
      ...(Object.keys(corpus).length > 0 ? corpus : {}),
    };

    return {
      app: { appid: this.appid, cluster: this.cluster, token: this.token },
      user: { uid: this.uid },
      request,
      audio: {
        format: this.format,
        rate: this.rate,
        language: this.language,
        bits: this.bits,
        channel: this.channel,
        codec: this.codec,
      },
    };
  }

  tokenAuth() {
    return { Authorization: `Bearer; ${this.token}` };
  }

  signatureAuth(fullClientRequest) {
    const u = new URL(this.wsUrl);
    const pathName = u.pathname || '/';
    const headerDicts = { Custom: 'auth_custom' };
    const inputStr = `GET ${pathName} HTTP/1.1\nCustom\n`;
    const inputData = Buffer.concat([Buffer.from(inputStr, 'utf-8'), fullClientRequest]);
    const mac = crypto.createHmac('sha256', this.secret).update(inputData).digest();
    const macB64 = mac.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    headerDicts.Authorization = `HMAC256; access_token="${this.token}"; mac="${macB64}"; h="Custom"`;
    return headerDicts;
  }

  async segmentDataProcessor(wavData, segmentSize) {
    const reqid = crypto.randomUUID();
    const requestParams = this.constructRequest(reqid);
    let payloadBytes = Buffer.from(JSON.stringify(requestParams), 'utf-8');
    payloadBytes = zlib.gzipSync(payloadBytes);

    const fullClientRequest = Buffer.concat([
      generateFullDefaultHeader(),
      Buffer.alloc(4),
      payloadBytes,
    ]);
    fullClientRequest.writeUInt32BE(payloadBytes.length, 4);

    const headers =
      this.authMethod === 'token' ? this.tokenAuth() : this.signatureAuth(fullClientRequest);

    const ws = new WebSocket(this.wsUrl, {
      headers,
      maxPayload: 1000000000,
    });

    const nextMessage = () =>
      new Promise((resolve, reject) => {
        ws.once('message', (data) => {
          resolve(Buffer.isBuffer(data) ? data : Buffer.from(data));
        });
        ws.once('error', reject);
      });

    await new Promise((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    ws.send(fullClientRequest);
    let res = await nextMessage();
    let result = parseResponse(res);
    if (
      result.payload_msg &&
      typeof result.payload_msg === 'object' &&
      'code' in result.payload_msg &&
      result.payload_msg.code !== this.successCode
    ) {
      ws.close();
      return result;
    }

    for (const [chunk, last] of sliceData(wavData, segmentSize)) {
      const compressed = zlib.gzipSync(chunk);
      const audioOnlyRequest = Buffer.concat([
        last ? generateLastAudioDefaultHeader() : generateAudioDefaultHeader(),
        Buffer.alloc(4),
        compressed,
      ]);
      audioOnlyRequest.writeUInt32BE(compressed.length, 4);
      ws.send(audioOnlyRequest);
      res = await nextMessage();
      result = parseResponse(res);
      if (
        result.payload_msg &&
        typeof result.payload_msg === 'object' &&
        'code' in result.payload_msg &&
        result.payload_msg.code !== this.successCode
      ) {
        break;
      }
    }

    ws.close();
    return result;
  }

  async execute() {
    const audioData = await resolveAudioData(this.audioInput);

    if (this.format === 'mp3') {
      return this.segmentDataProcessor(audioData, this.mp3SegSize);
    }

    if (this.format !== 'wav') {
      throw new Error('format should be wav or mp3');
    }

    const { nchannels, sampwidth, framerate } = readWavInfo(audioData);
    const sizePerSec = nchannels * sampwidth * framerate;
    const segmentSize = Math.floor((sizePerSec * this.segDuration) / 1000);
    return this.segmentDataProcessor(audioData, segmentSize);
  }
}

export async function transcribeAudio(audioInput) {
  const config = getAsrConfig();
  if (!config.appid || !config.token) {
    throw new Error('ASR 配置缺失');
  }

  const buildMergedContext = () => {
    const words = Array.isArray(config.commonWords) ? config.commonWords.filter(Boolean) : [];
    if (words.length === 0) return config.context || '';
    let base = {};
    if (config.context) {
      try {
        base = JSON.parse(config.context);
      } catch {
        base = {};
      }
    }
    const hotwords = words.map((word) => ({ word }));
    const merged = { ...base, hotwords: [...hotwords, ...(Array.isArray(base.hotwords) ? base.hotwords : [])] };
    return JSON.stringify(merged);
  };

  const buildCorpus = () => {
    const corpus = {};
    if (config.boostingTableName) corpus.boosting_table_name = config.boostingTableName;
    if (config.correctTableName) corpus.correct_table_name = config.correctTableName;
    const mergedContext = buildMergedContext();
    if (mergedContext) corpus.context = mergedContext;
    return corpus;
  };

  if (config.model === 'bigmodel_flash') {
    const audioData = await resolveAudioData(audioInput);
    const reqid = crypto.randomUUID();
    const flashCorpus = buildCorpus();
    const requestPayload = {
      user: { uid: config.appid || 'volo-client' },
      audio: {
        data: Buffer.from(audioData).toString('base64'),
      },
      request: {
        model_name: 'bigmodel',
        enable_channel_split: Boolean(config.enableChannelSplit),
        enable_ddc: Boolean(config.enableDdc),
        enable_speaker_info: Boolean(config.enableSpeakerInfo),
        enable_punc: Boolean(config.enablePunc),
        enable_itn: Boolean(config.enableItn),
        ...(config.language ? { language: config.language } : {}),
        ...(config.modelVersion ? { model_version: config.modelVersion } : {}),
        ...(config.ssdVersion ? { ssd_version: config.ssdVersion } : {}),
        ...(Object.keys(flashCorpus).length > 0 ? { corpus: flashCorpus } : {}),
      },
    };

    const response = await fetch(config.flashUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-App-Key': config.appid,
        'X-Api-Access-Key': config.token,
        'X-Api-Resource-Id': config.resourceId,
        'X-Api-Request-Id': reqid,
        'X-Api-Sequence': '-1',
      },
      body: JSON.stringify(requestPayload),
    });

    const statusCode = response.headers.get('X-Api-Status-Code') || '';
    const statusMessage = response.headers.get('X-Api-Message') || '';
    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok || statusCode !== '20000000') {
      const detail = parsed?.message || raw || `HTTP ${response.status}`;
      throw new Error(`Flash ASR 失败(${statusCode}:${statusMessage}) ${detail}`);
    }

    const text = extractText(parsed?.result ? parsed : parsed?.payload ?? parsed);
    if (!text) {
      throw new Error(`Flash ASR 返回为空: ${JSON.stringify(parsed ?? {})}`);
    }
    return { text, raw: parsed };
  }

  if (!config.cluster) {
    throw new Error('ASR 配置缺失');
  }

  const client = new AsrWsClient(audioInput, config.cluster, {
    appid: config.appid,
    token: config.token,
    secret: config.secret,
    ws_url: config.wsUrl,
    auth_method: config.authMethod,
    model_name: config.model,
    enable_channel_split: config.enableChannelSplit,
    enable_ddc: config.enableDdc,
    enable_speaker_info: config.enableSpeakerInfo,
    enable_punc: config.enablePunc,
    enable_itn: config.enableItn,
    boosting_table_name: config.boostingTableName,
    correct_table_name: config.correctTableName,
    context: buildMergedContext(),
    format: 'wav',
  });

  const result = await client.execute();
  const text = extractText(result.payload_msg);
  if (!text) {
    const preview = JSON.stringify(result.payload_msg ?? result, null, 2);
    throw new Error(`ASR 返回为空，raw=${preview}`);
  }

  return { text, raw: result.payload_msg };
}
