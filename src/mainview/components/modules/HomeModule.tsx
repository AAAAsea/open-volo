import type { VoiceStage } from "../../../shared/voiceRpc";
import { ShortcutGuideCard } from "@/components/ShortcutGuideCard";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { ShortcutConfig, ShortcutFinishMode, UsageStats } from "../../types";

function formatMinutes(durationMs: number): string {
  const min = Math.round(durationMs / 60000);
  return `${min} min`;
}

type HomeModuleProps = {
  shortcut: ShortcutConfig;
  platform?: string;
  shortcutFinishMode: ShortcutFinishMode;
  shortcutBehaviorCopy: string;
  stats: UsageStats;
  shortcutFeedback: string;
  captureShortcutMode: boolean;
  stage: VoiceStage;
  isShortcutActive: boolean;
  registrationState: "idle" | "success" | "error";
  onCaptureShortcut: () => void;
};

export function HomeModule({
  shortcut,
  platform = "web",
  shortcutFinishMode,
  shortcutBehaviorCopy,
  stats,
  shortcutFeedback,
  captureShortcutMode,
  stage,
  isShortcutActive,
  registrationState,
  onCaptureShortcut,
}: HomeModuleProps) {
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.64)] shadow-none">
        <CardContent className="flex min-h-[420px] flex-col justify-between gap-10 pt-6">
          <div className="space-y-4">
            <CardTitle className="font-serif text-5xl leading-[0.9] tracking-[-0.035em] text-stone-950 lg:text-7xl">
              自然说话，精准落字。
            </CardTitle>
          </div>

          <div className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <div className="text-sm leading-7 text-stone-500">
              说完即走，不打断当前输入。{shortcutBehaviorCopy}
            </div>
            <div className="min-w-0 sm:border-l sm:border-stone-200 sm:pl-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400 whitespace-nowrap">总口述时长</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 whitespace-nowrap">
                {formatMinutes(stats.totalDurationMs)}
              </div>
            </div>
            <div className="min-w-0 sm:border-l sm:border-stone-200 sm:pl-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400 whitespace-nowrap">口述字数</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 whitespace-nowrap">
                {stats.totalChars}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShortcutGuideCard
        shortcut={shortcut}
        platform={platform}
        shortcutFinishMode={shortcutFinishMode}
        captureShortcutMode={captureShortcutMode}
        shortcutFeedback={shortcutFeedback}
        stage={stage}
        isShortcutActive={isShortcutActive}
        registrationState={registrationState}
        onCaptureShortcut={onCaptureShortcut}
        title="快捷键"
      />
    </section>
  );
}
