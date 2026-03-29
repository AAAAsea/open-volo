import logoUrl from "../../../../assets/branding/volo.png";
import { CheckCheck, Download, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
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

function getUpdateHeadline(updateState: UpdateState) {
  switch (updateState.status) {
    case "checking":
      return "正在检查更新";
    case "available":
      return `发现新版本 ${updateState.latestVersion || ""}`.trim();
    case "downloading":
      return `正在下载 ${updateState.latestVersion || "更新包"}`.trim();
    case "downloaded":
      return `${updateState.latestVersion || "新版本"} 已准备安装`;
    case "installing":
      return "正在安装更新";
    case "up-to-date":
      return "当前已是最新版本";
    case "error":
      return "更新检查失败";
    case "unsupported":
      return "当前环境不支持自动更新";
    default:
      return "应用更新";
  }
}

function getStatusTone(status: UpdateState["status"]) {
  switch (status) {
    case "up-to-date":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
        panel: "border-emerald-200 bg-[#f4fbf6]",
      };
    case "available":
    case "downloaded":
      return {
        badge: "border-stone-300 bg-stone-950 text-stone-50",
        panel: "border-stone-200 bg-[rgba(255,252,248,0.88)]",
      };
    case "checking":
    case "downloading":
    case "installing":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-900",
        panel: "border-amber-200 bg-[#fcf7ec]",
      };
    case "error":
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-800",
        panel: "border-rose-200 bg-[#fff6f5]",
      };
    default:
      return {
        badge: "border-stone-200 bg-[rgba(255,252,248,0.8)] text-stone-700",
        panel: "border-stone-200 bg-[rgba(255,252,248,0.88)]",
      };
  }
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
    idle: "启动时会自动检查一次更新，之后每 24 小时检查一次。",
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
  const statusTone = getStatusTone(updateState.status);
  const updateHeadline = getUpdateHeadline(updateState);
  const showCheckingIndicator = updateState.status === "checking";
  const showDownloadButton =
    updateState.supported &&
    updateState.updateAvailable &&
    !updateState.downloading &&
    !updateState.downloaded &&
    updateState.status !== "installing";
  const showInstallButton = updateState.downloaded || updateState.status === "installing";

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
          <div className={`rounded-[18px] border p-5 ${statusTone.panel}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusTone.badge}`}>
                  {showCheckingIndicator ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : updateState.status === "up-to-date" ? (
                    <CheckCheck className="h-3.5 w-3.5" />
                  ) : updateState.status === "available" || updateState.status === "downloaded" ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : updateState.status === "downloading" || updateState.status === "installing" ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {updateState.status === "up-to-date"
                      ? "已同步"
                      : updateState.status === "checking"
                        ? "检查中"
                        : updateState.status === "downloading"
                          ? "下载中"
                          : updateState.status === "downloaded"
                            ? "可安装"
                            : updateState.status === "installing"
                              ? "安装中"
                              : updateState.status === "available"
                                ? "发现更新"
                                : updateState.status === "error"
                                  ? "检查失败"
                                  : updateState.status === "unsupported"
                                    ? "不可用"
                                    : "更新"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-semibold tracking-tight text-stone-950 md:text-[30px]">
                    {updateHeadline}
                  </div>
                  <div className="max-w-[48ch] text-sm leading-7 text-stone-600">
                    {updateStatusCopy[updateState.status]}
                  </div>
                </div>
              </div>

              <div className="grid min-w-[230px] gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-stone-200 bg-[rgba(255,252,248,0.72)] px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-400">当前版本</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
                    {updateState.currentVersion || "未知版本"}
                  </div>
                </div>
                <div className="rounded-[14px] border border-stone-200 bg-[rgba(255,252,248,0.72)] px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-stone-400">
                    {updateState.status === "up-to-date" ? "已安装版本" : "最新版本"}
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
                    {updateState.latestVersion || updateState.currentVersion || "未检查"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-md border border-stone-200 bg-[rgba(255,252,248,0.72)] px-3 py-1.5 text-sm text-stone-600">
                最近检查：{formatTime(updateState.lastCheckedAt)}
              </div>
              {updateState.releaseDate ? (
                <div className="rounded-md border border-stone-200 bg-[rgba(255,252,248,0.72)] px-3 py-1.5 text-sm text-stone-600">
                  发布日期：{formatTime(updateState.releaseDate)}
                </div>
              ) : null}
              <div className="rounded-md border border-stone-200 bg-[rgba(255,252,248,0.72)] px-3 py-1.5 text-sm text-stone-600">
                自动检查：启动时 / 每 24 小时
              </div>
            </div>

            {updateState.downloading || updateState.downloaded ? (
              <div className="mt-5 space-y-2">
                <Progress
                  value={Math.max(0, Math.min(100, updateState.downloadPercent))}
                  className="h-2.5 bg-stone-200/80 [&>div]:bg-stone-900"
                />
                <div className="flex items-center justify-between text-sm text-stone-500">
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
              <div className="mt-5 space-y-2">
                <div className="text-sm font-medium text-stone-950">发布说明</div>
                <div
                  className="max-h-[280px] overflow-y-auto rounded-md border border-stone-200 bg-[rgba(255,252,248,0.72)] px-4 py-3 text-xs leading-6 text-stone-700 [&_a]:underline [&_a]:decoration-stone-300 [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[rgba(120,100,82,0.08)] [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[rgba(120,100,82,0.08)] [&_pre]:p-3 [&_ul]:space-y-1"
                  dangerouslySetInnerHTML={{ __html: renderedReleaseNotes }}
                />
              </div>
            ) : updateState.updateAvailable ? (
              <div className="mt-4 rounded-[14px] border border-stone-200 bg-[rgba(255,252,248,0.72)] px-4 py-3 text-xs leading-6 text-stone-500">
                当前 Release 没有附带可读的详细说明。可以前往 GitHub Releases 查看完整发布页。
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
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
                <span className="inline-flex items-center gap-2">
                  {updateState.status === "checking" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {updateState.status === "checking" ? "检查中" : "检查更新"}
                </span>
              </Button>
              {showDownloadButton ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDownloadUpdate}
                  className="rounded-md border-stone-200 bg-[rgba(255,252,248,0.42)] text-stone-700 hover:bg-[rgba(250,246,240,0.7)]"
                >
                  <span className="inline-flex items-center gap-2">
                    {updateState.downloading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {updateState.downloading ? "下载中" : "下载更新"}
                  </span>
                </Button>
              ) : null}
              {showInstallButton ? (
                <Button
                  type="button"
                  onClick={onInstallUpdate}
                  disabled={updateState.status === "installing"}
                  className="rounded-md bg-stone-950 text-stone-50 hover:bg-stone-800"
                >
                  <span className="inline-flex items-center gap-2">
                    {updateState.status === "installing" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {updateState.status === "installing" ? "安装中" : "退出并安装"}
                  </span>
                </Button>
              ) : null}
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
