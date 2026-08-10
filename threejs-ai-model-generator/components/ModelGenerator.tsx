"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CODE,
  GEMINI_MODELS,
  TRANSLATIONS,
  isDefaultCode,
  type Lang,
} from "../constants";
import type { Verdict, Stats, LogEntry } from "../types";
import { useThreeEngine, type DebugCaptureResult } from "../hooks/useThreeEngine";
import { Toolbar } from "./Toolbar";
import { ControlCoPilotPanel } from "./ControlCoPilotPanel";
import { PreviewPanel } from "./PreviewPanel";
import { DebugCaptureModal } from "./DebugCaptureModal";

// 🌟 结构性报错(比如几何锚点检查失败)自动重试的上限。这不会比你之前手动点
// "Ask AI to Fix" 花更多 API 调用——之前你本来就是手动点 2、3 次才能过,现在只是
// 把这几次点击自动化掉,调用次数没有变多,只是不需要你人工干预了。
const MAX_AUTO_FIX_ATTEMPTS = 2;

// 🌟 把 prompt 描述转成安全的文件名片段。下载代码 / debug 截图的文件名都用这个,
// 方便你在下载文件夹里一眼认出"这是哪个模型"。
function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 50);
  return s || "model";
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ModelGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);

  // State Management
  const [lang, setLang] = useState<Lang>("en");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].value);
  const [wireframe, setWireframe] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<"dark" | "day">("dark");
  const [stats, setStats] = useState<Stats>({ triangles: 0, vertices: 0 });
  const [error, setError] = useState<string | null>(null);
  // 🌟 报错对应的具体行号(1-indexed),对不上就是 null——编辑器据此高亮/跳转
  const [errorLine, setErrorLine] = useState<number | null>(null);
  // 🌟 分解图：0 = 正常装配, 1 = 完全分解。纯前端状态,不需要重新生成代码。
  const [explodeFactor, setExplodeFactorState] = useState(0);

  // Agent State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoReview, setAutoReview] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null); // 🌟 保存发送给 AI 的截图
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // 🌟 Debug 多角度日夜对照截图状态。debugResult 非空时弹窗自动显示,
  // 关闭弹窗就把它置空,不需要额外的 showModal 布尔值。
  const [debugCapturing, setDebugCapturing] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugCaptureResult | null>(
    null,
  );

  const t = TRANSLATIONS[lang];
  const engine = useThreeEngine(containerRef, setError, setStats, setErrorLine);

  // 终端日志记录函数
  const addLog = useCallback((tag: LogEntry["tag"], text: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [
      ...prev,
      { id: Math.random().toString(), time, tag, text },
    ]);
  }, []);

  useEffect(() => {
    addLog("SYSTEM", "WebGL Engine initialized. PCFSoftShadowMap enabled.");
  }, [addLog]);

  // 切换背景主题处理函数
  const handleThemeToggle = () => {
    const nextTheme = canvasTheme === "dark" ? "day" : "dark";
    setCanvasTheme(nextTheme);
    engine.setCanvasTheme(nextTheme);
    addLog(
      "SYSTEM",
      `Canvas background switched to ${nextTheme.toUpperCase()} mode.`,
    );
  };

  // 🌟 分解图滑块处理函数
  const handleExplodeChange = (value: number) => {
    setExplodeFactorState(value);
    engine.setExplodeFactor(value);
  };

  // 触发视觉评审 (Vision Review)
  const triggerReview = async (customDesc?: string) => {
    const descToUse = customDesc || description.trim();
    if (!descToUse) return null;

    addLog("VISION", "Capturing WebGL Canvas multi-angle screenshot...");
    const screenshot = engine.captureImage();
    if (!screenshot) return null;

    setLastScreenshot(screenshot); // 🌟 存入状态，供用户在界面上点击查看

    setReviewing(true);
    addLog(
      "VISION",
      `Sending render to Gemini Vision (${model}) for critique...`,
    );
    try {
      const res = await fetch("/api/review-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: descToUse,
          screenshot,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setVerdict(data);
      const scorePct = Math.round((data.score || 0) * 100);
      addLog(
        "REVIEW",
        `Verdict: ${data.decision.toUpperCase()} (${scorePct}% score)`,
      );

      if (data.critique) {
        setFeedbackInput(data.critique);
        addLog("REVIEW", `Critique: "${data.critique}"`);
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Review failed: " + msg);
      addLog("ERROR", `Review Failed: ${msg}`);
      return null;
    } finally {
      setReviewing(false);
    }
  };

  // 🌟 生成 + 结构性报错自动重试的核心函数。initial 生成和 Refine 都走这里,
  // 逻辑统一：调用 /api/generate-model → 执行 → 失败就自动把报错当反馈重新生成,
  // 最多 MAX_AUTO_FIX_ATTEMPTS 次,还是失败就停下来,把手动 "Ask AI to Fix" 交还给你。
  // 只有真正跑成功了才会往下走(触发 review),不会拿一个跑不起来的模型去截图评审,
  // 白白浪费一次 vision 调用。
  const generateAndSelfHeal = useCallback(
    async (
      desc: string,
      opts: { previousCode?: string; feedback?: string } = {},
      attempt = 0,
    ): Promise<{ ok: boolean; finalCode: string | null }> => {
      const res = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          previousCode: opts.previousCode,
          feedback: opts.feedback,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCode(data.code);
      addLog(
        "WEBGL",
        attempt === 0
          ? "Compilation successful. Executing buildModel(THREE)..."
          : `Auto-fix attempt ${attempt}/${MAX_AUTO_FIX_ATTEMPTS}: executing regenerated code...`,
      );

      const result = engine.executeCode(data.code, wireframe);

      if (result.success) {
        addLog("WEBGL", "Model loaded into scene with auto-fit perspective.");
        return { ok: true, finalCode: data.code };
      }

      // 失败了。还有重试次数就自动拿报错当反馈重新生成,不需要你手动点。
      if (attempt < MAX_AUTO_FIX_ATTEMPTS) {
        addLog(
          "ERROR",
          `Runtime error: ${result.error} — auto-retrying (${attempt + 1}/${MAX_AUTO_FIX_ATTEMPTS})...`,
        );
        return generateAndSelfHeal(
          desc,
          { previousCode: data.code, feedback: result.error ?? "" },
          attempt + 1,
        );
      }

      // 重试次数用完了,停下来,让 "Ask AI to Fix" 按钮接手
      addLog(
        "ERROR",
        `Auto-fix exhausted after ${MAX_AUTO_FIX_ATTEMPTS} attempts. Manual "Ask AI to Fix" still available.`,
      );
      return { ok: false, finalCode: data.code };
    },
    [apiKey, model, wireframe, engine, addLog],
  );

  // 初次代码生成
  const handleGenerate = async () => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");

    setGenerating(true);
    setError(null);
    setErrorLine(null);
    setVerdict(null);
    setFeedbackInput("");
    setExplodeFactorState(0); // 🌟 新模型进来,分解状态复位

    addLog("PROMPT", `User prompt received: "${desc}"`);
    addLog("AGENT", `Invoking ${model} for Three.js code synthesis...`);

    try {
      const { ok } = await generateAndSelfHeal(desc);
      if (ok && autoReview) {
        setTimeout(() => triggerReview(desc), 300);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Generate failed: " + msg);
      addLog("ERROR", `Generation Failed: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  // 带反馈的迭代修构 (Refine)
  // 🌟 支持传入 overrideFeedback:用于"一键用 AI 修复报错"场景——这时反馈内容是
  // 报错文本本身,而不是用户手打在输入框里、可能还没来得及被 React 状态更新反映出来的内容。
  // 不传就还是老样子,读 feedbackInput 这个 state。
  const handleRefine = async (overrideFeedback?: string) => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");
    const feedbackToUse = (overrideFeedback ?? feedbackInput).trim();
    if (!feedbackToUse) return setError("Feedback is empty.");

    setGenerating(true);
    setError(null);
    setErrorLine(null);
    setExplodeFactorState(0); // 🌟 重新构建后,分解状态复位

    addLog("PROMPT", `Applying refinement feedback: "${feedbackToUse}"`);
    addLog(
      "AGENT",
      "Re-synthesizing code with previous context & delta feedback...",
    );

    try {
      const { ok } = await generateAndSelfHeal(desc, {
        previousCode: code,
        feedback: feedbackToUse,
      });
      if (ok && autoReview) {
        setTimeout(() => triggerReview(desc), 300);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Refine failed: " + msg);
      addLog("ERROR", `Refinement Failed: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  // 🌟 "Ask AI to Fix" —— 把当前报错文本直接当作反馈,一键触发 Refine(同样会走
  // 上面的自动重试循环)。不是静默帮你改数字让检查通过,是把报错原文喂给 AI 重新生成,
  // 决策权还是在 AI 那一步,你能在 feedbackInput 里看到实际发给 AI 的内容。
  const handleFixWithAI = () => {
    if (!error) return;
    setFeedbackInput(error);
    handleRefine(error);
  };

  // 🌟 下载当前代码为 .js 文件,文件名按 prompt 描述自动生成 slug。
  const handleDownloadCode = () => {
    if (!code) return;
    const slug = slugify(description || "model");
    downloadTextFile(`${slug}.buildModel.js`, code);
    addLog("SYSTEM", `Downloaded code as ${slug}.buildModel.js`);
  };

  // 🌟 Debug 多角度日夜对照截图。跟 Vision Review 的截图完全独立——这个是为了
  // 让你自己或者另一个 AI 对话肉眼排查穿模/结构对不齐问题,不会消耗任何 API 额度,
  // 纯本地 canvas 渲染。用 requestAnimationFrame 包一层,让 "capturing" 状态先有
  // 机会渲染出来,再执行下面这段同步的多次渲染(12 张,会短暂阻塞主线程一瞬间)。
  const handleDebugCapture = () => {
    if (!code) return;
    setDebugCapturing(true);
    addLog("VISION", "Capturing 6-angle × day/night debug contact sheet...");
    requestAnimationFrame(() => {
      const result = engine.captureDebugGrid(canvasTheme);
      setDebugCapturing(false);
      if (result) {
        setDebugResult(result);
        addLog("VISION", "Debug contact sheet ready — 12 shots captured.");
      } else {
        addLog("ERROR", "Debug capture failed — build a model first.");
      }
    });
  };

  const handleLangChange = (newLang: Lang) => {
    if (isDefaultCode(code)) setCode(DEFAULT_CODE[newLang]);
    setLang(newLang);
  };

  const handleClear = () => {
    setCode("");
    engine.clearModel();
    setStats({ triangles: 0, vertices: 0 });
    setError(null);
    setErrorLine(null);
    setVerdict(null);
    setFeedbackInput("");
    setLastScreenshot(null);
    setExplodeFactorState(0); // 🌟 清空场景时分解状态一并复位
    addLog("SYSTEM", "Scene & Editor cleared.");
  };

  const handleManualRun = () => {
    const result = engine.executeCode(code, wireframe);
    if (result.success) {
      setExplodeFactorState(0); // 🌟 手动重跑代码后,分解状态复位
      addLog("WEBGL", "Manual execution successful.");
    } else {
      addLog("ERROR", "Manual execution failed.");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Toolbar
        t={t}
        lang={lang}
        setLang={handleLangChange}
        wireframe={wireframe}
        setWireframe={(checked: boolean) => {
          setWireframe(checked);
          engine.applyWireframe(checked);
        }}
        canvasTheme={canvasTheme}
        onThemeToggle={handleThemeToggle}
        onClear={handleClear}
        onRun={handleManualRun}
        explodeFactor={explodeFactor}
        onExplodeChange={handleExplodeChange}
        code={code}
        onDownloadCode={handleDownloadCode}
        onDebugCapture={handleDebugCapture}
        debugCapturing={debugCapturing}
      />
      <div className="flex flex-col lg:flex-row">
        <ControlCoPilotPanel
          t={t}
          code={code}
          setCode={setCode}
          apiKey={apiKey}
          setApiKey={setApiKey}
          model={model}
          setModel={setModel}
          description={description}
          setDescription={setDescription}
          generating={generating}
          reviewing={reviewing}
          autoReview={autoReview}
          setAutoReview={setAutoReview}
          verdict={verdict}
          feedbackInput={feedbackInput}
          setFeedbackInput={setFeedbackInput}
          lastScreenshot={lastScreenshot}
          logs={logs}
          clearLogs={() => setLogs([])}
          onGenerate={handleGenerate}
          onReview={() => triggerReview()}
          onRefine={handleRefine}
          onRun={handleManualRun}
          error={error}
          errorLine={errorLine}
          onFixWithAI={handleFixWithAI}
        />
        <PreviewPanel
          containerRef={containerRef}
          stats={stats}
          error={error}
          t={t}
        />
      </div>

      {debugResult && (
        <DebugCaptureModal
          result={debugResult}
          slug={slugify(description || "model")}
          onClose={() => setDebugResult(null)}
        />
      )}
    </div>
  );
}
