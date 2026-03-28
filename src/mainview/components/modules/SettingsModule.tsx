import { useState } from "react";
import type { VoiceStage } from "../../../shared/voiceRpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ASR_PROVIDER_OPTIONS,
  getAsrProviderConfig,
  getAsrProviderPreset,
  type AsrProvider,
} from "../../lib/asrProvider";
import {
  getTextRefineProviderConfig,
  getTextRefineProviderPreset,
  TEXT_REFINE_PROVIDER_OPTIONS,
  type TextRefineProvider,
} from "../../lib/textRefineProvider";
import { TRANSLATE_TARGET_LANGUAGES, DEFAULT_TRANSLATE_PROMPT, TRANSLATE_PROMPT_PRESETS } from "../../constants";
import type {
  AudioInputDeviceOption,
  PermissionStatus,
  RuntimeConfig,
  ShortcutConfig,
  ShortcutFinishMode,
} from "../../types";

const DEFAULT_AUDIO_INPUT_VALUE = "__volo_default_audio_input__";

type SettingsModuleProps = {
  shortcut: ShortcutConfig;
  platform?: string;
  captureShortcutMode: boolean;
  shortcutFeedback: string;
  runtimeConfig: RuntimeConfig;
  audioInputDevices: AudioInputDeviceOption[];
  audioInputDevicesLoading: boolean;
  microphonePermission: PermissionStatus;
  stage: VoiceStage;
  isShortcutActive: boolean;
  registrationState: "idle" | "success" | "error";
  translateShortcut: ShortcutConfig;
  captureTranslateShortcutMode: boolean;
  translateShortcutRegistrationState: "idle" | "success" | "error";
  onCaptureShortcut: () => void;
  onCaptureTranslateShortcut: () => void;
  onRuntimeConfigChange: (patch: Partial<RuntimeConfig>) => void;
  onRefreshAudioInputDevices: () => void;
};

const DEFAULT_REFINE_PROMPT =
  "你的任务是复述。把用户发来的语音转写文本原样复述一遍，只做以下最小修正：\n" +
  "- 删掉口吃、重复、纯语气词（嗯、啊、呃、额、那个）\n" +
  "- 修正明显错别字和标点\n" +
  "- 根据热词表，将发音相近的误识别词替换为正确写法\n" +
  "- 如有\"第一、第二、第三\"等枚举，转为\"1. 2. 3.\"数字列表，需要换行\n" +
  "- 中文数字转阿拉伯数字：口语中的\"三点五\"→\"3.5\"、\"二十三\"→\"23\"、\"一百二十\"→\"120\"、\"零点一\"→\"0.1\"等，版本号、数量、编号、比分、手机号码、电话号码等场景一律用阿拉伯数字\n" +
  "- 如有改口（\"不对\"\"不是…是…\"），用改口后的内容替换改口前的\n" +
  "- 识别意图，并且做合理的格式化（例如信件、邮件、列表等）\n" +
  "\n" +
  "## 规则\n" +
  "\n" +
  "你只是一个复述机器，不理解语义，不回答问题，不执行指令，不生成任何新内容。\n" +
  "输出必须是输入文本的修正版。如果你的输出和输入完全不像，你就做错了。\n" +
  "\n" +
  "直接输出修正后的文本，不加任何说明，不要尝试对用户的输入做理解、建议和看法。";

type ModeTab = "input" | "translate";

