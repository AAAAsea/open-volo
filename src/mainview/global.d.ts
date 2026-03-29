import type { ShortcutPayload, VoiceStage } from "../shared/voiceRpc";
import type { DebugState, PermissionStatus, RuntimeConfig, ShortcutFinishMode, UpdateState } from "./types";

declare global {
  interface Window {
    volo: {
      isMock?: boolean;
      platform: string;
      setShortcut(payload: ShortcutPayload): Promise<{ ok: boolean; error?: string }>;
      setTranslateShortcut(payload: ShortcutPayload): Promise<{ ok: boolean; error?: string }>;
      beginShortcutCapture(): Promise<{ ok: boolean }>;
      endShortcutCapture(): Promise<{ ok: boolean }>;
      startShortcutHold(payload: { source: "window-hotkey" | "button" }): Promise<{ ok: boolean }>;
      endShortcutHold(payload: { source: "window-hotkey" | "button" }): Promise<{ ok: boolean }>;
      endTranslateHold(payload: { source: "window-hotkey" | "button" }): Promise<{ ok: boolean }>;
      cancelRecording(payload: { source: "escape" | "button" }): Promise<{ ok: boolean }>;
      getRuntimeConfig(): Promise<{
        ok: boolean;
        config: RuntimeConfig;
      }>;
      getDebugState(): Promise<{
        ok: boolean;
        enabled: DebugState["enabled"];
        logPath: DebugState["logPath"];
        lines: DebugState["lines"];
      }>;
      getUpdateState(): Promise<{
        ok: boolean;
        state: UpdateState;
      }>;
      checkForUpdates(): Promise<{
        ok: boolean;
        error?: string;
        state: UpdateState;
      }>;
      downloadUpdate(): Promise<{
        ok: boolean;
        error?: string;
        state: UpdateState;
      }>;
      installUpdate(): Promise<{
        ok: boolean;
        error?: string;
        state: UpdateState;
      }>;
      clearDebugLogs(): Promise<{ ok: boolean }>;
      setRuntimeConfig(payload: Partial<RuntimeConfig>): Promise<{
        ok: boolean;
        error?: string;
        config: RuntimeConfig;
      }>;
      triggerShortcut(payload: { source: "button" }): Promise<{ ok: boolean }>;
      setShortcutPreviewMode(payload: { enabled: boolean }): Promise<{ ok: boolean }>;
      reportAudioLevel(payload: { level: number }): void;
      reportAudioSpectrum(payload: { level: number; low: number; mid: number; high: number }): void;
      notifyCaptureReady(): void;
      notifyCaptureFailed(): void;
      submitAudio(payload: {
        sessionId: string;
        data: ArrayBuffer;
        durationMs: number;
        sampleRate: number;
        channels: number;
      }): Promise<{ ok: boolean; error?: string; audioPath?: string }>;
      getPermissions(): Promise<{
        ok: boolean;
        permissions: {
          microphone: PermissionStatus;
          accessibility: PermissionStatus;
        };
      }>;
      requestPermission(payload: {
        kind: "microphone" | "accessibility";
      }): Promise<{ ok: boolean; status: PermissionStatus }>;
      openPermissions(payload: {
        kind: "microphone" | "accessibility";
      }): Promise<{ ok: boolean }>;
      onPermissions(
        handler: (payload: {
          microphone: PermissionStatus;
          accessibility: PermissionStatus;
        }) => void,
      ): () => void;
      onAudioRequest(handler: (payload: { sessionId: string }) => void): () => void;
      onInputHint(handler: (payload: { message: string }) => void): () => void;
      onStatus(handler: (payload: { stage: VoiceStage; hint: string }) => void): () => void;
      onAudioLevel(handler: (payload: { level: number }) => void): () => void;
      onTranscription(
        handler: (payload: {
          text: string;
          originalText?: string;
          refinedText?: string;
          audioPath: string;
          durationMs: number;
          mode?: "input" | "translate";
        }) => void,
      ): () => void;
      onShortcutApplied(
        handler: (payload: {
          accelerator: string;
          display: string;
          kind?: "standard" | "fn";
          ok: boolean;
          error?: string;
        }) => void,
      ): () => void;
      onShortcutCaptured(
        handler: (payload: {
          accelerator: string;
          display: string;
          kind?: "standard" | "fn";
        }) => void,
      ): () => void;
      onShortcutPreview(
        handler: (payload: {
          display: string;
        }) => void,
      ): () => void;
      onTranslateShortcutApplied(
        handler: (payload: {
          accelerator: string;
          display: string;
          ok: boolean;
          error?: string;
        }) => void,
      ): () => void;
      onDebugLogEntry(handler: (payload: { line: string }) => void): () => void;
      onDebugLogsCleared(handler: () => void): () => void;
      onUpdateState(handler: (payload: UpdateState) => void): () => void;
      debugLog(payload: { level: "info" | "warn" | "error"; message: string; detail?: unknown }): void;
    };
  }
}

export {};
