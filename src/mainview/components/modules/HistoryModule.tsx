import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Copy } from "lucide-react";
import type { VoiceHistoryItem } from "../../types";
import { Button } from "@/components/ui/button";

const INITIAL_RENDER_COUNT = 24;
const LOAD_MORE_BATCH = 24;
const LOAD_MORE_THRESHOLD = 480;

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const isSameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeLabel = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffMs < minuteMs) {
    return "刚刚";
  }
  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))} 分钟前`;
  }
  if (diffMs < 6 * hourMs) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))} 小时前`;
  }
  if (isSameDay) {
    return `今天 ${timeLabel}`;
  }
  if (isYesterday) {
    return `昨天 ${timeLabel}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeLabel}`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeLabel}`;
}

type DiffSegment = {
  type: "equal" | "remove" | "add";
  value: string;
};

function tokenizeDiffText(text: string): string[] {
  return text.match(/([A-Za-z0-9_@./:-]+|\s+|[^\s])/g) ?? [];
}

function pushSegment(segments: DiffSegment[], next: DiffSegment) {
  if (!next.value) return;
  const prev = segments[segments.length - 1];
  if (prev && prev.type === next.type) {
    prev.value += next.value;
    return;
  }
  segments.push(next);
}

function buildFallbackDiff(beforeTokens: string[], afterTokens: string[]): DiffSegment[] {
  let start = 0;
  const minLength = Math.min(beforeTokens.length, afterTokens.length);
  while (start < minLength && beforeTokens[start] === afterTokens[start]) {
    start += 1;
  }

  let beforeEnd = beforeTokens.length - 1;
  let afterEnd = afterTokens.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeTokens[beforeEnd] === afterTokens[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const segments: DiffSegment[] = [];
  pushSegment(segments, { type: "equal", value: beforeTokens.slice(0, start).join("") });
  pushSegment(segments, { type: "remove", value: beforeTokens.slice(start, beforeEnd + 1).join("") });
  pushSegment(segments, { type: "add", value: afterTokens.slice(start, afterEnd + 1).join("") });
  pushSegment(segments, { type: "equal", value: beforeTokens.slice(beforeEnd + 1).join("") });
  return segments;
}

function buildDiffSegments(beforeText: string, afterText: string): DiffSegment[] {
  const beforeTokens = tokenizeDiffText(beforeText);
  const afterTokens = tokenizeDiffText(afterText);

  if (beforeTokens.length === 0 && afterTokens.length === 0) {
    return [];
  }

  if (beforeTokens.join("") === afterTokens.join("")) {
    return [{ type: "equal", value: afterText }];
  }

  const cellBudget = beforeTokens.length * afterTokens.length;
  if (cellBudget > 60000) {
    return buildFallbackDiff(beforeTokens, afterTokens);
  }

  const dp = Array.from({ length: beforeTokens.length + 1 }, () =>
    Array<number>(afterTokens.length + 1).fill(0),
  );

  for (let i = beforeTokens.length - 1; i >= 0; i -= 1) {
    for (let j = afterTokens.length - 1; j >= 0; j -= 1) {
      if (beforeTokens[i] === afterTokens[j]) {
        dp[i]![j] = dp[i + 1]![j + 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (beforeTokens[i] === afterTokens[j]) {
      pushSegment(segments, { type: "equal", value: beforeTokens[i]! });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      pushSegment(segments, { type: "remove", value: beforeTokens[i]! });
      i += 1;
    } else {
      pushSegment(segments, { type: "add", value: afterTokens[j]! });
      j += 1;
    }
  }

  while (i < beforeTokens.length) {
    pushSegment(segments, { type: "remove", value: beforeTokens[i]! });
    i += 1;
  }

  while (j < afterTokens.length) {
    pushSegment(segments, { type: "add", value: afterTokens[j]! });
    j += 1;
  }

  return segments;
}

type HistoryModuleProps = {
  history: VoiceHistoryItem[];
  onClearHistory: () => void;
};

function HistoryCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={copied ? "已复制" : "复制文本"}
      title={copied ? "已复制" : "复制文本"}
      onClick={handleCopy}
      className={`h-7 w-7 rounded-md ${
        copied
          ? "bg-transparent text-emerald-700 hover:bg-transparent hover:text-emerald-700"
          : "bg-transparent text-stone-400 hover:bg-stone-100/60 hover:text-stone-700"
      }`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function HistoryItemCard({
  item,
  isLast,
}: {
  item: VoiceHistoryItem;
  isLast: boolean;
}) {
  const beforeText = item.text || "";
  const afterText = item.processedText || item.text || "";
  const diffSegments = useMemo(
    () => (item.textRefineEnabled ? buildDiffSegments(beforeText, afterText) : []),
    [afterText, beforeText, item.textRefineEnabled],
  );

  return (
    <article className={`px-5 py-4 ${!isLast ? "border-b border-stone-200" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-stone-900 whitespace-nowrap">
          {formatTime(item.createdAt)} · {Math.round(item.durationMs / 1000)}s
        </div>
        <HistoryCopyButton text={afterText || ""} />
      </div>

      {item.textRefineEnabled ? (
        <div className="mt-3 space-y-3 border-t border-stone-200 pt-3">
          <div className="rounded-md bg-[rgba(255,252,248,0.5)] px-3 py-3 text-sm leading-7 text-stone-800 whitespace-pre-wrap break-words">
            {diffSegments.length > 0 ? (
              diffSegments.map((segment, segmentIndex) => {
                if (segment.type === "equal") {
                  return <span key={`${item.id}-seg-${segmentIndex}`}>{segment.value}</span>;
                }

                if (segment.type === "remove") {
                  return (
                    <span
                      key={`${item.id}-seg-${segmentIndex}`}
                      className="rounded-sm bg-rose-100/90 px-0.5 text-rose-700 line-through decoration-rose-400"
                    >
                      {segment.value}
                    </span>
                  );
                }

                return (
                  <span
                    key={`${item.id}-seg-${segmentIndex}`}
                    className="rounded-sm bg-emerald-100/90 px-0.5 text-emerald-800"
                  >
                    {segment.value}
                  </span>
                );
              })
            ) : (
              <span>{afterText || "（空）"}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-stone-200 pt-3 text-sm leading-7 text-stone-900">
          {afterText || "（空）"}
        </div>
      )}
    </article>
  );
}

export function HistoryModule({ history, onClearHistory }: HistoryModuleProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const visibleCountRef = useRef(INITIAL_RENDER_COUNT);
  const historyLengthRef = useRef(history.length);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(history.length, INITIAL_RENDER_COUNT),
  );

  const visibleHistory = useMemo(
    () => history.slice(0, visibleCount),
    [history, visibleCount],
  );

  const scrollToTop = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    historyLengthRef.current = history.length;
    const nextVisibleCount = Math.min(history.length, INITIAL_RENDER_COUNT);
    visibleCountRef.current = nextVisibleCount;
    setVisibleCount(nextVisibleCount);
  }, [history.length]);

  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let cleanup = () => {};
    const scrollContainer =
      section.closest("[data-radix-scroll-area-viewport]") ??
      document.scrollingElement ??
      document.documentElement;

    const readScrollTop = () => {
      let scrollTop = 0;
      let clientHeight = 0;
      let scrollHeight = 0;

      if (scrollContainer instanceof HTMLElement) {
        scrollTop = scrollContainer.scrollTop;
        clientHeight = scrollContainer.clientHeight;
        scrollHeight = scrollContainer.scrollHeight;
      } else {
        scrollTop = window.scrollY;
        clientHeight = window.innerHeight;
        scrollHeight = document.documentElement.scrollHeight;
      }

      setShowScrollTop(scrollTop > 320);

      if (
        scrollHeight - scrollTop - clientHeight < LOAD_MORE_THRESHOLD &&
        visibleCountRef.current < historyLengthRef.current
      ) {
        setVisibleCount((prev) => {
          const next = Math.min(historyLengthRef.current, prev + LOAD_MORE_BATCH);
          visibleCountRef.current = next;
          return next;
        });
      }
    };

    readScrollTop();

    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.addEventListener("scroll", readScrollTop, { passive: true });
      cleanup = () => {
        scrollContainer.removeEventListener("scroll", readScrollTop);
      };
    } else {
      window.addEventListener("scroll", readScrollTop, { passive: true });
      cleanup = () => {
        window.removeEventListener("scroll", readScrollTop);
      };
    }

    return cleanup;
  }, [history.length]);

  return (
    <section ref={sectionRef} className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-5xl leading-none tracking-[-0.03em] text-stone-950">
            历史记录
          </h2>
          <p className="text-sm leading-7 text-stone-600">最近的转写结果。</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onClearHistory}
          className="rounded-md border-stone-200 bg-white/80 text-stone-700 hover:bg-stone-50 whitespace-nowrap"
        >
          清空历史
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-stone-300 bg-stone-50/70 p-8 text-sm text-stone-500">
          暂无历史记录
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-hidden rounded-[20px] border border-stone-200 bg-white/88">
            {visibleHistory.map((item, index) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                isLast={index === visibleHistory.length - 1}
              />
            ))}
          </div>

          {visibleCount < history.length ? (
            <div className="mt-3 text-center text-xs text-stone-500">
              已显示 {visibleCount} / {history.length} 条，继续下滑自动加载
            </div>
          ) : null}

          {showScrollTop ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="回到顶部"
              title="回到顶部"
              onClick={scrollToTop}
              className="absolute bottom-4 right-4 h-8 w-8 rounded-full border border-stone-200 bg-[rgba(255,252,248,0.88)] text-stone-500 shadow-sm hover:bg-stone-50 hover:text-stone-900"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