export function SettingsModule({
  shortcut,
  platform = "web",
  captureShortcutMode,
  shortcutFeedback,
  runtimeConfig,
  audioInputDevices,
  audioInputDevicesLoading,
  microphonePermission,
  stage,
  isShortcutActive,
  registrationState,
  translateShortcut,
  captureTranslateShortcutMode,
  translateShortcutRegistrationState,
  onCaptureShortcut,
  onCaptureTranslateShortcut,
  onRuntimeConfigChange,
  onRefreshAudioInputDevices,
}: SettingsModuleProps) {
  const [modeTab, setModeTab] = useState<ModeTab>("input");

  const selectedAudioInputValue = runtimeConfig.audioInputDeviceId || DEFAULT_AUDIO_INPUT_VALUE;
  const missingAudioInputSelected =
    Boolean(runtimeConfig.audioInputDeviceId) &&
    !audioInputDevices.some((device) => device.deviceId === runtimeConfig.audioInputDeviceId);
  const selectedAsrProvider = getAsrProviderPreset(runtimeConfig.asrProvider);
  const selectedTextRefineProvider = getTextRefineProviderPreset(runtimeConfig.textRefineProvider);

  const applyTextRefineProviderPreset = (provider: TextRefineProvider) => {
    const providerConfig = getTextRefineProviderConfig(runtimeConfig.textRefineProviderConfigs, provider);
    onRuntimeConfigChange({
      textRefineProvider: provider,
      textRefineApiKey: providerConfig.apiKey,
      textRefineBaseUrl: providerConfig.baseUrl,
      textRefineModel: providerConfig.model,
    });
  };

  const applyAsrProviderPreset = (provider: AsrProvider) => {
    const providerConfig = getAsrProviderConfig(runtimeConfig.asrProviderConfigs, provider);
    onRuntimeConfigChange({
      asrProvider: provider,
      asrAppId: providerConfig.appId,
      asrAccessToken: providerConfig.accessToken,
      asrAccessSecret: providerConfig.accessSecret,
      asrCluster: providerConfig.cluster,
      asrAuthMethod: providerConfig.authMethod,
      asrWsUrl: providerConfig.wsUrl,
      asrResourceId: providerConfig.resourceId,
      asrFlashUrl: providerConfig.flashUrl,
      asrLanguage: providerConfig.language,
      asrModelVersion: providerConfig.modelVersion,
      asrSsdVersion: providerConfig.ssdVersion,
      asrCommonWords: providerConfig.commonWords,
      asrEnableChannelSplit: providerConfig.enableChannelSplit,
      asrEnableDdc: providerConfig.enableDdc,
      asrEnableSpeakerInfo: providerConfig.enableSpeakerInfo,
      asrEnablePunc: providerConfig.enablePunc,
      asrEnableItn: providerConfig.enableItn,
      asrBoostingTableName: providerConfig.boostingTableName,
      asrCorrectTableName: providerConfig.correctTableName,
      asrContext: providerConfig.context,
      asrApiKey: providerConfig.apiKey,
      asrBaseUrl: providerConfig.baseUrl,
      asrCompatibleModel: providerConfig.compatibleModel,
    });
  };

  const shortcutFinishOptions: Array<{
    value: ShortcutFinishMode;
    title: string;
    description: string;
  }> = [
    {
      value: "release",
      title: "松开结束",
      description:
        shortcut.kind === "fn"
          ? "按住开始说话，松开时立即结束录音。"
          : "按住开始说话，松开优先结束；如果在应用外未识别到松开，也能再按一次结束。",
    },
    {
      value: "press-again",
      title: "再次触发结束",
      description: "按一次开始说话，再按一次结束录音。",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-5xl leading-none tracking-[-0.03em] text-stone-950">设置</h2>
        <p className="max-w-[36ch] text-sm leading-7 text-stone-600">调整快捷键与识别服务。</p>
      </div>

      {/* ── Mode-Specific Settings ── */}
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-stone-950">模式配置</h3>
        <p className="text-xs leading-6 text-stone-500">每个模式有独立的快捷键和提示词。</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {(["input", "translate"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setModeTab(tab)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors border-b-2",
              modeTab === tab
                ? "border-stone-950 text-stone-950"
                : "border-transparent text-stone-500 hover:text-stone-700"
            )}
          >
            {tab === "input" ? "语音输入" : "翻译"}
          </button>
        ))}
      </div>

      {/* Input Mode Tab */}
      {modeTab === "input" && (
        <div className="space-y-6">
          <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-950">快捷键</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="block text-sm text-stone-500">当前快捷键</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCaptureShortcut}
                    disabled={registrationState === "success"}
                    className={cn(
                      "rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]",
                      captureShortcutMode && "border-stone-950 bg-[rgba(255,252,248,0.8)]"
                    )}
                  >
                    {captureShortcutMode
                      ? "请按下新的快捷键…"
                      : registrationState === "success"
                        ? `✓ ${shortcut.display}`
                        : shortcut.display}
                  </Button>
                  {captureShortcutMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCaptureShortcut}
                      className="text-xs text-stone-500"
                    >
                      取消
                    </Button>
                  )}
                </div>
                <span className="mt-1 block text-xs leading-6 text-stone-500">
                  按住快捷键开始录音，根据下方设置松开或再按一次结束。
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-950">提示词</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">提示词</span>
                <Textarea
                  rows={8}
                  value={runtimeConfig.textRefinePrompt}
                  onChange={(e) => onRuntimeConfigChange({ textRefinePrompt: e.target.value })}
                  placeholder="输入提示词"
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                />
              </label>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRuntimeConfigChange({ textRefinePrompt: DEFAULT_REFINE_PROMPT })}
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
                >
                  恢复默认提示词
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Translate Mode Tab */}
      {modeTab === "translate" && (
        <div className="space-y-6">
          <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-950">快捷键</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="block text-sm text-stone-500">翻译快捷键</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCaptureTranslateShortcut}
                    disabled={translateShortcutRegistrationState === "success"}
                    className={cn(
                      "rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]",
                      captureTranslateShortcutMode && "border-stone-950 bg-[rgba(255,252,248,0.8)]"
                    )}
                  >
                    {captureTranslateShortcutMode
                      ? "请按下新的快捷键…"
                      : translateShortcutRegistrationState === "success"
                        ? `✓ ${translateShortcut.display}`
                        : translateShortcut.display}
                  </Button>
                  {captureTranslateShortcutMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onCaptureTranslateShortcut}
                      className="text-xs text-stone-500"
                    >
                      取消
                    </Button>
                  )}
                </div>
                <span className="mt-1 block text-xs leading-6 text-stone-500">
                  与语音输入使用不同的快捷键，互不干扰。
                </span>
              </div>

              <label className="text-sm">
                <span className="mb-1 block text-stone-500">目标语言</span>
                <Select
                  value={runtimeConfig.translateTargetLanguage || "English"}
                  onValueChange={(value) => onRuntimeConfigChange({ translateTargetLanguage: value })}
                >
                  <SelectTrigger className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]">
                    <SelectValue placeholder="选择目标语言" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATE_TARGET_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </CardContent>
          </Card>

          <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-950">提示词</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">翻译提示词</span>
                <Textarea
                  rows={6}
                  value={runtimeConfig.translatePrompt || ""}
                  onChange={(e) => onRuntimeConfigChange({ translatePrompt: e.target.value })}
                  placeholder={`使用 {language} 作为目标语言占位符`}
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-stone-500">提示词预设</span>
                <Select
                  value={
                    TRANSLATE_PROMPT_PRESETS.find((p) => p.prompt === runtimeConfig.translatePrompt)?.id || "__custom__"
                  }
                  onValueChange={(value) => {
                    if (value === "__custom__") return;
                    const preset = TRANSLATE_PROMPT_PRESETS.find((p) => p.id === value);
                    if (preset) {
                      onRuntimeConfigChange({ translatePrompt: preset.prompt });
                    }
                  }}
                >
                  <SelectTrigger className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]">
                    <SelectValue placeholder="选择预设" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATE_PROMPT_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.label} — {preset.description}
                      </SelectItem>
                    ))}
                    {!TRANSLATE_PROMPT_PRESETS.some((p) => p.prompt === runtimeConfig.translatePrompt) && (
                      <SelectItem value="__custom__">自定义</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <span className="mt-1 block text-xs leading-6 text-stone-500">
                  选择预设会自动替换上方提示词，你仍可继续手动编辑。
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRuntimeConfigChange({ translatePrompt: "" })}
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
                >
                  恢复默认
                </Button>
              </div>

              <div className="rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-xs leading-6 text-stone-500">
                提示词中用 <code className="rounded bg-stone-200 px-1 py-0.5">{'{language}'}</code> 引用目标语言。
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Shared Settings ── */}
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-stone-950">通用设置</h3>
        <p className="text-xs leading-6 text-stone-500">以下配置对语音输入和翻译模式同时生效。</p>
      </div>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">录音结束方式</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {shortcutFinishOptions.map((option) => {
            const active = runtimeConfig.shortcutFinishMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRuntimeConfigChange({ shortcutFinishMode: option.value })}
                className={cn(
                  "rounded-[18px] border px-4 py-4 text-left transition-colors",
                  active
                    ? "border-stone-950 bg-[rgba(255,252,248,0.8)]"
                    : "border-stone-200 bg-[rgba(255,252,248,0.42)] hover:bg-[rgba(250,246,240,0.7)]"
                )}
              >
                <div className="text-sm font-medium text-stone-950">{option.title}</div>
                <div className="mt-1 text-xs leading-6 text-stone-500">{option.description}</div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">麦克风</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">输入设备</span>
            <Select
              value={selectedAudioInputValue}
              onValueChange={(value) =>
                onRuntimeConfigChange({
                  audioInputDeviceId: value === DEFAULT_AUDIO_INPUT_VALUE ? "" : value,
                })
              }
            >
              <SelectTrigger className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]">
                <SelectValue
                  placeholder={
                    microphonePermission === "granted"
                      ? "选择麦克风"
                      : platform === "darwin"
                        ? "请先授权麦克风权限"
                        : "如列表为空，请检查系统麦克风权限"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_AUDIO_INPUT_VALUE}>系统默认麦克风</SelectItem>
                {audioInputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
                {missingAudioInputSelected ? (
                  <SelectItem value={runtimeConfig.audioInputDeviceId}>
                    当前设备不可用，录音时将回退默认
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-sm">
            <div className="space-y-1">
              <div className="font-medium text-stone-950">
                {audioInputDevicesLoading ? "正在读取设备列表" : `已发现 ${audioInputDevices.length} 个可选麦克风`}
              </div>
              <div className="text-xs leading-6 text-stone-500">
                {microphonePermission === "granted"
                  ? missingAudioInputSelected
                    ? "之前选择的麦克风当前不可用，实际录音会先回退到系统默认设备。"
                    : "插拔设备后可点击刷新，新的麦克风会出现在列表里。"
                  : platform === "darwin"
                    ? "没有麦克风权限时，系统可能无法返回完整设备名称。"
                    : "如果系统层面禁用了麦克风访问，设备列表或录音都会异常。"}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRefreshAudioInputDevices}
              className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
            >
              刷新列表
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">识别服务</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="text-sm">
            <span className="mb-1 block text-stone-500">Provider</span>
            <Select
              value={selectedAsrProvider.id}
              onValueChange={(value) => applyAsrProviderPreset(value as AsrProvider)}
            >
              <SelectTrigger className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]">
                <SelectValue placeholder="选择语音识别服务" />
              </SelectTrigger>
              <SelectContent>
                {ASR_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="mt-1 block text-xs leading-6 text-stone-500">
              {selectedAsrProvider.description}
            </span>
          </label>

          {!selectedAsrProvider.supported ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
              当前版本只有豆包 ASR 已正式接入。你可以先保存这套兼容配置，但切换到这个 provider 后，识别链路仍然会提示"暂未接入"。
            </div>
          ) : (
            <div className="rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-xs leading-6 text-stone-500">
              豆包语音识别使用 Flash 模式（短语音一次性上传）。填写 APPID、Access Token、Secret Key 即可开始使用。
            </div>
          )}

          {selectedAsrProvider.id === "doubao" ? (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">APPID</span>
                  <Input
                    type="text"
                    value={runtimeConfig.asrAppId}
                    onChange={(e) => onRuntimeConfigChange({ asrAppId: e.target.value })}
                    placeholder="输入 APPID"
                    className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Access Token</span>
                  <Input
                    type="text"
                    value={runtimeConfig.asrAccessToken}
                    onChange={(e) => onRuntimeConfigChange({ asrAccessToken: e.target.value })}
                    placeholder="输入 Access Token"
                    className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Secret Key</span>
                  <Input
                    type="text"
                    value={runtimeConfig.asrAccessSecret}
                    onChange={(e) => onRuntimeConfigChange({ asrAccessSecret: e.target.value })}
                    placeholder="输入 Secret Key"
                    className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                  />
                </label>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-xs text-stone-500 hover:text-stone-700">
                  高级设置
                </summary>
                <div className="mt-3 space-y-4">
                  <label className="text-sm">
                    <span className="mb-1 block text-stone-500">Flash URL</span>
                    <Input
                      type="text"
                      value={runtimeConfig.asrFlashUrl}
                      onChange={(e) => onRuntimeConfigChange({ asrFlashUrl: e.target.value })}
                      placeholder="https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash"
                      className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                    />
                    <span className="mt-1 block text-xs leading-6 text-stone-500">
                      默认使用 bigmodel_flash 接口，如需更换可自定义。
                    </span>
                  </label>
                </div>
              </details>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">API Key</span>
                <Input
                  type="text"
                  value={runtimeConfig.asrApiKey}
                  onChange={(e) => onRuntimeConfigChange({ asrApiKey: e.target.value })}
                  placeholder="输入兼容接口的 API Key"
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Base URL</span>
                <Input
                  type="text"
                  value={runtimeConfig.asrBaseUrl}
                  onChange={(e) => onRuntimeConfigChange({ asrBaseUrl: e.target.value })}
                  placeholder="输入识别接口 Base URL"
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Model</span>
                <Input
                  type="text"
                  value={runtimeConfig.asrCompatibleModel}
                  onChange={(e) => onRuntimeConfigChange({ asrCompatibleModel: e.target.value })}
                  placeholder="输入模型名"
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">AI 服务配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-sm">
            <span className="space-y-1">
              <span className="block font-medium text-stone-950">启用 AI 处理</span>
              <span className="block text-xs leading-6 text-stone-500">
                走 OpenAI-compatible `chat/completions`，用于文本修正和翻译。
              </span>
            </span>
            <Switch
              checked={runtimeConfig.textRefineEnabled}
              onCheckedChange={(checked) => onRuntimeConfigChange({ textRefineEnabled: checked })}
              className="data-[state=checked]:bg-stone-900 data-[state=unchecked]:bg-stone-200"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-stone-500">Provider 预设</span>
            <Select
              value={selectedTextRefineProvider.id}
              onValueChange={(value) => applyTextRefineProviderPreset(value as TextRefineProvider)}
            >
              <SelectTrigger className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]">
                <SelectValue placeholder="选择 Provider" />
              </SelectTrigger>
              <SelectContent>
                {TEXT_REFINE_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="mt-1 block text-xs leading-6 text-stone-500">
              {selectedTextRefineProvider.description}
            </span>
          </label>

          <div className="grid gap-4 xl:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">API Key</span>
              <Input
                type="text"
                value={runtimeConfig.textRefineApiKey}
                onChange={(e) => onRuntimeConfigChange({ textRefineApiKey: e.target.value })}
                placeholder="输入 API Key"
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Base URL</span>
              <Input
                type="text"
                value={runtimeConfig.textRefineBaseUrl}
                onChange={(e) => onRuntimeConfigChange({ textRefineBaseUrl: e.target.value })}
                placeholder="输入兼容 OpenAI 的 Base URL"
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-stone-500">Model</span>
              <Input
                type="text"
                value={runtimeConfig.textRefineModel}
                onChange={(e) => onRuntimeConfigChange({ textRefineModel: e.target.value })}
                placeholder="输入模型名"
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)]"
              />
            </label>
          </div>

          <div className="rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-xs leading-6 text-stone-500">
            此配置被「语音输入」和「翻译」两个模式共用。切换预设会自动填入推荐的 Base URL 和 Model；你仍然可以继续手动覆盖。
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
