import {
  AlertCircle,
  CheckCircle2,
  Keyboard,
  Radio,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { VoiceStage } from "../../shared/voiceRpc";
import type { ShortcutConfig, ShortcutFinishMode } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ShortcutGuideCardProps = {
  shortcut: ShortcutConfig;
  platform?: string;
  shortcutFinishMode: ShortcutFinishMode;
  captureShortcutMode: boolean;
  shortcutFeedback: string;
  stage: VoiceStage;
  isShortcutActive: boolean;
  registrationState: "idle" | "success" | "error";
  onCaptureShortcut: () => void;
  title?: string;
  className?: string;
};

function getShortcutKeys(shortcut: ShortcutConfig) {
  if (shortcut.kind === "fn") return ["Fn"];
  return shortcut.display.split(" + ");
}

function getStateMeta(
  shortcut: ShortcutConfig,
  platform: string,
  shortcutFinishMode: ShortcutFinishMode,
  captureShortcutMode: boolean,
  stage: VoiceStage,
  isShortcutActive: boolean,
  registrationState: "idle" | "success" | "error",
) {
  if (captureShortcutMode) {
    return {
      label: "等待新快捷键",
      description: platform === "darwin" ? "按下新的组合，或直接按 Fn。" : "按下新的组合。",
      dotClassName: "bg-amber-500",
      icon: Keyboard,
    };
  }

  if (stage === "transcribing") {
    return {
      label: "识别中",
      description: "正在处理语音。",
      dotClassName: "bg-stone-700",
      icon: WandSparkles,
    };
  }

  if (stage === "refining") {
    return {
      label: "润色中",
      description: "正在优化转写文本。",
      dotClassName: "bg-amber-600",
      icon: WandSparkles,
    };
  }

  if (stage === "recording" || stage === "arming" || isShortcutActive) {
    return {
      label: "快捷键已响应",
      description:
        shortcutFinishMode === "release"
          ? shortcut.kind === "fn"
            ? platform === "darwin"
              ? "松开即可结束。"
              : "Windows 不支持 Fn，建议改成 Ctrl/Alt 组合。"
            : "松开即可结束，必要时也可再按一次。"
          : "再次按下即可结束。",
      dotClassName: "bg-stone-950",
      icon: Radio,
    };
  }

  if (registrationState === "success") {
    return {
      label: "注册成功",
      description: "新的组合已生效。",
      dotClassName: "bg-emerald-500",
      icon: CheckCircle2,
    };
  }

  if (registrationState === "error") {
    return {
      label: "注册失败",
      description: "换一个组合再试。",
      dotClassName: "bg-rose-500",
      icon: AlertCircle,
    };
  }

  return {
    label: "已就绪",
    description:
      shortcutFinishMode === "release"
        ? shortcut.kind === "fn"
          ? platform === "darwin"
            ? "按住快捷键开始说话。"
            : "Fn 仅支持 macOS，Windows 建议使用 Ctrl + Shift + Space。"
          : "按住快捷键开始说话，应用外可再次按下结束。"
        : "按一次快捷键开始说话。",
    dotClassName: "bg-stone-400",
    icon: Sparkles,
  };
}

export function ShortcutGuideCard({
  shortcut,
  platform = "web",
  shortcutFinishMode,
  captureShortcutMode,
  shortcutFeedback,
  stage,
  isShortcutActive,
  registrationState,
  onCaptureShortcut,
  title = "快捷键",
  className,
}: ShortcutGuideCardProps) {
  const keys = getShortcutKeys(shortcut);
  const stateMeta = getStateMeta(
    shortcut,
    platform,
    shortcutFinishMode,
    captureShortcutMode,
    stage,
    isShortcutActive,
    registrationState,
  );
  const StateIcon = stateMeta.icon;
  const isEmphasized = captureShortcutMode || isShortcutActive || stage !== "idle";

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.64)] shadow-none",
        className,
      )}
    >
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl text-stone-950">{title}</CardTitle>
          <div className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-medium text-stone-700">
            <span className={cn("h-2.5 w-2.5 rounded-full", stateMeta.dotClassName)} />
            <StateIcon className="h-3.5 w-3.5 text-stone-500" />
            {stateMeta.label}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-t border-stone-200 pt-4">
          <div className="flex flex-wrap gap-3">
            {keys.map((key) => (
              <div
                key={key}
                className={cn(
                  "min-w-12 rounded-sm border px-4 py-3 text-center text-base font-semibold tracking-[0.08em] whitespace-nowrap",
                  isEmphasized
                    ? "border-amber-200 bg-[rgba(250,243,231,0.82)] text-stone-950"
                    : "border-stone-200 bg-[rgba(255,252,248,0.52)] text-stone-700",
                )}
              >
                {key}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-200 pt-4">
          <div className="text-sm font-medium text-stone-900 whitespace-nowrap">{stateMeta.description}</div>
          {captureShortcutMode || registrationState === "error" ? (
            <div
              className={cn(
                "mt-1 text-xs leading-6 whitespace-nowrap overflow-hidden text-ellipsis",
                registrationState === "error" ? "text-rose-700" : "text-amber-700",
              )}
            >
              {captureShortcutMode ? "按下新的组合，按 Esc 退出。" : shortcutFeedback}
            </div>
          ) : null}

          {!captureShortcutMode && platform !== "darwin" && shortcut.kind === "fn" ? (
            <div className="mt-1 text-xs leading-6 text-amber-700">
              Windows 暂不支持 Fn 作为全局快捷键，建议改成 `Ctrl + Shift + Space` 一类组合。
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={onCaptureShortcut}
            className="rounded-md bg-stone-950 px-5 text-stone-50 hover:bg-stone-950 hover:text-stone-50 whitespace-nowrap"
          >
            {captureShortcutMode ? "取消捕获" : "修改快捷键"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
