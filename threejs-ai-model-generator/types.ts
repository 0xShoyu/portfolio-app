export interface Verdict {
  decision: "continue" | "refine";
  score: number;
  critique?: string;
}

export interface Stats {
  triangles: number;
  vertices: number;
}

export interface LogEntry {
  id: string;
  time: string;
  tag: "SYSTEM" | "PROMPT" | "AGENT" | "WEBGL" | "VISION" | "REVIEW" | "ERROR";
  text: string;
}
