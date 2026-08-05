"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CODE,
  GEMINI_MODELS,
  TRANSLATIONS,
  isDefaultCode,
  type Lang,
} from "./modelGenerator.constants";
import type { Verdict, Stats, LogEntry } from "./modelGenerator/types";
import { useThreeEngine } from "./modelGenerator/useThreeEngine";
import { Toolbar } from "./modelGenerator/Toolbar";
import { ControlCoPilotPanel } from "./modelGenerator/ControlCoPilotPanel";
import { PreviewPanel } from "./modelGenerator/PreviewPanel";

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

  // Agent State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoReview, setAutoReview] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null); // 🌟 保存发送给 AI 的截图
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const t = TRANSLATIONS[lang];
  const engine = useThreeEngine(containerRef, setError, setStats);

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

  // 初次代码生成
  const handleGenerate = async () => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");

    setGenerating(true);
    setError(null);
    setVerdict(null);
    setFeedbackInput("");

    addLog("PROMPT", `User prompt received: "${desc}"`);
    addLog("AGENT", `Invoking ${model} for Three.js code synthesis...`);

    try {
      const res = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCode(data.code);
      addLog("WEBGL", "Compilation successful. Executing buildModel(THREE)...");

      const ok = engine.executeCode(data.code, wireframe);
      if (ok) {
        addLog("WEBGL", "Model loaded into scene with auto-fit perspective.");
        if (autoReview) {
          setTimeout(() => triggerReview(desc), 300);
        }
      } else {
        addLog(
          "ERROR",
          "WebGL execution failed due to JS runtime error in generated code.",
        );
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
  const handleRefine = async () => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");
    if (!feedbackInput.trim()) return setError("Feedback is empty.");

    setGenerating(true);
    setError(null);

    addLog("PROMPT", `Applying refinement feedback: "${feedbackInput.trim()}"`);
    addLog(
      "AGENT",
      "Re-synthesizing code with previous context & delta feedback...",
    );

    try {
      const res = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          previousCode: code,
          feedback: feedbackInput.trim(),
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCode(data.code);
      addLog("WEBGL", "Refinement compiled. Hot-reloading WebGL scene...");

      const ok = engine.executeCode(data.code, wireframe);
      if (ok) {
        addLog("WEBGL", "Model reloaded into scene with auto-fit perspective.");
        if (autoReview) {
          setTimeout(() => triggerReview(desc), 300);
        }
      } else {
        addLog(
          "ERROR",
          "Refinement WebGL execution failed due to JS runtime error.",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Refine failed: " + msg);
      addLog("ERROR", `Refinement Failed: ${msg}`);
    } finally {
      setGenerating(false);
    }
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
    setVerdict(null);
    setFeedbackInput("");
    setLastScreenshot(null);
    addLog("SYSTEM", "Scene & Editor cleared.");
  };

  const handleManualRun = () => {
    const ok = engine.executeCode(code, wireframe);
    if (ok) {
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
        />
        <PreviewPanel
          containerRef={containerRef}
          stats={stats}
          error={error}
          t={t}
        />
      </div>
    </div>
  );
}
