import logoUrl from "../../../../assets/branding/volo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { renderReleaseNotesToHtml } from "../../lib/releaseNotes";
import { Textarea } from "@/components/ui/textarea";
import type { RuntimeConfig, UpdateState } from "../../types";

const REPO_URL = "https://github.com/AAAAsea/open-volo";
const RELEASES_URL = `${REPO_URL}/releases`;

type AboutModuleProps = {
  runtimeConfig: RuntimeConfig;
  updateState: UpdateState;
  debugLogLines: string[];
  debugLogPath: string;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
  onClearDebugLogs: () => void;
  onRuntimeConfigChange: (patch: Partial<RuntimeConfig>) => void;
};

function formatTime(value: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AboutModule({
  runtimeConfig,
  updateState,
  debugLogLines,
  debugLogPath,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  onClearDebugLogs,
  onRuntimeConfigChange,
}: AboutModuleProps) {
  const updateStatusCopy = {
    idle: "可手动检查新版本，应用也会在后台定时检查。",
    checking: "正在检查 GitHub Release 中是否有新版本。",
    available: `发现新版本 ${updateState.latestVersion || ""}，可以开始下载。`.trim(),
    downloading: "正在下载更新包，完成后可安装。",
    downloaded: "更新已下载完成。点击「退出并安装」后，请手动重新打开应用。",
    installing: "正在退出并安装更新，请手动重新打开应用。",
    "up-to-date": "当前已经是最新版本。",
    error: updateState.error || "检查更新失败，请稍后再试。",
    unsupported: updateState.error || "当前环境暂不支持端内更新。",
  } satisfies Record<UpdateState["status"], string>;
  const hasReleaseNotes = Boolean(updateState.releaseNotes.trim());
  const renderedReleaseNotes = hasReleaseNotes
    ? renderReleaseNotesToHtml(updateState.releaseNotes)
    : "";

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-5xl leading-none tracking-[-0.03em] text-stone-950">关于</h2>
        <p className="max-w-[42ch] text-sm leading-7 text-stone-600">
          了解应用版本、更新状态与调试信息。
        </p>
      </div>

      <Card className="overflow-hidden rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.64)] shadow-none">
        <CardContent className="pt-6">
          <div className="grid gap-6 lg:grid-cols-[168px,1fr] lg:items-center">
            <div className="flex justify-center lg:justify-start">
              <img
                src={logoUrl}
                alt="Volo icon"
                decoding="async"
                className="h-32 w-32 rounded-[30px] object-cover shadow-[0_22px_40px_rgba(74,52,33,0.18)]"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="inline-flex rounded-full border border-stone-200 bg-[rgba(255,252,248,0.72)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  Open Volo
                </div>
                <div className="font-serif text-5xl leading-[0.94] tracking-[-0.04em] text-stone-950">
                  Volo
                </div>
                <div className="max-w-[44ch] text-sm leading-7 text-stone-600">
                  桌面语音输入应用。按住说话，转写后回填到当前输入场景。
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[16px] border border-stone-200 bg-[rgba(255,252,248,0.62)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400">版本</div>
                  <div className="mt-2 text-lg font-semibold text-stone-950">
                    {updateState.currentVersion || "0.1.0"}
                  </div>
                </div>
                <div className="rounded-[16px] border border-stone-200 bg-[rgba(255,252,248,0.62)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400">仓库</div>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate text-sm font-medium text-stone-900 underline decoration-stone-300 underline-offset-4"
                  >
                    AAAAsea/open-volo
                  </a>
                </div>
                <div className="rounded-[16px] border border-stone-200 bg-[rgba(255,252,248,0.62)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-400">作者</div>
                  <div className="mt-2 text-sm font-medium text-stone-900">AAAAsea</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">应用更新</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-stone-950">
                  当前版本 {updateState.currentVersion || "未知版本"}
                </div>
                <div className="text-xs leading-6 text-stone-500">{updateStatusCopy[updateState.status]}</div>
              </div>
              <div className="text-right text-[11px] leading-5 text-stone-400">
                <div>最近检查：{formatTime(updateState.lastCheckedAt)}</div>
                <div>发布时间：{formatTime(updateState.releaseDate)}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-xs leading-6 text-stone-500 xl:grid-cols-2">
              <div>最新版本：{updateState.latestVersion || "尚未发现更新"}</div>
              <div>来源：{updateState.supported ? "GitHub Releases" : "当前环境不支持自动更新"}</div>
            </div>

            {updateState.downloading || updateState.downloaded ? (
              <div className="mt-4 space-y-2">
                <Progress
                  value={Math.max(0, Math.min(100, updateState.downloadPercent))}
                  className="h-2 bg-stone-200 [&>div]:bg-stone-900"
                />
                <div className="flex items-center justify-between text-[11px] leading-5 text-stone-400">
                  <span>{Math.round(updateState.downloadPercent)}%</span>
                  <span>
                    {updateState.totalBytes > 0
                      ? `${(updateState.downloadedBytes / 1024 / 1024).toFixed(1)} / ${(updateState.totalBytes / 1024 / 1024).toFixed(1)} MB`
                      : "等待下载信息"}
                  </span>
                </div>
              </div>
            ) : null}

            {hasReleaseNotes ? (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-stone-950">发布说明</div>
                <div
                  className="max-h-[280px] overflow-y-auto rounded-md border border-stone-200 bg-[rgba(250,247,242,0.9)] px-4 py-3 text-xs leading-6 text-stone-700 [&_a]:underline [&_a]:decoration-stone-300 [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[rgba(120,100,82,0.08)] [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[rgba(120,100,82,0.08)] [&_pre]:p-3 [&_ul]:space-y-1"
                  dangerouslySetInnerHTML={{ __html: renderedReleaseNotes }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-[16px] border border-stone-200 bg-[rgba(250,247,242,0.72)] px-4 py-3 text-xs leading-6 text-stone-500">
                当前 Release 没有附带可读的详细说明。可以前往 GitHub Releases 查看完整发布页。
              </div>
            )}

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Button
                asChild
                type="button"
                variant="outline"
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
              >
                <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                  查看 Releases
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCheckForUpdates}
                disabled={updateState.status === "checking" || updateState.status === "installing"}
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
              >
                {updateState.status === "checking" ? "检查中..." : "检查更新"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onDownloadUpdate}
                disabled={
                  !updateState.supported ||
                  !updateState.updateAvailable ||
                  updateState.downloading ||
                  updateState.downloaded ||
                  updateState.status === "installing"
                }
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
              >
                {updateState.downloading ? "下载中..." : "下载更新"}
              </Button>
              <Button
                type="button"
                onClick={onInstallUpdate}
                disabled={!updateState.downloaded || updateState.status === "installing"}
                className="rounded-md bg-stone-950 text-stone-50 hover:bg-stone-800"
              >
                {updateState.status === "installing" ? "安装中..." : "退出并安装"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[18px] border-stone-200 bg-[rgba(246,243,238,0.56)] shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-950">Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] px-4 py-3 text-sm">
            <span className="space-y-1">
              <span className="block font-medium text-stone-950">启用 Debug 模式</span>
              <span className="block text-xs leading-6 text-stone-500">
                打开后会持续记录主进程与渲染层日志，适合排查线上问题。
              </span>
            </span>
            <Switch
              checked={runtimeConfig.debugEnabled}
              onCheckedChange={(checked) => onRuntimeConfigChange({ debugEnabled: checked })}
              className="data-[state=checked]:bg-stone-900 data-[state=unchecked]:bg-stone-200"
            />
          </label>

          <div className="space-y-2 rounded-[18px] border border-stone-200 bg-[rgba(255,252,248,0.42)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-950">实时日志</div>
                <div className="text-xs leading-6 text-stone-500">
                  {runtimeConfig.debugEnabled
                    ? `已收集 ${debugLogLines.length} 条日志`
                    : "打开开关后会开始实时收集日志"}
                </div>
              </div>
              <div className="text-[11px] leading-5 text-stone-400">
                {debugLogPath ? `文件：${debugLogPath}` : "日志文件路径将在桌面端生成"}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClearDebugLogs}
                className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
              >
                清空日志
              </Button>
            </div>

            <Textarea
              readOnly
              rows={12}
              value={
                debugLogLines.length > 0
                  ? debugLogLines.join("\n")
                  : runtimeConfig.debugEnabled
                    ? "等待新的日志输出..."
                    : "Debug 模式未开启。"
              }
              className="min-h-[260px] resize-none rounded-md border-stone-200 bg-[rgba(250,247,242,0.9)] font-mono text-[11px] leading-5 text-stone-700"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
