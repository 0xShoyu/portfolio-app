"use client";

import { useState, KeyboardEvent } from "react";
import {
  Sparkles,
  Loader2,
  Wand2,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Code2,
  Terminal as TerminalIcon,
} from "lucide-react";
import { GEMINI_MODELS } from "../modelGenerator.constants";
import { TerminalView } from "./TerminalView";

export function ControlCoPilotPanel({
  t,
  code,
  setCode,
  apiKey,
  setApiKey,
  model,
  setModel,
  description,
  setDescription,
  generating,
  reviewing,
  autoReview,
  setAutoReview,
  verdict,
  feedbackInput,
  setFeedbackInput,
  logs,
  clearLogs,
  onGenerate,
  onReview,
  onRefine,
  onRun,
}: any) {
  const [activeTab, setActiveTab] = useState<"code" | "terminal">("code");

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      setCode(code.slice(0, start) + "  " + code.slice(end));
      requestAnimationFrame(
        () => (el.selectionStart = el.selectionEnd = start + 2),
      );
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  };

  return (
    <div className="flex flex-col border-b border-border/60 lg:w-[46%] lg:border-b-0 lg:border-r bg-background/20">
      {/* 🔑 API Key & Model Config */}
      <div className="flex flex-col gap-2.5 border-b border-border/60 bg-background/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs">🔑</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t.keyPlaceholder}
            autoComplete="off"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🚀 提示词输入区 */}
      <div className="p-4 border-b border-border/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" /> Prompt Description
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer hover:text-foreground">
            <input
              type="checkbox"
              checked={autoReview}
              onChange={(e) => setAutoReview(e.target.checked)}
              className="rounded border-border text-primary focus:ring-0"
            />
            Auto Vision-Review
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGenerate()}
            placeholder={t.descPlaceholder}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={onGenerate}
            disabled={generating || reviewing}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wand2 size={13} />
            )}
            {t.generate}
          </button>
        </div>
      </div>

      {/* 🌟 视觉评审与修改反馈 Hub (只要有代码就常驻显示) */}
      {code && (
        <div className="p-4 border-b border-border/60 bg-primary/5 flex flex-col gap-2.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Search size={13} className="text-primary" /> Review & Refine
              </span>
              {verdict && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                    verdict.decision === "continue"
                      ? "border-emerald-800 bg-emerald-950/50 text-emerald-400"
                      : "border-amber-800 bg-amber-950/50 text-amber-400"
                  }`}
                >
                  {verdict.decision === "continue" ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <AlertCircle size={10} />
                  )}
                  {verdict.decision === "continue" ? "Pass" : "Needs Work"} (
                  {Math.round(verdict.score * 100)}%)
                </span>
              )}
            </div>

            {/* 常驻的手动 Review 触发按钮 */}
            <button
              onClick={onReview}
              disabled={reviewing || generating}
              className="text-[11px] font-medium text-muted hover:text-primary underline underline-offset-2 flex items-center gap-1"
            >
              {reviewing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Search size={11} />
              )}
              {verdict ? "Re-Analyze" : "Analyze Render"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder={
                verdict
                  ? "Critique & User Modifications..."
                  : "Enter manual tweaks here, or click Analyze to get AI feedback..."
              }
              rows={2}
              className="w-full rounded-md border border-border/80 bg-background/80 px-2.5 py-2 text-xs font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none resize-none leading-relaxed"
            />
            <button
              onClick={onRefine}
              disabled={generating || reviewing || !feedbackInput.trim()}
              className="flex items-center justify-center gap-1.5 w-full rounded-md border border-primary/60 bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              Refine & Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* 💻 代码与 Terminal 选项卡组 */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2 border-b border-border/40 text-[11px] flex items-center justify-between bg-background/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === "code"
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Code2 size={13} /> JavaScript
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === "terminal"
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <TerminalIcon size={13} /> Logs Terminal
              {logs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[9px]">
                  {logs.length}
                </span>
              )}
            </button>
          </div>
          {activeTab === "code" && (
            <span className="text-[10px] opacity-60">⌘/Ctrl+Enter to run</span>
          )}
        </div>

        {activeTab === "code" ? (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="h-[280px] w-full flex-1 resize-none bg-background/50 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground focus:outline-none lg:h-[380px]"
          />
        ) : (
          <TerminalView logs={logs} onClearLogs={clearLogs} />
        )}
      </div>
    </div>
  );
}
