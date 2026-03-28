import { startTransition, useEffect, useRef, useState } from "react";
import workletCode from "./audio-worklet.js?raw";
import logoUrl from "../../assets/branding/volo.png";
import type { VoiceStage } from "../shared/voiceRpc";
import {
  FN_SHORTCUT,
  SHORTCUT_STORAGE_KEY,
  WAVEFORM_BARS,
  getDefaultShortcut,
  DEFAULT_TRANSLATE_SHORTCUT,
} from "./constants";
import { AppSidebar } from "./components/AppSidebar";
import { PermissionCenter } from "./components/PermissionCenter";
import { HistoryModule } from "./components/modules/HistoryModule";
import { HomeModule } from "./components/modules/HomeModule";
import { DictionaryModule } from "./components/modules/DictionaryModule";
import { SettingsModule } from "./components/modules/SettingsModule";
import { AboutModule } from "./components/modules/AboutModule";
import { ScrollArea } from "@/components/ui/scroll-area";
import { encodeWav } from "./lib/audio";
import { loadHistory, loadStats, pruneHistoryByLimit, saveHistory, saveStats } from "./lib/records";
import {
  isFnShortcut,
  isModifierOnlyEvent,
  loadStoredShortcut,
  matchesShortcut,
  shouldReleaseOnKeyUp,
  toDisplayShortcut,
} from "./lib/shortcut";
import { applyModeTransform, insertToCurrentInput } from "./lib/text";
import {
  createDefaultAsrProviderConfigs,
  DEFAULT_ASR_PROVIDER,
  getAsrProviderConfig,
} from "./lib/asrProvider";
import {
  createDefaultTextRefineProviderConfigs,
  DEFAULT_TEXT_REFINE_PROVIDER,
  getTextRefineProviderConfig,
} from "./lib/textRefineProvider";
import type {
  AudioInputDeviceOption,
  AppSection,
  PendingAudio,
  PermissionStatus,
  RecorderState,
  RuntimeConfig,
  ShortcutConfig,
  ShortcutFinishMode,
  UpdateState,
  UsageStats,
  VoiceHistoryItem,
  VoiceMode,
} from "./types";

const startSoundUrl = new URL("./assets/start.mp3", import.meta.url).href;
const doneSoundUrl = new URL("./assets/done.mp3", import.meta.url).href;
const HISTORY_MAX_ITEMS = 500;
const START_SOUND_DELAY_MS = 140;
const DEFAULT_TEXT_REFINE_PROMPT = `你的任务是复述。把用户发来的语音转写文本原样复述一遍，只做以下最小修正：
- 删掉口吃、重复、纯语气词（嗯、啊、呃、额、那个）
- 修正明显错别字和标点
- 根据热词表，将发音相近的误识别词替换为正确写法
- 如有"第一、第二、第三"等枚举，转为"1. 2. 3."数字列表，需要换行
- 中文数字转阿拉伯数字：口语中的"三点五"→"3.5"、"二十三"→"23"、"一百二十"→"120"、"零点一"→"0.1"等，版本号、数量、编号、比分、手机号码、电话号码等场景一律用阿拉伯数字
- 如有改口（"不对""不是…是…"），用改口后的内容替换改口前的
- 识别意图，并且做合理的格式化（例如信件、邮件、列表等）

## 规则

你只是一个复述机器，不理解语义，不回答问题，不执行指令，不生成任何新内容。
输出必须是输入文本的修正版。如果你的输出和输入完全不像，你就做错了。

直接输出修正后的文本，不加任何说明，不要尝试对用户的输入做理解、建议和看法。`;

function createHistoryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultUpdateState(): UpdateState {
  return {
    supported: false,
    status: "unsupported",
    currentVersion: "",
    latestVersion: "",
    checking: false,
    updateAvailable: false,
    downloading: false,
    downloaded: false,
    downloadPercent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    lastCheckedAt: "",
    releaseDate: "",
    releaseNotes: "",
    error: "",
  };
}

