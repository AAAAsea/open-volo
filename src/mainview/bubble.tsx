import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";

// --- 类型定义保持兼容 ---
type BubbleStage = "idle" | "arming" | "recording" | "transcribing" | "refining" | "message" | "result";
type BubblePayload = { title?: string; hint?: string; text?: string; canContinuePaste?: boolean };

// --- 样式注入：极简、流体、高阶感 ---
const styleTag = `
  html, body, #bubble-root {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .volo-glass {
    background: rgba(15, 15, 18, 0.75);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: none;
  }
  .thinking-gradient {
    background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #6366f1);
    background-size: 300% 100%;
    animation: shimmer 2s infinite linear;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .thinking-bg {
    position: relative;
    background: rgba(255,255,255,0.05);
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .arming-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.9);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.35; transform: scale(0.9); }
    50% { opacity: 1; transform: scale(1); }
  }
`;

type SpectrumBands = {
  level: number;
  low: number;
  mid: number;
  high: number;
};

declare global {
  interface Window {
    voloBubble?: {
      resultCopied: () => Promise<{ ok: boolean }>;
      resultContinuePaste: () => Promise<{ ok: boolean; error?: string }>;
      resultClosed: () => Promise<{ ok: boolean }>;
    };
    __voloBubble?: {
      setStage: (stage: BubbleStage) => void;
      setLevel: (level: number) => void;
      setSpectrum: (payload: Partial<SpectrumBands>) => void;
      setProgress: (progress: number) => void;
      setMessage: (payload: BubblePayload) => void;
      showResult: (payload: BubblePayload) => void;
      hideResult: () => void;
    };
  }
}

// --- 核心组件：柱状音谱 ---
const SpectrumVisualizer = ({
  spectrumRef,
}: {
  spectrumRef: React.MutableRefObject<SpectrumBands>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(Array.from({ length: 11 }, () => 0));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { level, low, mid, high } = spectrumRef.current;
      const centerY = canvas.height / 2;
      const barCount = 11;
      const gap = 3;
      const barWidth = 4;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = (canvas.width - totalWidth) / 2;
      const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
      };

      for (let i = 0; i < barCount; i += 1) {
        const t = i / (barCount - 1);
        const lowWeight = Math.max(0, 1 - Math.abs(t - 0.15) / 0.3);
        const midWeight = Math.max(0, 1 - Math.abs(t - 0.5) / 0.35);
        const highWeight = Math.max(0, 1 - Math.abs(t - 0.85) / 0.3);
        const target = Math.max(
          0.06,
          Math.min(1, (low * lowWeight + mid * midWeight + high * highWeight) * 0.78 + level * 0.1),
        );
        const prev = barsRef.current[i] ?? 0;
        const follow = target > prev ? 0.62 : 0.84;
        const next = prev + (target - prev) * follow;
        barsRef.current[i] = next;
        const h = 4 + next * (canvas.height - 8);
        const x = startX + i * (barWidth + gap);
        const y = centerY - h / 2;
        drawRoundedRect(x, y, barWidth, h, 2);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fill();
      }
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={124}
      height={28}
      style={{ width: 112, height: 24 }}
    />
  );
};

