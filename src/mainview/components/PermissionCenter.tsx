type PermissionStatus = "granted" | "denied" | "not-determined" | "restricted" | "unknown";

type PermissionCenterProps = {
  microphone: PermissionStatus;
  accessibility: PermissionStatus;
  onRequestMicrophone: () => void;
  onRequestAccessibility: () => void;
  onOpenSettings: (kind: "microphone" | "accessibility") => void;
};

function StatusBadge({ status }: { status: PermissionStatus }) {
  const labelMap: Record<PermissionStatus, string> = {
    granted: "已授权",
    denied: "未授权",
    "not-determined": "未询问",
    restricted: "受限",
    unknown: "未知",
  };
  const colorMap: Record<PermissionStatus, string> = {
    granted: "bg-emerald-50 text-emerald-900 border-emerald-200",
    denied: "bg-rose-50 text-rose-900 border-rose-200",
    "not-determined": "bg-amber-50 text-amber-900 border-amber-200",
    restricted: "bg-amber-50 text-amber-900 border-amber-200",
    unknown: "bg-stone-100 text-stone-700 border-stone-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${colorMap[status]}`}
    >
      {labelMap[status]}
    </span>
  );
}

export function PermissionCenter({
  microphone,
  accessibility,
  onRequestMicrophone,
  onRequestAccessibility,
  onOpenSettings,
}: PermissionCenterProps) {
  const needsAttention = microphone !== "granted" || accessibility !== "granted";

  if (!needsAttention) return null;

  return (
    <div className="rounded-[24px] border border-stone-200 bg-white/88 p-4 text-sm text-stone-900 shadow-[0_10px_24px_rgba(44,31,18,0.06)]">
      <div className="font-medium">完成基础授权</div>
      <p className="mt-1 text-xs text-stone-600">
        语音输入需要麦克风权限；跨应用写入需要辅助功能权限。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[18px] border border-stone-200 bg-stone-50/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">麦克风</span>
            <StatusBadge status={microphone} />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onRequestMicrophone}
              className="rounded-full border border-stone-900 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              请求权限
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings("microphone")}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              打开设置
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-stone-200 bg-stone-50/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">辅助功能</span>
            <StatusBadge status={accessibility} />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onRequestAccessibility}
              className="rounded-full border border-stone-900 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              请求权限
            </button>
            <button
              type="button"
              onClick={() => onOpenSettings("accessibility")}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              打开设置
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
