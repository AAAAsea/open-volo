export type VoiceStage = "idle" | "arming" | "recording" | "transcribing" | "refining";
export type ShortcutFinishMode = "release" | "press-again";

export type ShortcutPayload = {
  accelerator: string;
  display: string;
  kind?: "standard" | "fn";
};

export type VoiceRpcSchema = {
  bun: {
    requests: {
      setShortcut: {
        params: ShortcutPayload;
        response: { ok: boolean; error?: string };
      };
      beginShortcutCapture: {
        params: Record<string, never>;
        response: { ok: boolean };
      };
      endShortcutCapture: {
        params: Record<string, never>;
        response: { ok: boolean };
      };
      startShortcutHold: {
        params: { source: "window-hotkey" | "button" };
        response: { ok: boolean };
      };
      endShortcutHold: {
        params: { source: "window-hotkey" | "button" };
        response: { ok: boolean };
      };
      cancelRecording: {
        params: { source: "escape" | "button" };
        response: { ok: boolean };
      };
      getRuntimeConfig: {
        params: Record<string, never>;
        response: {
          ok: boolean;
          config: {
            cancelShortcut: string;
            shortcutFinishMode: ShortcutFinishMode;
            audioInputDeviceId: string;
            asrAppId: string;
            asrAccessToken: string;
            asrAccessSecret: string;
            asrCluster: string;
            asrAuthMethod: string;
            asrWsUrl: string;
            textRefineEnabled: boolean;
            textRefineProvider: string;
            textRefineProviderConfigs: Record<string, { apiKey: string; baseUrl: string; model: string }>;
            textRefineApiKey: string;
            textRefineBaseUrl: string;
            textRefineModel: string;
          };
        };
      };
      setRuntimeConfig: {
        params: {
          cancelShortcut?: string;
          shortcutFinishMode?: ShortcutFinishMode;
          audioInputDeviceId?: string;
          asrAppId?: string;
          asrAccessToken?: string;
          asrAccessSecret?: string;
          asrCluster?: string;
          asrAuthMethod?: string;
          asrWsUrl?: string;
          textRefineEnabled?: boolean;
          textRefineProvider?: string;
          textRefineProviderConfigs?: Record<string, { apiKey: string; baseUrl: string; model: string }>;
          textRefineApiKey?: string;
          textRefineBaseUrl?: string;
          textRefineModel?: string;
        };
        response: {
          ok: boolean;
          error?: string;
          config: {
            cancelShortcut: string;
            shortcutFinishMode: ShortcutFinishMode;
            audioInputDeviceId: string;
            asrAppId: string;
            asrAccessToken: string;
            asrAccessSecret: string;
            asrCluster: string;
            asrAuthMethod: string;
            asrWsUrl: string;
            textRefineEnabled: boolean;
            textRefineProvider: string;
            textRefineProviderConfigs: Record<string, { apiKey: string; baseUrl: string; model: string }>;
            textRefineApiKey: string;
            textRefineBaseUrl: string;
            textRefineModel: string;
          };
        };
      };
      triggerShortcut: {
        params: { source: "button" };
        response: { ok: boolean };
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      status: {
        stage: VoiceStage;
        hint: string;
      };
      audioLevel: {
        level: number;
      };
      transcription: {
        text: string;
        originalText?: string;
        refinedText?: string;
        audioPath: string;
        durationMs: number;
      };
      shortcutApplied: {
        accelerator: string;
        display: string;
        ok: boolean;
        error?: string;
      };
      shortcutCaptured: {
        accelerator: string;
        display: string;
        kind?: "standard" | "fn";
      };
    };
  };
};
