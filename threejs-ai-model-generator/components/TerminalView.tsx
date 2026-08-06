"use client";

import { useEffect, useRef } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import type { LogEntry } from "../types";

export function TerminalView({
  logs,
  onClearLogs,
}: {
  logs: LogEntry[];
  onClearLogs: () => void;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getTagColor = (tag: LogEntry["tag"]) => {
    switch (tag) {
      case "SYSTEM":
        return "text-purple-400 border-purple-500/30 bg-purple-500/10";
      case "PROMPT":
        return "text-sky-400 border-sky-500/30 bg-sky-500/10";
      case "AGENT":
        return "text-blue-400 border-blue-500/30 bg-blue-500/10";
      case "WEBGL":
        return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
      case "VISION":
        return "text-pink-400 border-pink-500/30 bg-pink-500/10";
      case "REVIEW":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      case "ERROR":
        return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    }
  };

  return (
    <div className="flex flex-col h-[280px] lg:h-[380px] bg-black/80 font-mono text-[11px] leading-relaxed p-3 overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-muted">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
          <TerminalIcon size={12} className="text-primary" /> Agent
          Observability Stream
        </span>
        <button
          onClick={onClearLogs}
          className="hover:text-foreground text-[10px] transition-colors"
        >
          Clear Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">
            No activity logs yet. Waiting for prompt execution...
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="text-slate-600 shrink-0">{log.time}</span>
            <span
              className={`px-1.5 py-0.2 rounded border text-[9px] font-bold shrink-0 ${getTagColor(log.tag)}`}
            >
              {log.tag}
            </span>
            <span className="text-slate-200 whitespace-pre-wrap break-all">
              {log.text}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