function BubbleApp() {
  const [stage, setStage] = useState<BubbleStage>("idle");
  const [data, setData] = useState({ title: "", hint: "", text: "", canContinuePaste: false });
  const [copyStatus, setCopyStatus] = useState(false);
  const [continueBusy, setContinueBusy] = useState(false);
  const [continueError, setContinueError] = useState("");
  const [progress, setProgress] = useState(0);
  const spectrumRef = useRef<SpectrumBands>({ level: 0, low: 0, mid: 0, high: 0 });

  // 模拟 API 注入
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = styleTag;
    document.head.appendChild(style);

    window.__voloBubble = {
      setStage,
      setLevel: (l: number) => {
        const level = Math.max(0, Math.min(1, Number(l) || 0));
        spectrumRef.current = { level, low: level, mid: level, high: level };
      },
      setSpectrum: (p: Partial<SpectrumBands>) => {
        spectrumRef.current = {
          level: Math.max(0, Math.min(1, Number(p?.level) || 0)),
          low: Math.max(0, Math.min(1, Number(p?.low) || 0)),
          mid: Math.max(0, Math.min(1, Number(p?.mid) || 0)),
          high: Math.max(0, Math.min(1, Number(p?.high) || 0)),
        };
      },
      setProgress: (v: number) => {
        setProgress(Math.max(0, Math.min(1, Number(v) || 0)));
      },
      setMessage: (p: BubblePayload) => {
        setStage("message");
        setCopyStatus(false);
        setContinueBusy(false);
        setContinueError("");
        setData((d) => ({ ...d, ...p, text: "", canContinuePaste: false }));
      },
      showResult: (p: BubblePayload) => {
        setStage("result");
        setCopyStatus(false);
        setContinueBusy(false);
        setContinueError("");
        setData((d) => ({ ...d, ...p }));
      },
      hideResult: () => setStage("idle"),
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.text || "");
    setCopyStatus(true);
    setContinueError("");
    if (window.voloBubble?.resultCopied) {
      void window.voloBubble.resultCopied();
    }
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleContinuePaste = async () => {
    if (!window.voloBubble?.resultContinuePaste || continueBusy) return;
    setContinueBusy(true);
    setContinueError("");
    try {
      const result = await window.voloBubble.resultContinuePaste();
      if (!result?.ok) {
        setContinueError(result?.error || "继续粘贴失败");
      }
    } catch {
      setContinueError("继续粘贴失败");
    } finally {
      setContinueBusy(false);
    }
  };

  const handleClose = () => {
    if (window.voloBubble?.resultClosed) {
      void window.voloBubble.resultClosed();
      return;
    }
    setStage("idle");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <AnimatePresence mode="wait">
        {stage !== "idle" && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 8, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.9,
              transition: { duration: 0.2 },
            }}
            className="volo-glass"
            style={{
              pointerEvents: "auto",
              borderRadius: stage === "result" || stage === "message" ? 24 : 999,
              width: stage === "result" || stage === "message" ? 320 : 124,
              height: stage === "result" || stage === "message" ? "auto" : 40,
              padding:
                stage === "result" || stage === "message"
                  ? "6px"
                  : stage === "transcribing" || stage === "refining" || stage === "recording"
                    ? "0"
                    : "4px 6px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              WebkitMaskImage: "-webkit-radial-gradient(white, black)",
            }}
          >
            {/* 状态 1: 录音中 (极简流体) */}
            {stage === "arming" && (
              <motion.div
                key="arming"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <div className="arming-dot" />
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 12, letterSpacing: 0.2 }}>
                  准备录音...
                </span>
              </motion.div>
            )}

            {stage === "recording" && (
              <motion.div
                key="rec"
                initial={{ opacity: 0.9, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.6 }}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SpectrumVisualizer spectrumRef={spectrumRef} />
              </motion.div>
            )}

            {/* 状态 2: 识别中 (极光文字) */}
            {(stage === "transcribing" || stage === "refining") && (
              <motion.div
                key={stage}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  overflow: "hidden",
                  position: "relative",
                }}
                className="thinking-bg"
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.round(progress * 100)}%`,
                    background:
                      stage === "refining"
                        ? "linear-gradient(90deg, rgba(250,204,21,0.14), rgba(250,204,21,0.34))"
                        : "linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.28))",
                    transition: "width 120ms linear",
                  }}
                />
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: 0.4,
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage === "refining" ? "润色中..." : "转写中..."}
                </span>
              </motion.div>
            )}

            {/* 状态 3: 结果展示 (内容卡片) */}
            {(stage === "result" || stage === "message") && (
              <motion.div
                key="res"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ padding: "10px 12px 12px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.9,
                      textTransform: "uppercase",
                    }}
                  >
                    {data.title || "RECOGNIZED TEXT"}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 4,
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.1)",
                    }}
                  />
                </div>

                <div
                  className="scrollbar-hide"
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    lineHeight: 1.45,
                    maxHeight: 168,
                    overflowY: "auto",
                    marginBottom: 12,
                    fontWeight: 450,
                  }}
                >
                  {data.text || (stage === "message" ? "" : "Waiting for content...")}
                </div>

                {stage === "result" && data.hint && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.62)",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      marginBottom: 12,
                    }}
                  >
                    {data.hint}
                  </div>
                )}

                {stage === "message" && !data.text && data.hint && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.86)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      marginBottom: 4,
                      fontWeight: 450,
                    }}
                  >
                    {data.hint}
                  </div>
                )}

                {stage === "result" && (
                  <>
                    {continueError && (
                      <div
                        style={{
                          color: "rgba(248,113,113,0.92)",
                          fontSize: 11,
                          lineHeight: 1.4,
                          marginBottom: 8,
                        }}
                      >
                        {continueError}
                      </div>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: data.canContinuePaste ? "1.15fr 0.9fr 0.8fr" : "1fr 1fr",
                        gap: 6,
                      }}
                    >
                      {data.canContinuePaste && (
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleContinuePaste}
                          disabled={continueBusy}
                          style={{
                            padding: "9px 10px",
                            minHeight: 36,
                            borderRadius: 14,
                            border: "none",
                            background: continueBusy ? "rgba(255,255,255,0.22)" : "white",
                            color: "black",
                            fontWeight: 650,
                            fontSize: 12.5,
                            cursor: continueBusy ? "default" : "pointer",
                            transition: "background 0.2s ease, transform 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            letterSpacing: 0.1,
                          }}
                        >
                          {continueBusy ? "继续中..." : "继续粘贴"}
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopy}
                        style={{
                          padding: "9px 10px",
                          minHeight: 36,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: copyStatus ? "#22c55e" : "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.95)",
                          fontWeight: 600,
                          fontSize: 12.5,
                          cursor: "pointer",
                          transition: "background 0.25s ease, border-color 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {copyStatus ? "已复制" : "复制"}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleClose}
                        style={{
                          padding: "9px 10px",
                          minHeight: 36,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                          fontSize: 12.5,
                          cursor: "pointer",
                          transition: "background 0.2s ease, border-color 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        关闭
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 渲染
const rootEl =
  document.getElementById("bubble-root") ||
  (() => {
    const el = document.createElement("div");
    el.id = "bubble-root";
    document.body.appendChild(el);
    return el;
  })();
createRoot(rootEl).render(<BubbleApp />);
