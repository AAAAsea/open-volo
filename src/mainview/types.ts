import type { ShortcutPayload } from "../shared/voiceRpc";
import type { AsrProvider, AsrProviderConfigs } from "./lib/asrProvider";
import type { TextRefineProvider, TextRefineProviderConfigs } from "./lib/textRefineProvider";

export type ShortcutConfig = ShortcutPayload & {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  kind: "standard" | "fn";
};

export type VoiceMode = "input" | "edit" | "translate";
export type ShortcutFinishMode = "release" | "press-again";

export type PermissionStatus = "granted" | "denied" | "not-determined" | "restricted" | "unknown";

export type RecorderState = {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: AudioWorkletNode;
  analyser: AnalyserNode;
  frequencyData: Uint8Array;
  spectrumFrame: number | null;
  stream: MediaStream;
  chunks: Float32Array[];
};

export type PendingAudio = {
  buffer: ArrayBuffer;
  durationMs: number;
  sampleRate: number;
  channels: number;
};

export type MenuItem = {
  id: "shortcut" | "mode" | "recording" | "input";
  label: string;
  description: string;
};

export type ModeOption = {
  value: VoiceMode;
  label: string;
  description: string;
};

export type AppSection = "home" | "history" | "dictionary" | "settings" | "about";

export type AppNavItem = {
  id: AppSection;
  label: string;
  description: string;
};

export type AudioInputDeviceOption = {
  deviceId: string;
  label: string;
};

export type VoiceHistoryItem = {
  id: string;
  text: string;
  processedText: string;
  mode: VoiceMode;
  asrModelLabel?: string;
  textRefineEnabled?: boolean;
  durationMs: number;
  createdAt: string;
  audioPath: string;
};

export type UsageStats = {
  sessionCount: number;
  totalDurationMs: number;
  totalChars: number;
};

export type RuntimeConfig = {
  cancelShortcut: string;
  shortcutFinishMode: ShortcutFinishMode;
  audioInputDeviceId: string;
  debugEnabled: boolean;
  asrProvider: AsrProvider;
  asrProviderConfigs: AsrProviderConfigs;
  asrModel: string;
  asrAppId: string;
  asrAccessToken: string;
  asrAccessSecret: string;
  asrCluster: string;
  asrAuthMethod: string;
  asrWsUrl: string;
  asrResourceId: string;
  asrFlashUrl: string;
  asrLanguage: string;
  asrModelVersion: string;
  asrSsdVersion: string;
  asrCommonWords: string[];
  asrEnableChannelSplit: boolean;
  asrEnableDdc: boolean;
  asrEnableSpeakerInfo: boolean;
  asrEnablePunc: boolean;
  asrEnableItn: boolean;
  asrBoostingTableName: string;
  asrCorrectTableName: string;
  asrContext: string;
  asrApiKey: string;
  asrBaseUrl: string;
  asrCompatibleModel: string;
  textRefineEnabled: boolean;
  textRefineProvider: TextRefineProvider;
  textRefineProviderConfigs: TextRefineProviderConfigs;
  textRefineApiKey: string;
  textRefineBaseUrl: string;
  textRefineModel: string;
  textRefinePrompt: string;
};

export type DebugState = {
  enabled: boolean;
  logPath: string;
  lines: string[];
};

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "up-to-date"
  | "error"
  | "unsupported";

export type UpdateState = {
  supported: boolean;
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  downloaded: boolean;
  downloadPercent: number;
  downloadedBytes: number;
  totalBytes: number;
  lastCheckedAt: string;
  releaseDate: string;
  releaseNotes: string;
  error: string;
};