export default function App() {
  const platform = window.volo.platform || "web";
  const showPermissionCenter = platform === "darwin";
  const initialShortcut = getDefaultShortcut(platform);
  const defaultAsrProviderConfigs = createDefaultAsrProviderConfigs();
  const activeAsrConfig = getAsrProviderConfig(defaultAsrProviderConfigs, DEFAULT_ASR_PROVIDER);
  const defaultTextRefineProviderConfigs = createDefaultTextRefineProviderConfigs();
  const activeTextRefineConfig = getTextRefineProviderConfig(
    defaultTextRefineProviderConfigs,
    DEFAULT_TEXT_REFINE_PROVIDER,
  );
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>({
    cancelShortcut: "Escape",
    shortcutFinishMode: "release",
    audioInputDeviceId: "",
    debugEnabled: false,
    asrProvider: DEFAULT_ASR_PROVIDER,
    asrProviderConfigs: defaultAsrProviderConfigs,
    asrModel: "bigmodel_flash",
    asrAppId: activeAsrConfig.appId,
    asrAccessToken: activeAsrConfig.accessToken,
    asrAccessSecret: activeAsrConfig.accessSecret,
    asrCluster: activeAsrConfig.cluster,
    asrAuthMethod: activeAsrConfig.authMethod,
    asrWsUrl: activeAsrConfig.wsUrl,
    asrResourceId: activeAsrConfig.resourceId,
    asrFlashUrl: activeAsrConfig.flashUrl,
    asrLanguage: activeAsrConfig.language,
    asrModelVersion: activeAsrConfig.modelVersion,
    asrSsdVersion: activeAsrConfig.ssdVersion,
    asrCommonWords: activeAsrConfig.commonWords,
    asrEnableChannelSplit: activeAsrConfig.enableChannelSplit,
    asrEnableDdc: activeAsrConfig.enableDdc,
    asrEnableSpeakerInfo: activeAsrConfig.enableSpeakerInfo,
    asrEnablePunc: activeAsrConfig.enablePunc,
    asrEnableItn: activeAsrConfig.enableItn,
    asrBoostingTableName: activeAsrConfig.boostingTableName,
    asrCorrectTableName: activeAsrConfig.correctTableName,
    asrContext: activeAsrConfig.context,
    asrApiKey: activeAsrConfig.apiKey,
    asrBaseUrl: activeAsrConfig.baseUrl,
    asrCompatibleModel: activeAsrConfig.compatibleModel,
    textRefineEnabled: true,
    textRefineProvider: DEFAULT_TEXT_REFINE_PROVIDER,
    textRefineProviderConfigs: defaultTextRefineProviderConfigs,
    textRefineApiKey: activeTextRefineConfig.apiKey,
    textRefineBaseUrl: activeTextRefineConfig.baseUrl,
    textRefineModel: activeTextRefineConfig.model,
    textRefinePrompt: DEFAULT_TEXT_REFINE_PROMPT,
    translateEnabled: false,
    translateShortcutAccelerator: DEFAULT_TRANSLATE_SHORTCUT(platform).accelerator,
    translateShortcutDisplay: DEFAULT_TRANSLATE_SHORTCUT(platform).display,
    translateTargetLanguage: "English",
    translatePrompt: "",
  });
  const [section, setSection] = useState<AppSection>("home");
  const [shortcut, setShortcut] = useState<ShortcutConfig>(initialShortcut);
  const [captureShortcutMode, setCaptureShortcutMode] = useState(false);
  const [stage, setStage] = useState<VoiceStage>("idle");
  const [waveform, setWaveform] = useState<number[]>(
    Array.from({ length: WAVEFORM_BARS }, () => 0.1),
  );
  const [shortcutFeedback, setShortcutFeedback] =
    useState<string>("未同步到主进程");
  const [mode] = useState<VoiceMode>("input");
  const [permissions, setPermissions] = useState<{
    microphone: PermissionStatus;
    accessibility: PermissionStatus;
  }>({
    microphone: "unknown",
    accessibility: "unknown",
  });

  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [stats, setStats] = useState<UsageStats>({
    sessionCount: 0,
    totalDurationMs: 0,
    totalChars: 0,
  });
  const [shortcutRegistrationState, setShortcutRegistrationState] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [shortcutPressed, setShortcutPressed] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDeviceOption[]>([]);
  const [audioInputDevicesLoading, setAudioInputDevicesLoading] = useState(false);
  const [debugLogLines, setDebugLogLines] = useState<string[]>([]);
  const [debugLogPath, setDebugLogPath] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>(createDefaultUpdateState());
  const [translateShortcut, setTranslateShortcut] = useState<ShortcutConfig>(DEFAULT_TRANSLATE_SHORTCUT(platform));
  const [captureTranslateShortcutMode, setCaptureTranslateShortcutMode] = useState(false);
  const [translateShortcutRegistrationState, setTranslateShortcutRegistrationState] = useState<
    "idle" | "success" | "error"
  >("idle");

  const holdingRef = useRef(false);
  const translateHoldingRef = useRef(false);
  const modeRef = useRef(mode);
  const runtimeConfigRef = useRef(runtimeConfig);
  const recorderRef = useRef<RecorderState | null>(null);
  const pendingAudioRef = useRef<PendingAudio | null>(null);
  const pendingSessionRef = useRef<string | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const startInFlightRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const waveformRef = useRef<number[]>(waveform);
  const waveformUpdateRef = useRef(0);
  const prevStageRef = useRef<VoiceStage>("idle");
  const startSoundRef = useRef<HTMLAudioElement | null>(null);
  const doneSoundRef = useRef<HTMLAudioElement | null>(null);
  const pendingCueRef = useRef<"start" | "done" | null>(null);
  const startSoundDelayRef = useRef<number | null>(null);
  const stageRef = useRef(stage);
  const lastBubbleLevelSentRef = useRef(0);
  const smoothedLevelRef = useRef(0);
  const lowBandRef = useRef(0);
  const midBandRef = useRef(0);
  const highBandRef = useRef(0);
  const shortcutStateTimeoutRef = useRef<number | null>(null);
  const skipInitialShortcutSyncRef = useRef(true);
  const shortcutPreviewTimeoutRef = useRef<number | null>(null);
  const contentViewportRef = useRef<HTMLDivElement | null>(null);

  const scheduleShortcutRegistrationReset = () => {
    if (shortcutStateTimeoutRef.current !== null) {
      window.clearTimeout(shortcutStateTimeoutRef.current);
    }
    shortcutStateTimeoutRef.current = window.setTimeout(() => {
      setShortcutRegistrationState("idle");
      shortcutStateTimeoutRef.current = null;
    }, 2200);
  };

  const refreshAudioInputDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setAudioInputDevices([]);
      return;
    }

    setAudioInputDevicesLoading(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      setAudioInputDevices(
        audioInputs.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label?.trim() || `麦克风 ${index + 1}`,
        })),
      );
    } catch (error) {
      window.volo.debugLog({
        level: "warn",
        message: "enumerate audio devices failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      setAudioInputDevices([]);
    } finally {
      setAudioInputDevicesLoading(false);
    }
  };

  const playCue = (cue: "start" | "done") => {
    const audio = cue === "start" ? startSoundRef.current : doneSoundRef.current;
    if (!audio) {
      pendingCueRef.current = cue;
      return;
    }

    const triggerPlay = () => {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      triggerPlay();
      return;
    }

    audio.addEventListener("canplaythrough", triggerPlay, { once: true });
    audio.load();
  };

  const updateWaveform = (level: number) => {
    const now = performance.now();
    if (now - waveformUpdateRef.current < 95) return;
    waveformUpdateRef.current = now;
    const next = [...waveformRef.current.slice(1), level];
    waveformRef.current = next;
    setWaveform(next);
  };

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    return () => {
      if (shortcutStateTimeoutRef.current !== null) {
        window.clearTimeout(shortcutStateTimeoutRef.current);
      }
      if (shortcutPreviewTimeoutRef.current !== null) {
        window.clearTimeout(shortcutPreviewTimeoutRef.current);
      }
    };
  }, []);

  const flashShortcutPreview = (display: string) => {
    setShortcutFeedback(`快捷键已响应：${display}`);
    setShortcutPressed(true);
    if (shortcutPreviewTimeoutRef.current !== null) {
      window.clearTimeout(shortcutPreviewTimeoutRef.current);
    }
    shortcutPreviewTimeoutRef.current = window.setTimeout(() => {
      setShortcutPressed(false);
      shortcutPreviewTimeoutRef.current = null;
    }, 800);
  };

  useEffect(() => {
    const onCspViolation = (event: SecurityPolicyViolationEvent) => {
      window.volo.debugLog({
        level: "warn",
        message: "csp violation",
        detail: {
          blockedUri: event.blockedURI,
          violatedDirective: event.violatedDirective,
          effectiveDirective: event.effectiveDirective,
          originalPolicy: event.originalPolicy,
          disposition: event.disposition,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
        },
      });
    };
    window.addEventListener("securitypolicyviolation", onCspViolation);

    const storedShortcut = loadStoredShortcut(SHORTCUT_STORAGE_KEY, platform);
    if (storedShortcut) {
      setShortcut(storedShortcut);
    }

    const savedHistory = pruneHistoryByLimit(loadHistory(), HISTORY_MAX_ITEMS);
    const savedStats = loadStats();

    setHistory(savedHistory);
    setStats(savedStats);
    saveHistory(savedHistory);

    void window.volo.getRuntimeConfig().then((res) => {
      if (!res?.ok || !res.config) return;
      const config = res.config as Partial<RuntimeConfig>;
      setRuntimeConfig((prev) => ({ ...prev, ...config }));
      if (config.translateEnabled !== undefined || config.translateShortcutAccelerator !== undefined) {
        const ts = config.translateShortcutAccelerator || prev.translateShortcutAccelerator;
        const td = config.translateShortcutDisplay || prev.translateShortcutDisplay;
        setTranslateShortcut({
          accelerator: ts,
          display: td,
          key: ts.split('+').pop() || 't',
          ctrl: ts.includes('Control'),
          meta: ts.includes('Command'),
          alt: ts.includes('Alt'),
          shift: ts.includes('Shift'),
          kind: 'standard',
        });
      }
    });
    void window.volo.getDebugState().then((res) => {
      if (!res?.ok) return;
      setDebugLogLines(Array.isArray(res.lines) ? res.lines : []);
      setDebugLogPath(String(res.logPath || ""));
      if (typeof res.enabled === "boolean") {
        setRuntimeConfig((prev) => ({ ...prev, debugEnabled: res.enabled }));
      }
    });
    void window.volo.getUpdateState().then((res) => {
      if (!res?.ok || !res.state) return;
      setUpdateState(res.state);
    });

    void window.volo.getPermissions().then((res) => {
      if (res?.ok) {
        setPermissions(res.permissions);
      }
    });

    void refreshAudioInputDevices();

    return () => {
      window.removeEventListener("securitypolicyviolation", onCspViolation);
    };
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    runtimeConfigRef.current = runtimeConfig;
  }, [runtimeConfig]);

  useEffect(() => {
    void refreshAudioInputDevices();

    if (!navigator.mediaDevices?.addEventListener) return;

    const onDeviceChange = () => {
      void refreshAudioInputDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    };
  }, [permissions.microphone]);

  useEffect(() => {
    startSoundRef.current = new Audio(startSoundUrl);
    doneSoundRef.current = new Audio(doneSoundUrl);

    const startSound = startSoundRef.current;
    const doneSound = doneSoundRef.current;
    startSound.preload = "auto";
    doneSound.preload = "auto";
    startSound.load();
    doneSound.load();

    if (pendingCueRef.current) {
      const pending = pendingCueRef.current;
      pendingCueRef.current = null;
      playCue(pending);
    }

    return () => {
      if (startSoundDelayRef.current !== null) {
        window.clearTimeout(startSoundDelayRef.current);
        startSoundDelayRef.current = null;
      }
      if (startSoundRef.current) {
        startSoundRef.current.pause();
        startSoundRef.current = null;
      }
      if (doneSoundRef.current) {
        doneSoundRef.current.pause();
        doneSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const prevStage = prevStageRef.current;

    if (prevStage !== "recording" && stage === "recording") {
      if (startSoundDelayRef.current !== null) {
        window.clearTimeout(startSoundDelayRef.current);
      }
      startSoundDelayRef.current = window.setTimeout(() => {
        if (stageRef.current === "recording") {
          playCue("start");
        }
      }, START_SOUND_DELAY_MS);
    }

    if (prevStage === "recording" && (stage === "transcribing" || stage === "idle")) {
      if (startSoundDelayRef.current !== null) {
        window.clearTimeout(startSoundDelayRef.current);
        startSoundDelayRef.current = null;
      }
      playCue("done");
    }

    prevStageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (skipInitialShortcutSyncRef.current) {
      skipInitialShortcutSyncRef.current = false;
      return;
    }
    void window.volo.setShortcut({
      accelerator: shortcut.accelerator,
      display: shortcut.display,
      kind: shortcut.kind,
    });
  }, [shortcut.accelerator, shortcut.display, shortcut.kind]);

  useEffect(() => {
    void window.volo.setShortcutPreviewMode({ enabled: section === "home" });
    return () => {
      void window.volo.setShortcutPreviewMode({ enabled: false });
    };
  }, [section]);

  useEffect(() => {
    const viewport = contentViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: 0, behavior: "auto" });
  }, [section]);

  useEffect(() => {
    localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcut));
  }, [shortcut]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  useEffect(() => {
    if (typeof Image !== "undefined") {
      const img = new Image();
      img.src = logoUrl;
    }

    const offStatus = window.volo.onStatus((payload) => {
      setStage(payload.stage);
      if (payload.stage === "idle") {
        const baseline = Array.from({ length: WAVEFORM_BARS }, () => 0);
        waveformRef.current = baseline;
        setWaveform(baseline);
        smoothedLevelRef.current = 0;
        lowBandRef.current = 0;
        midBandRef.current = 0;
        highBandRef.current = 0;
        holdingRef.current = false;
        setShortcutPressed(false);
      }
    });

    const offAudio = window.volo.onAudioLevel(({ level }) => {
      if (!window.volo.isMock) return;
      updateWaveform(level);
    });

    const offTranscription = window.volo.onTranscription(
      ({ text, originalText, refinedText, audioPath, durationMs, mode: mainMode }) => {
        // Main-process cleanup may arrive a beat later; drop the local "refining"
        // state as soon as final text is ready so the UI feels finished on paste.
        setStage("idle");

        const activeMode = mainMode || modeRef.current;
        const original = originalText || text;
        const refined = refinedText || text;

        const processed = applyModeTransform(refined, activeMode);

        setStats((prev) => ({
          sessionCount: prev.sessionCount + 1,
          totalDurationMs: prev.totalDurationMs + durationMs,
          totalChars: prev.totalChars + processed.length,
        }));

        setHistory((prev) => {
          const nextItem: VoiceHistoryItem = {
            id: createHistoryId(),
            text: original,
            processedText: refined,
            mode: activeMode,
            textRefineEnabled: runtimeConfigRef.current.textRefineEnabled,
            durationMs,
            createdAt: new Date().toISOString(),
            audioPath,
          };
          const next = pruneHistoryByLimit([nextItem, ...prev], HISTORY_MAX_ITEMS);
          saveHistory(next);
          return next;
        });

        const inserted = insertToCurrentInput(processed);
        if (!inserted) {
          // keep external hint only; we no longer render local fallback input panel
        }
      },
    );

    const offInputHint = window.volo.onInputHint(({ message }) => {
      if (showPermissionCenter && message.includes("权限")) {
        void window.volo.getPermissions().then((res) => {
          if (res?.ok) setPermissions(res.permissions);
        });
      }
    });

    const offPermissions = window.volo.onPermissions((payload) => {
      setPermissions(payload);
    });

    const offShortcut = window.volo.onShortcutApplied(({ display, ok, error }) => {
      if (ok) {
        setShortcutFeedback(`快捷键已生效：${display}`);
        setShortcutRegistrationState("success");
        scheduleShortcutRegistrationReset();
        return;
      }
      setShortcutFeedback(`快捷键注册失败：${error ?? "未知错误"}`);
      setShortcutRegistrationState("error");
      scheduleShortcutRegistrationReset();
    });

    const offShortcutCaptured = window.volo.onShortcutCaptured((payload) => {
      if (!captureShortcutMode || !payload) return;
      if (payload.kind === "fn") {
        setShortcut({ ...FN_SHORTCUT });
        setCaptureShortcutMode(false);
      }
    });

    const offShortcutPreview = window.volo.onShortcutPreview(({ display }) => {
      flashShortcutPreview(display);
    });

    const offAudioRequest = window.volo.onAudioRequest(({ sessionId }) => {
      pendingSessionRef.current = sessionId;
      if (pendingAudioRef.current) {
        void window.volo.submitAudio({
          sessionId,
          data: pendingAudioRef.current.buffer,
          durationMs: pendingAudioRef.current.durationMs,
          sampleRate: pendingAudioRef.current.sampleRate,
          channels: pendingAudioRef.current.channels,
        });
        pendingAudioRef.current = null;
        pendingSessionRef.current = null;
      }
    });

    const offDebugLogEntry = window.volo.onDebugLogEntry(({ line }) => {
      setDebugLogLines((prev) => [...prev.slice(-299), String(line || "")]);
    });
    const offDebugLogsCleared = window.volo.onDebugLogsCleared(() => {
      setDebugLogLines([]);
    });
    const offUpdateState = window.volo.onUpdateState((payload) => {
      setUpdateState(payload);
    });

    const offTranslateShortcutApplied = window.volo.onTranslateShortcutApplied?.(({ ok, error }) => {
      if (ok) {
        setTranslateShortcutRegistrationState("success");
        scheduleShortcutRegistrationReset();
        return;
      }
      setTranslateShortcutRegistrationState("error");
      scheduleShortcutRegistrationReset();
    });

    return () => {
      offStatus();
      offAudio();
      offTranscription();
      offInputHint();
      offShortcut();
      offShortcutCaptured();
      offShortcutPreview();
      offAudioRequest();
      offDebugLogEntry();
      offDebugLogsCleared();
      offUpdateState();
      offPermissions();
      offTranslateShortcutApplied?.();
      holdingRef.current = false;
    };
  }, [captureShortcutMode, showPermissionCenter]);

  useEffect(() => {
    if (window.volo.isMock) return;

    const startCapture = async () => {
      if (recorderRef.current || startInFlightRef.current) return;
      startInFlightRef.current = true;
      try {
        const selectedDeviceId = runtimeConfigRef.current.audioInputDeviceId.trim();
        const preferredAudioConstraint = selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true;

        window.volo.debugLog({
          level: "info",
          message: "capture start: getUserMedia",
          detail: { selectedDeviceId: selectedDeviceId || "default" },
        });

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: preferredAudioConstraint,
          });
        } catch (error) {
          const shouldFallbackToDefault =
            Boolean(selectedDeviceId) &&
            (error instanceof OverconstrainedError ||
              (error instanceof DOMException &&
                (error.name === "NotFoundError" || error.name === "OverconstrainedError")));

          if (!shouldFallbackToDefault) {
            throw error;
          }

          window.volo.debugLog({
            level: "warn",
            message: "selected audio input unavailable, fallback to default",
            detail: {
              selectedDeviceId,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const context = new AudioContext({ sampleRate: 16000 });
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0;
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        const workletBlob = new Blob([workletCode], { type: "application/javascript" });
        const workletBlobUrl = URL.createObjectURL(workletBlob);
        window.volo.debugLog({
          level: "info",
          message: "worklet url",
          detail: { url: workletBlobUrl, size: workletCode.length },
        });
        try {
          await context.audioWorklet.addModule(workletBlobUrl);
        } catch (error) {
          window.volo.debugLog({
            level: "error",
            message: "worklet addModule failed",
            detail: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
          });
          throw error;
        } finally {
          URL.revokeObjectURL(workletBlobUrl);
        }
        const processor = new AudioWorkletNode(context, "volo-recorder");
        const chunks: Float32Array[] = [];
        smoothedLevelRef.current = 0;
        lowBandRef.current = 0;
        midBandRef.current = 0;
        highBandRef.current = 0;
        processor.port.onmessage = (event) => {
          if (stageRef.current !== "arming" && stageRef.current !== "recording") return;
          const input = new Float32Array(event.data);
          chunks.push(input);
          let sum = 0;
          for (let i = 0; i < input.length; i += 1) {
            const sample = input[i] ?? 0;
            sum += sample * sample;
          }
          const rms = Math.sqrt(sum / input.length);
          const normalized = Math.max(0, Math.min(1, rms * 12));

          const prevLevel = smoothedLevelRef.current;
          const alpha = normalized > prevLevel ? 0.72 : 0.9;
          const smoothed = prevLevel + (normalized - prevLevel) * alpha;
          smoothedLevelRef.current = smoothed;
          const level = smoothed;

          updateWaveform(level);

          analyser.getByteFrequencyData(frequencyData);
          const rawLow = avgRange(80, 320);
          const rawMid = avgRange(320, 2200);
          const rawHigh = avgRange(2200, 6000);
          const boostBand = (v: number) => Math.max(0, Math.min(1, Math.pow(v, 0.85) * 1.25));
          const boostedLow = boostBand(rawLow);
          const boostedMid = boostBand(rawMid);
          const boostedHigh = boostBand(rawHigh);
          lowBandRef.current += (boostedLow - lowBandRef.current) * 0.78;
          midBandRef.current += (boostedMid - midBandRef.current) * 0.78;
          highBandRef.current += (boostedHigh - highBandRef.current) * 0.78;
          const now = performance.now();
          if (now - lastBubbleLevelSentRef.current > 16) {
            lastBubbleLevelSentRef.current = now;
            window.volo.reportAudioSpectrum({
              level: clampBand(smoothedLevelRef.current),
              low: clampBand(lowBandRef.current),
              mid: clampBand(midBandRef.current),
              high: clampBand(highBandRef.current),
            });
          }
        };
        const clampBand = (value: number) => Math.max(0, Math.min(1, value));
        const avgRange = (fromHz: number, toHz: number) => {
          const nyquist = context.sampleRate / 2;
          const maxIndex = frequencyData.length - 1;
          const fromIndex = Math.max(0, Math.min(maxIndex, Math.floor((fromHz / nyquist) * maxIndex)));
          const toIndex = Math.max(fromIndex, Math.min(maxIndex, Math.ceil((toHz / nyquist) * maxIndex)));
          let sum = 0;
          let count = 0;
          for (let i = fromIndex; i <= toIndex; i += 1) {
            sum += frequencyData[i] ?? 0;
            count += 1;
          }
          return count > 0 ? sum / count / 255 : 0;
        };
        source.connect(analyser);
        source.connect(processor);
        recorderRef.current = {
          context,
          source,
          processor,
          analyser,
          frequencyData,
          spectrumFrame: null,
          stream,
          chunks,
        };
        window.volo.debugLog({ level: "info", message: "capture ready" });
        window.volo.notifyCaptureReady();
        recordingStartedAtRef.current = Date.now();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        window.volo.debugLog({ level: "error", message: "capture failed", detail });
        window.volo.notifyCaptureFailed();
        recorderRef.current = null;
        recordingStartedAtRef.current = null;
      } finally {
        startInFlightRef.current = false;
        if (stopRequestedRef.current) {
          stopRequestedRef.current = false;
          void stopCapture(true);
        }
      }
    };

    const stopCapture = async (fromDeferred = false) => {
      if (startInFlightRef.current && !fromDeferred) {
        stopRequestedRef.current = true;
        return;
      }
      const current = recorderRef.current;
      if (!current) return;
      const elapsedMs = Date.now() - (recordingStartedAtRef.current ?? Date.now());
      const minDurationMs = 600;
      if (elapsedMs < minDurationMs) {
        if (fromDeferred) return;
        window.setTimeout(() => {
          void stopCapture(true);
        }, minDurationMs - elapsedMs);
        return;
      }

      if (current.spectrumFrame !== null) {
        window.cancelAnimationFrame(current.spectrumFrame);
        current.spectrumFrame = null;
      }
      current.processor.disconnect();
      current.analyser.disconnect();
      current.source.disconnect();
      current.stream.getTracks().forEach((track) => track.stop());
      const sampleRate = current.context.sampleRate;
      const durationMs = Math.max(300, elapsedMs);
      await current.context.close();
      recorderRef.current = null;
      recordingStartedAtRef.current = null;

      if (current.chunks.length === 0) {
        const silentLength = Math.max(1, Math.floor(sampleRate * 0.3));
        current.chunks.push(new Float32Array(silentLength));
      }

      const buffer = encodeWav(current.chunks, sampleRate);
      const pending: PendingAudio = {
        buffer,
        durationMs,
        sampleRate,
        channels: 1,
      };
      if (pendingSessionRef.current) {
        const sessionId = pendingSessionRef.current;
        pendingSessionRef.current = null;
        void window.volo.submitAudio({
          sessionId,
          data: pending.buffer,
          durationMs: pending.durationMs,
          sampleRate: pending.sampleRate,
          channels: pending.channels,
        });
      } else {
        pendingAudioRef.current = pending;
      }
    };

    const discardCapture = async () => {
      if (startInFlightRef.current) {
        window.setTimeout(() => {
          void discardCapture();
        }, 80);
        return;
      }
      const current = recorderRef.current;
      if (!current) return;
      if (current.spectrumFrame !== null) {
        window.cancelAnimationFrame(current.spectrumFrame);
        current.spectrumFrame = null;
      }
      current.processor.disconnect();
      current.analyser.disconnect();
      current.source.disconnect();
      current.stream.getTracks().forEach((track) => track.stop());
      await current.context.close();
      recorderRef.current = null;
      recordingStartedAtRef.current = null;
      pendingAudioRef.current = null;
      pendingSessionRef.current = null;
    };

    if (stage === "arming" || stage === "recording") {
      void startCapture();
    } else if (stage === "transcribing" || stage === "refining") {
      void stopCapture();
    } else if (stage === "idle") {
      void discardCapture();
    }
  }, [stage]);

  useEffect(() => {
    if (captureShortcutMode) {
      void window.volo.beginShortcutCapture();
      return () => {
        void window.volo.endShortcutCapture();
      };
    }
    void window.volo.endShortcutCapture();
  }, [captureShortcutMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (captureShortcutMode) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") {
          setCaptureShortcutMode(false);
          setShortcutPressed(false);
          return;
        }

        if (isModifierOnlyEvent(e)) {
          const label = (() => {
            if (e.metaKey && (e.key === "Meta" || e.key === "OS")) return "Command";
            if (e.ctrlKey && e.key === "Control") return "Control";
            if (e.altKey && e.key === "Alt") return "Option";
            if (e.shiftKey && e.key === "Shift") return "Shift";
            return e.key;
          })();
          setShortcutFeedback(`已按下 ${label}，继续按下另一个按键`);
          return;
        }

        const next = toDisplayShortcut(e);
        if (!next) return;

        setShortcut(next);
        setShortcutFeedback(`快捷键已更新为 ${next.display}`);
        setCaptureShortcutMode(false);
        return;
      }

      if (
        e.key === "Escape" &&
        (stage === "recording" || stage === "arming" || stage === "transcribing" || stage === "refining")
      ) {
        e.preventDefault();
        e.stopPropagation();
        holdingRef.current = false;
        setShortcutPressed(false);
        void window.volo.cancelRecording({ source: "escape" });
        return;
      }

      if (holdingRef.current || e.repeat) return;
      if (isFnShortcut(shortcut)) return;
      if (!matchesShortcut(e, shortcut)) return;
      const releaseMode = runtimeConfig.shortcutFinishMode === "release";

      if (section === "home") {
        e.preventDefault();
        e.stopPropagation();
        flashShortcutPreview(shortcut.display);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      holdingRef.current = true;
      setShortcutPressed(true);
      if (window.volo.isMock) {
        if (releaseMode) {
          void window.volo.startShortcutHold({ source: "window-hotkey" });
        } else {
          void window.volo.triggerShortcut({ source: "button" });
        }
      }
    };

    // Translate shortcut key handling
    const onTranslateKeyDown = (e: KeyboardEvent) => {
      if (captureTranslateShortcutMode) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") {
          setCaptureTranslateShortcutMode(false);
          return;
        }

        if (isModifierOnlyEvent(e)) return;

        const next = toDisplayShortcut(e);
        if (!next) return;

        setTranslateShortcut(next);
        setRuntimeConfig({
          translateShortcutAccelerator: next.accelerator,
          translateShortcutDisplay: next.display,
        });
        setCaptureTranslateShortcutMode(false);
        return;
      }
    };

    const onTranslateKeyUp = (e: KeyboardEvent) => {
      if (!translateHoldingRef.current) return;
      if (!shouldReleaseOnKeyUp(e, translateShortcut)) return;

      e.preventDefault();
      e.stopPropagation();
      translateHoldingRef.current = false;
      if (runtimeConfig.shortcutFinishMode === "release") {
        void window.volo.endTranslateHold({ source: "window-hotkey" });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!holdingRef.current) return;
      if (!shouldReleaseOnKeyUp(e, shortcut)) return;

      e.preventDefault();
      e.stopPropagation();
      holdingRef.current = false;
      setShortcutPressed(false);
      if (runtimeConfig.shortcutFinishMode === "release") {
        void window.volo.endShortcutHold({ source: "window-hotkey" });
      }
    };

    const onBlur = () => {
      if (holdingRef.current) {
        holdingRef.current = false;
        setShortcutPressed(false);
        if (runtimeConfig.shortcutFinishMode === "release") {
          void window.volo.endShortcutHold({ source: "window-hotkey" });
        }
      }
      if (translateHoldingRef.current) {
        translateHoldingRef.current = false;
        if (runtimeConfig.shortcutFinishMode === "release") {
          void window.volo.endTranslateHold({ source: "window-hotkey" });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("keydown", onTranslateKeyDown, true);
    window.addEventListener("keyup", onTranslateKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("keydown", onTranslateKeyDown, true);
      window.removeEventListener("keyup", onTranslateKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [captureShortcutMode, captureTranslateShortcutMode, runtimeConfig.shortcutFinishMode, section, shortcut, translateShortcut, stage]);

  const updateRuntimeConfig = (patch: Partial<RuntimeConfig>) => {
    setRuntimeConfig((prev) => {
      const nextAsrProvider = patch.asrProvider ?? prev.asrProvider;
      const nextAsrProviderConfigs = {
        ...prev.asrProviderConfigs,
        ...(patch.asrProviderConfigs ?? {}),
      };
      const touchedAsrFields =
        "asrAppId" in patch ||
        "asrAccessToken" in patch ||
        "asrAccessSecret" in patch ||
        "asrCluster" in patch ||
        "asrAuthMethod" in patch ||
        "asrWsUrl" in patch ||
        "asrResourceId" in patch ||
        "asrFlashUrl" in patch ||
        "asrLanguage" in patch ||
        "asrModelVersion" in patch ||
        "asrSsdVersion" in patch ||
        "asrCommonWords" in patch ||
        "asrEnableChannelSplit" in patch ||
        "asrEnableDdc" in patch ||
        "asrEnableSpeakerInfo" in patch ||
        "asrEnablePunc" in patch ||
        "asrEnableItn" in patch ||
        "asrBoostingTableName" in patch ||
        "asrCorrectTableName" in patch ||
        "asrContext" in patch ||
        "asrApiKey" in patch ||
        "asrBaseUrl" in patch ||
        "asrCompatibleModel" in patch;

      if (touchedAsrFields) {
        nextAsrProviderConfigs[nextAsrProvider] = {
          ...nextAsrProviderConfigs[nextAsrProvider],
          appId: "asrAppId" in patch ? String(patch.asrAppId ?? "") : prev.asrAppId,
          accessToken:
            "asrAccessToken" in patch ? String(patch.asrAccessToken ?? "") : prev.asrAccessToken,
          accessSecret:
            "asrAccessSecret" in patch ? String(patch.asrAccessSecret ?? "") : prev.asrAccessSecret,
          cluster: "asrCluster" in patch ? String(patch.asrCluster ?? "") : prev.asrCluster,
          authMethod: "asrAuthMethod" in patch ? String(patch.asrAuthMethod ?? "") : prev.asrAuthMethod,
          wsUrl: "asrWsUrl" in patch ? String(patch.asrWsUrl ?? "") : prev.asrWsUrl,
          resourceId: "asrResourceId" in patch ? String(patch.asrResourceId ?? "") : prev.asrResourceId,
          flashUrl: "asrFlashUrl" in patch ? String(patch.asrFlashUrl ?? "") : prev.asrFlashUrl,
          language: "asrLanguage" in patch ? String(patch.asrLanguage ?? "") : prev.asrLanguage,
          modelVersion:
            "asrModelVersion" in patch ? String(patch.asrModelVersion ?? "") : prev.asrModelVersion,
          ssdVersion: "asrSsdVersion" in patch ? String(patch.asrSsdVersion ?? "") : prev.asrSsdVersion,
          commonWords: "asrCommonWords" in patch ? patch.asrCommonWords ?? [] : prev.asrCommonWords,
          enableChannelSplit:
            "asrEnableChannelSplit" in patch ? Boolean(patch.asrEnableChannelSplit) : prev.asrEnableChannelSplit,
          enableDdc: "asrEnableDdc" in patch ? Boolean(patch.asrEnableDdc) : prev.asrEnableDdc,
          enableSpeakerInfo:
            "asrEnableSpeakerInfo" in patch ? Boolean(patch.asrEnableSpeakerInfo) : prev.asrEnableSpeakerInfo,
          enablePunc: "asrEnablePunc" in patch ? Boolean(patch.asrEnablePunc) : prev.asrEnablePunc,
          enableItn: "asrEnableItn" in patch ? Boolean(patch.asrEnableItn) : prev.asrEnableItn,
          boostingTableName:
            "asrBoostingTableName" in patch ? String(patch.asrBoostingTableName ?? "") : prev.asrBoostingTableName,
          correctTableName:
            "asrCorrectTableName" in patch ? String(patch.asrCorrectTableName ?? "") : prev.asrCorrectTableName,
          context: "asrContext" in patch ? String(patch.asrContext ?? "") : prev.asrContext,
          apiKey: "asrApiKey" in patch ? String(patch.asrApiKey ?? "") : prev.asrApiKey,
          baseUrl: "asrBaseUrl" in patch ? String(patch.asrBaseUrl ?? "") : prev.asrBaseUrl,
          compatibleModel:
            "asrCompatibleModel" in patch ? String(patch.asrCompatibleModel ?? "") : prev.asrCompatibleModel,
        };
      }

      const activeAsrProviderConfig = getAsrProviderConfig(nextAsrProviderConfigs, nextAsrProvider);
      const nextProvider = patch.textRefineProvider ?? prev.textRefineProvider;
      const nextProviderConfigs = {
        ...prev.textRefineProviderConfigs,
        ...(patch.textRefineProviderConfigs ?? {}),
      };
      const touchedTextRefineFields =
        "textRefineApiKey" in patch ||
        "textRefineBaseUrl" in patch ||
        "textRefineModel" in patch;

      if (touchedTextRefineFields) {
        nextProviderConfigs[nextProvider] = {
          apiKey: "textRefineApiKey" in patch ? String(patch.textRefineApiKey ?? "") : prev.textRefineApiKey,
          baseUrl:
            "textRefineBaseUrl" in patch ? String(patch.textRefineBaseUrl ?? "") : prev.textRefineBaseUrl,
          model: "textRefineModel" in patch ? String(patch.textRefineModel ?? "") : prev.textRefineModel,
        };
      }

      const activeProviderConfig = getTextRefineProviderConfig(nextProviderConfigs, nextProvider);
      const next = {
        ...prev,
        ...patch,
        asrProvider: nextAsrProvider,
        asrProviderConfigs: nextAsrProviderConfigs,
        asrAppId: "asrAppId" in patch ? String(patch.asrAppId ?? "") : activeAsrProviderConfig.appId,
        asrAccessToken:
          "asrAccessToken" in patch ? String(patch.asrAccessToken ?? "") : activeAsrProviderConfig.accessToken,
        asrAccessSecret:
          "asrAccessSecret" in patch ? String(patch.asrAccessSecret ?? "") : activeAsrProviderConfig.accessSecret,
        asrCluster: "asrCluster" in patch ? String(patch.asrCluster ?? "") : activeAsrProviderConfig.cluster,
        asrAuthMethod:
          "asrAuthMethod" in patch ? String(patch.asrAuthMethod ?? "") : activeAsrProviderConfig.authMethod,
        asrWsUrl: "asrWsUrl" in patch ? String(patch.asrWsUrl ?? "") : activeAsrProviderConfig.wsUrl,
        asrResourceId:
          "asrResourceId" in patch ? String(patch.asrResourceId ?? "") : activeAsrProviderConfig.resourceId,
        asrFlashUrl:
          "asrFlashUrl" in patch ? String(patch.asrFlashUrl ?? "") : activeAsrProviderConfig.flashUrl,
        asrLanguage:
          "asrLanguage" in patch ? String(patch.asrLanguage ?? "") : activeAsrProviderConfig.language,
        asrModelVersion:
          "asrModelVersion" in patch ? String(patch.asrModelVersion ?? "") : activeAsrProviderConfig.modelVersion,
        asrSsdVersion:
          "asrSsdVersion" in patch ? String(patch.asrSsdVersion ?? "") : activeAsrProviderConfig.ssdVersion,
        asrCommonWords: "asrCommonWords" in patch ? patch.asrCommonWords ?? [] : activeAsrProviderConfig.commonWords,
        asrEnableChannelSplit:
          "asrEnableChannelSplit" in patch
            ? Boolean(patch.asrEnableChannelSplit)
            : activeAsrProviderConfig.enableChannelSplit,
        asrEnableDdc:
          "asrEnableDdc" in patch ? Boolean(patch.asrEnableDdc) : activeAsrProviderConfig.enableDdc,
        asrEnableSpeakerInfo:
          "asrEnableSpeakerInfo" in patch
            ? Boolean(patch.asrEnableSpeakerInfo)
            : activeAsrProviderConfig.enableSpeakerInfo,
        asrEnablePunc:
          "asrEnablePunc" in patch ? Boolean(patch.asrEnablePunc) : activeAsrProviderConfig.enablePunc,
        asrEnableItn:
          "asrEnableItn" in patch ? Boolean(patch.asrEnableItn) : activeAsrProviderConfig.enableItn,
        asrBoostingTableName:
          "asrBoostingTableName" in patch
            ? String(patch.asrBoostingTableName ?? "")
            : activeAsrProviderConfig.boostingTableName,
        asrCorrectTableName:
          "asrCorrectTableName" in patch
            ? String(patch.asrCorrectTableName ?? "")
            : activeAsrProviderConfig.correctTableName,
        asrContext: "asrContext" in patch ? String(patch.asrContext ?? "") : activeAsrProviderConfig.context,
        asrApiKey: "asrApiKey" in patch ? String(patch.asrApiKey ?? "") : activeAsrProviderConfig.apiKey,
        asrBaseUrl: "asrBaseUrl" in patch ? String(patch.asrBaseUrl ?? "") : activeAsrProviderConfig.baseUrl,
        asrCompatibleModel:
          "asrCompatibleModel" in patch
            ? String(patch.asrCompatibleModel ?? "")
            : activeAsrProviderConfig.compatibleModel,
        textRefineProvider: nextProvider,
        textRefineProviderConfigs: nextProviderConfigs,
        textRefineApiKey:
          "textRefineApiKey" in patch ? String(patch.textRefineApiKey ?? "") : activeProviderConfig.apiKey,
        textRefineBaseUrl:
          "textRefineBaseUrl" in patch ? String(patch.textRefineBaseUrl ?? "") : activeProviderConfig.baseUrl,
        textRefineModel:
          "textRefineModel" in patch ? String(patch.textRefineModel ?? "") : activeProviderConfig.model,
      };
      void window.volo.setRuntimeConfig(next);
      return next;
    });
  };

  const clearDebugLogs = () => {
    void window.volo.clearDebugLogs().then((res) => {
      if (!res?.ok) return;
      setDebugLogLines([]);
    });
  };

  const checkForUpdates = () => {
    void window.volo.checkForUpdates().then((res) => {
      if (!res?.state) return;
      setUpdateState(res.state);
    });
  };

  const downloadUpdate = () => {
    void window.volo.downloadUpdate().then((res) => {
      if (!res?.state) return;
      setUpdateState(res.state);
    });
  };

  const installUpdate = () => {
    void window.volo.installUpdate().then((res) => {
      if (!res?.state) return;
      setUpdateState(res.state);
    });
  };

  const toggleCaptureShortcutMode = () => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCaptureShortcutMode((prev) => !prev);
  };

  const requestPermissionAndRefresh = (kind: "microphone" | "accessibility") => {
    void window.volo.requestPermission({ kind }).then(() => {
      void window.volo.getPermissions().then((res) => {
        if (res?.ok) {
          setPermissions(res.permissions);
          if (kind === "microphone") {
            void refreshAudioInputDevices();
          }
        }
      });
    });
  };

  const openSystemSettings = (kind: "microphone" | "accessibility") => {
    void window.volo.openPermissions({ kind });
  };

  const isShortcutActive =
    shortcutPressed || stage === "arming" || stage === "recording";

  return (
    <div className="h-screen overflow-hidden bg-[#f4eee6] text-stone-900">
      <div className="mx-auto flex h-full max-w-[1420px] flex-col px-6 pb-6">
        {/* macOS hiddenInset title bar drag region */}
        <div
          className="shrink-0"
          style={{ height: 28, WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {showPermissionCenter ? (
          <PermissionCenter
            microphone={permissions.microphone}
            accessibility={permissions.accessibility}
            onRequestMicrophone={() => requestPermissionAndRefresh("microphone")}
            onRequestAccessibility={() => requestPermissionAndRefresh("accessibility")}
            onOpenSettings={openSystemSettings}
          />
        ) : null}

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[280px,1fr] gap-4">
          <div className="min-h-0 h-full">
            <AppSidebar
              active={section}
              onChange={(next) => {
                startTransition(() => {
                  setSection(next);
                });
              }}
            />
          </div>

          <div className="relative min-h-0 h-full">
            <ScrollArea
              viewportRef={contentViewportRef}
              className="h-full min-h-0 rounded-[18px] border border-white/60 bg-[rgba(244,239,232,0.82)] shadow-[0_6px_18px_rgba(44,31,18,0.05)]"
            >
              <main className="mx-auto min-h-full w-full max-w-[1120px] space-y-4 p-5">
                {section === "home" && (
                  <HomeModule
                    shortcut={shortcut}
                    shortcutFinishMode={runtimeConfig.shortcutFinishMode}
                    stats={stats}
                    translateEnabled={runtimeConfig.translateEnabled}
                    translateShortcut={translateShortcut}
                    translateTargetLanguage={runtimeConfig.translateTargetLanguage}
                  />
                )}

                {section === "history" && (
                  <HistoryModule
                    history={history}
                    onClearHistory={() => {
                      setHistory([]);
                      saveHistory([]);
                    }}
                  />
                )}

                {section === "dictionary" && (
                  <DictionaryModule
                    runtimeConfig={runtimeConfig}
                    onRuntimeConfigChange={updateRuntimeConfig}
                  />
                )}

                {section === "settings" && (
                  <SettingsModule
                    shortcut={shortcut}
                    platform={platform}
                    captureShortcutMode={captureShortcutMode}
                    shortcutFeedback={shortcutFeedback}
                    runtimeConfig={runtimeConfig}
                    audioInputDevices={audioInputDevices}
                    audioInputDevicesLoading={audioInputDevicesLoading}
                    microphonePermission={permissions.microphone}
                    stage={stage}
                    isShortcutActive={isShortcutActive}
                    registrationState={shortcutRegistrationState}
                    translateShortcut={translateShortcut}
                    captureTranslateShortcutMode={captureTranslateShortcutMode}
                    translateShortcutRegistrationState={translateShortcutRegistrationState}
                    onCaptureShortcut={toggleCaptureShortcutMode}
                    onCaptureTranslateShortcut={() => {
                      setCaptureTranslateShortcutMode((prev) => !prev);
                    }}
                    onRuntimeConfigChange={updateRuntimeConfig}
                    onRefreshAudioInputDevices={() => {
                      void refreshAudioInputDevices();
                    }}
                  />
                )}

                {section === "about" && (
                  <AboutModule
                    runtimeConfig={runtimeConfig}
                    updateState={updateState}
                    debugLogLines={debugLogLines}
                    debugLogPath={debugLogPath}
                    onCheckForUpdates={checkForUpdates}
                    onDownloadUpdate={downloadUpdate}
                    onInstallUpdate={installUpdate}
                    onClearDebugLogs={clearDebugLogs}
                    onRuntimeConfigChange={updateRuntimeConfig}
                  />
                )}
              </main>
            </ScrollArea>

          </div>
        </div>
      </div>
    </div>
  );
}
