"use client";

import { useEffect, useRef } from "react";
import { useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { search, searchKeymap } from "@codemirror/search";
import { keymap, EditorView, Decoration } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { StateEffect, StateField } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
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
  Bug,
} from "lucide-react";
import { GEMINI_MODELS } from "../constants";
import { TerminalView } from "./TerminalView";

// 🌟 这几个必须定义在组件外面、只创建一次——StateEffect.define()/StateField.define()
// 每调用一次都会生成一个"新身份"，如果放进组件体内每次渲染都会重新定义，
// 导致上一次 dispatch 出去的 effect 跟这一轮的 field 对不上号，高亮直接失效。
const setErrorLineEffect = StateEffect.define<number | null>();

const errorLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setErrorLineEffect)) {
        if (effect.value == null) {
          deco = Decoration.none;
        } else {
          const lineNum = Math.min(
            Math.max(1, effect.value),
            tr.state.doc.lines,
          );
          const line = tr.state.doc.line(lineNum);
          deco = Decoration.set([
            Decoration.line({ attributes: { class: "cm-error-line" } }).range(
              line.from,
            ),
          ]);
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 🌟 语法高亮的具体配色——CodeMirror 的 javascript() 语言包本身不带颜色,
// 颜色是靠单独的 HighlightStyle 提供的,这里手写一套,不依赖额外的主题包。
const codeHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword], color: "#c792ea" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a3e6a3" },
  { tag: [tags.number, tags.bool, tags.null], color: "#f78c6c" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "#82aaff",
  },
  { tag: tags.propertyName, color: "#7fd4e0" },
  { tag: tags.variableName, color: "var(--foreground)" },
  { tag: tags.comment, color: "var(--muted)", fontStyle: "italic" },
  { tag: tags.operator, color: "#89ddff" },
  { tag: [tags.punctuation, tags.bracket], color: "var(--muted)" },
  { tag: [tags.className, tags.typeName], color: "#ffcb6b" },
]);

// 🌟 编辑器整体外观(背景/边框/光标/选区),全部读 app 已有的 CSS 变量,
// 而不是 CodeMirror 自带的某个固定配色包——这样才能跟你 app 其它地方视觉统一,
// 以后 app 主题色调了,编辑器会跟着一起变,不用单独再维护一份颜色。
const appEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
      fontSize: "12.5px",
    },
    ".cm-gutters": {
      backgroundColor: "var(--background)",
      color: "var(--muted)",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)",
    },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--primary)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor:
        "color-mix(in srgb, var(--primary) 25%, transparent) !important",
    },
    ".cm-error-line": {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      borderLeft: "3px solid rgb(248, 113, 113)",
    },
    ".cm-panels": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
    },
  },
  { dark: true },
);

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
  lastScreenshot,
  logs,
  clearLogs,
  onGenerate,
  onReview,
  onRefine,
  onRun,
  error,
  errorLine,
  onFixWithAI,
}: any) {
  const [activeTab, setActiveTab] = useState<"code" | "terminal">("code");
  const viewRef = useRef<EditorView | null>(null);

  // 🌟 报错行号一变,就把编辑器滚动到那一行、高亮那一行。errorLine 是 null 时清除高亮。
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setErrorLineEffect.of(errorLine ?? null) });
    if (errorLine != null) {
      const lineNum = Math.min(Math.max(1, errorLine), view.state.doc.lines);
      const line = view.state.doc.line(lineNum);
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
    }
  }, [errorLine]);

  const editorExtensions = useMemo(
    () => [
      javascript(),
      syntaxHighlighting(codeHighlightStyle),
      appEditorTheme,
      search({ top: true }),
      keymap.of([
        ...searchKeymap,
        {
          key: "Mod-Enter",
          run: () => {
            onRun();
            return true;
          },
        },
        indentWithTab,
      ]),
      errorLineField,
    ],
    [onRun],
  ); // 依赖项

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
            {GEMINI_MODELS.map((m: any) => (
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

      {/* 🌟 报错 + 一键 AI 修复:挪到这个常驻区域,不管你现在停在 Code 还是
          Terminal 标签页都能看见,不用切过去 Code 标签才发现有个按钮等着你点。
          只有自动重试(见 ModelGenerator 里的 generateAndSelfHeal)用完额度、
          真的需要你决定要不要再试一次的时候才会出现。 */}
      {error && (
        <div className="flex items-start gap-2 border-b border-red-900/50 bg-red-950/30 px-4 py-3">
          <Bug size={14} className="mt-0.5 shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-red-300 break-words">{error}</p>
            {errorLine != null && (
              <p className="mt-0.5 text-[10px] text-red-400/70">
                Jumped to line {errorLine} in the editor below.
              </p>
            )}
          </div>
          <button
            onClick={onFixWithAI}
            disabled={generating || reviewing}
            title="Send this error back to the AI and let it regenerate the code"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-red-700/60 bg-red-900/30 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-900/50 disabled:opacity-40 transition-colors"
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Ask AI to Fix
          </button>
        </div>
      )}

      {/* 🌟 视觉评审与修改反馈 Hub (只要有代码/模型就常驻显示) */}
      {code && (
        <div className="p-4 border-b border-border/60 bg-primary/5 flex flex-col gap-2.5 transition-all duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Search size={13} className="text-primary" /> Review & Refine
              </span>

              {/* 🖼️ 点击在新标签页查看给 Vision AI 发送的双视角截图 */}
              {lastScreenshot && (
                <button
                  onClick={() => {
                    const win = window.open();
                    if (win) {
                      win.document.write(
                        `<body style="margin:0;background:#0b0f16;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${lastScreenshot}" style="max-width:90%;border:2px solid #38bdf8;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);"/></body>`,
                      );
                    }
                  }}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 transition-colors"
                  title="Open the exact 2-in-1 image sent to Gemini Vision"
                >
                  🖼️ View Snapshot
                </button>
              )}

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
              onClick={() => onRefine()}
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
            <span className="text-[10px] opacity-60">
              ⌘/Ctrl+Enter run · ⌘/Ctrl+F search
            </span>
          )}
        </div>

        {activeTab === "code" ? (
          // 🌟 高度修复：外层给一个固定 max-height + overflow-y-auto,CodeMirror
          // 自己不设 height,只按内容自然排布。之前用 CodeMirror 的 height="100%"
          // 依赖父级 flex 容器有"确定的高度"才能生效,链路里差一个 min-height:0,
          // 内容一长就直接撑爆,现在这个写法不依赖那条链路,长代码稳定在固定高度内滚动。
          <div className="max-h-[280px] overflow-y-auto lg:max-h-[380px]">
            <CodeMirror
              value={code}
              theme="none"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
              }}
              extensions={editorExtensions}
              onChange={(value) => setCode(value)}
              onCreateEditor={(view) => {
                viewRef.current = view;
              }}
            />
          </div>
        ) : (
          <TerminalView logs={logs} onClearLogs={clearLogs} />
        )}
      </div>
    </div>
  );
}
