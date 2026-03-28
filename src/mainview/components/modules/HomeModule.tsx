import { Mic, Languages } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { ShortcutConfig, UsageStats } from "../../types";
import { TRANSLATE_TARGET_LANGUAGES } from "../../constants";

function formatMinutes(durationMs: number): string {
  const min = Math.round(durationMs / 60000);
  return `${min} min`;
}

function getShortcutKeys(shortcut: ShortcutConfig): string[] {
  if (shortcut.kind === "fn") return ["Fn"];
  return shortcut.display.split(" + ");
}

type HomeModuleProps = {
  shortcut: ShortcutConfig;
  shortcutFinishMode: "release" | "press-again";
  stats: UsageStats;
  translateEnabled: boolean;
  translateShortcut: ShortcutConfig;
  translateTargetLanguage: string;
};

export function HomeModule({
  shortcut,
  shortcutFinishMode,
  stats,
  translateEnabled,
  translateShortcut,
  translateTargetLanguage,
}: HomeModuleProps) {
  const inputKeys = getShortcutKeys(shortcut);
  const translateKeys = translateEnabled ? getShortcutKeys(translateShortcut) : [];
  const targetLangLabel =
    TRANSLATE_TARGET_LANGUAGES.find((l) => l.value === translateTargetLanguage)?.label || translateTargetLanguage;

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
              说完即走，不打断当前输入。按住{' '}
              <span className="font-medium text-stone-700">{shortcut.display}</span>{' '}
              {shortcutFinishMode === "release" ? "开始说话，松开结束" : "开始说话，再按一次结束"}。
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.64)] shadow-none">
          <CardContent className="space-y-4 pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-stone-950">
                <Mic className="h-4 w-4 text-stone-50" />
              </div>
              <div>
                <div className="text-sm font-medium text-stone-950">语音输入</div>
                <div className="text-xs text-stone-500">
                  {shortcutFinishMode === "release" ? "按住说话，松开结束" : "按一次开始，再按一次结束"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {inputKeys.map((key) => (
                <div
                  key={key}
                  className="min-w-10 rounded-sm border border-stone-200 bg-[rgba(255,252,248,0.52)] px-3 py-2 text-center text-sm font-semibold tracking-[0.06em] text-stone-700 whitespace-nowrap"
                >
                  {key}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`overflow-hidden rounded-[18px] border shadow-none ${
            translateEnabled
              ? "border-stone-200 bg-[rgba(246,243,238,0.64)]"
              : "border-dashed border-stone-300 bg-stone-50/50"
          }`}
        >
          <CardContent className="space-y-4 pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${
                  translateEnabled ? "bg-stone-950" : "bg-stone-200"
                }`}
              >
                <Languages className={`h-4 w-4 ${translateEnabled ? "text-stone-50" : "text-stone-400"}`} />
              </div>
              <div>
                <div className={`text-sm font-medium ${translateEnabled ? "text-stone-950" : "text-stone-400"}`}>
                  翻译
                </div>
                <div className="text-xs text-stone-500">
                  {translateEnabled
                    ? `翻译为${targetLangLabel}`
                    : "前往设置开启"}
                </div>
              </div>
            </div>
            {translateEnabled && translateKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {translateKeys.map((key) => (
                  <div
                    key={key}
                    className="min-w-10 rounded-sm border border-stone-200 bg-[rgba(255,252,248,0.52)] px-3 py-2 text-center text-sm font-semibold tracking-[0.06em] text-stone-700 whitespace-nowrap"
                  >
                    {key}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-stone-400">未配置快捷键</div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
