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

  // State
  const [lang, setLang] = useState<Lang>("en");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].value);
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState<Stats>({ triangles: 0, vertices: 0 });
  const [error, setError] = useState<string | null>(null);

  // Agent State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoReview, setAutoReview] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const t = TRANSLATIONS[lang];
  const engine = useThreeEngine(containerRef, setError, setStats);

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

  const triggerReview = async (customDesc?: string) => {
    const descToUse = customDesc || description.trim();
    if (!descToUse) return null;

    addLog("VISION", "Capturing WebGL Canvas screenshot...");
    const screenshot = engine.captureImage();
    if (!screenshot) return null;

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
      engine.executeCode(data.code, wireframe);
      addLog("WEBGL", "Model loaded into scene with auto-fit perspective.");

      if (autoReview) {
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
      engine.executeCode(data.code, wireframe);

      if (autoReview) {
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
    addLog("SYSTEM", "Scene & Editor cleared.");
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
        onClear={handleClear}
        onRun={() => engine.executeCode(code, wireframe)}
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
          logs={logs}
          clearLogs={() => setLogs([])}
          onGenerate={handleGenerate}
          onReview={() => triggerReview()}
          onRefine={handleRefine}
          onRun={() => engine.executeCode(code, wireframe)}
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
