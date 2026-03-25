type PermissionPromptProps = {
  onOpenPermissions: () => void;
  onDismiss: () => void;
};

export function PermissionPrompt({
  onOpenPermissions,
  onDismiss,
}: PermissionPromptProps) {
  return (
    <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-100 p-4 text-sm text-amber-950 shadow-sm">
      <div className="font-medium">需要系统权限</div>
      <p className="mt-1 text-xs text-amber-900/80">
        为了跨应用回填输入，请在系统设置中开启辅助功能与输入监控权限。
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenPermissions}
          className="rounded-lg border border-amber-400 bg-amber-300 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-400"
        >
          打开系统设置
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
        >
          稍后
        </button>
      </div>
    </div>
  );
}
