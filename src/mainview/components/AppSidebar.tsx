import { APP_NAV_ITEMS } from "../constants";
import type { AppSection } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppSidebarProps = {
  active: AppSection;
  onChange: (next: AppSection) => void;
};

export function AppSidebar({ active, onChange }: AppSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-stone-200/90 bg-[rgba(244,239,232,0.58)]">
      <CardHeader className="space-y-0">
        <CardTitle className="font-serif text-4xl leading-none tracking-[-0.03em] text-stone-950">
          Volo
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-0 pr-1">
        <nav className="flex flex-col gap-2">
          {APP_NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => onChange(item.id)}
              className={cn(
                "h-auto justify-start rounded-none border-l-2 border-transparent px-3 py-3 text-left transition-all duration-150",
                active === item.id
                  ? "border-l-stone-900 bg-[rgba(255,252,248,0.62)] text-stone-950 shadow-none hover:bg-[rgba(255,252,248,0.68)] hover:text-stone-950"
                  : "text-stone-500 hover:translate-x-[1px] hover:border-l-stone-300 hover:bg-[rgba(255,252,248,0.42)] hover:text-stone-700",
              )}
            >
              <div>
                <div className="font-medium whitespace-nowrap">{item.label}</div>
              </div>
            </Button>
          ))}
        </nav>
        <div className="border-t border-stone-200 pt-4 text-xs leading-6 text-stone-600 whitespace-nowrap">
          仅保存在本地设备。
        </div>
      </CardContent>
    </aside>
  );
}
