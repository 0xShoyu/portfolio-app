"use client";

import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import * as THREE from "three";
import {
  Play,
  Trash2,
  Search,
  RotateCcw,
  Sparkles,
  Loader2,
  Box,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from "lucide-react";
import {
  DEFAULT_CODE,
  GEMINI_MODELS,
  TRANSLATIONS,
  isDefaultCode,
  type Lang,
} from "./modelGenerator.constants";

interface Verdict {
  decision: "continue" | "refine";
  score: number;
  critique?: string;
}

interface Stats {
  triangles: number;
  vertices: number;
}

// ==========================================
// 1. Custom Hook: Three.js Engine Logic
// ==========================================
function useThreeEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onError: (err: string | null) => void,
  onStatsUpdate: (stats: Stats) => void,
) {
  const engineRef = useRef<any>(null);

  const clearModel = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    while (engine.modelGroup.children.length) {
      const obj = engine.modelGroup.children.pop()!;
      obj.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: any) => {
            m.dispose();
            if (m.map) m.map.dispose();
          });
        }
      });
    }
  }, []);

  const applyWireframe = useCallback((wf: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.modelGroup.traverse((o: any) => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => (m.wireframe = wf));
      }
    });
  }, []);

  const executeCode = useCallback(
    (codeStr: string, isWireframe: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        clearModel();
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const fn = new Function(
          "THREE",
          codeStr + "\n;return buildModel(THREE);",
        );
        const result = fn(THREE);

        if (!result || !(result instanceof THREE.Object3D)) {
          throw new Error("buildModel(THREE) must return a THREE.Object3D");
        }

        result.traverse((o: any) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });

        engine.modelGroup.add(result);
        applyWireframe(isWireframe);

        const box = new THREE.Box3().setFromObject(result);
        if (!box.isEmpty()) {
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const fitDist =
            (maxDim / (2 * Math.tan((engine.camera.fov * Math.PI) / 180 / 2))) *
            1.8;
          engine.camDistance = fitDist;
          engine.minDist = fitDist * 0.15;
          engine.maxDist = fitDist * 8;
          engine.lookTarget.copy(center);
        }

        let tris = 0,
          verts = 0;
        result.traverse((o: any) => {
          if (o.isMesh && o.geometry) {
            const posCount = o.geometry.attributes.position
              ? o.geometry.attributes.position.count
              : 0;
            verts += posCount;
            tris += o.geometry.index
              ? o.geometry.index.count / 3
              : posCount / 3;
          }
        });
        onStatsUpdate({ triangles: Math.round(tris), vertices: verts });
        onError(null);
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      }
    },
    [clearModel, applyWireframe, onError, onStatsUpdate],
  );

  const captureImage = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return null;
    engine.renderer.render(engine.scene, engine.camera);
    return engine.renderer.domElement.toDataURL("image/png");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f16);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x8fa3bf, 0x0e131b, 0.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4488aa, 0.3);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(4, 16, 0x2a3446, 0x1a2130);
    scene.add(grid);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.6 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const engineState = {
      scene,
      camera,
      renderer,
      modelGroup,
      rotY: 0,
      elevation: 0.35,
      camDistance: 3,
      minDist: 0.5,
      maxDist: 20,
      lookTarget: new THREE.Vector3(0, 0.4, 0),
      dragging: false,
      lastX: 0,
      lastY: 0,
      activePointers: new Map(),
      frameId: 0,
    };
    engineRef.current = engineState;

    function clamp(v: number, a: number, b: number) {
      return Math.max(a, Math.min(b, v));
    }

    function onPointerDown(e: PointerEvent) {
      container!.setPointerCapture(e.pointerId);
      engineState.activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
      if (engineState.activePointers.size === 1) {
        engineState.dragging = true;
        engineState.lastX = e.clientX;
        engineState.lastY = e.clientY;
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!engineState.activePointers.has(e.pointerId)) return;
      engineState.activePointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
      if (engineState.dragging && engineState.activePointers.size === 1) {
        const dx = e.clientX - engineState.lastX;
        const dy = e.clientY - engineState.lastY;
        engineState.lastX = e.clientX;
        engineState.lastY = e.clientY;
        engineState.rotY += dx * 0.008;
        engineState.elevation = clamp(
          engineState.elevation + dy * 0.008,
          -1.4,
          1.4,
        );
      }
    }

    function onPointerUp(e: PointerEvent) {
      engineState.activePointers.delete(e.pointerId);
      engineState.dragging = engineState.activePointers.size > 0;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      engineState.camDistance = clamp(
        engineState.camDistance + e.deltaY * 0.0015 * engineState.camDistance,
        engineState.minDist,
        engineState.maxDist,
      );
    }

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    function onResize() {
      const w = container!.clientWidth,
        h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    onResize();

    function animate() {
      engineState.frameId = requestAnimationFrame(animate);
      const h = engineState.camDistance * Math.cos(engineState.elevation);
      const y = engineState.camDistance * Math.sin(engineState.elevation);
      camera.position.set(
        engineState.lookTarget.x,
        engineState.lookTarget.y + y,
        engineState.lookTarget.z + h,
      );
      camera.lookAt(engineState.lookTarget);

      if (!engineState.dragging) {
        engineState.rotY += 0.002;
      }
      modelGroup.rotation.y = engineState.rotY;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(engineState.frameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
  }, []);

  return { executeCode, clearModel, captureImage, applyWireframe };
}

// ==========================================
// 2. Sub-components (Unified UX)
// ==========================================

const Toolbar = ({
  t,
  lang,
  setLang,
  wireframe,
  setWireframe,
  onClear,
  onRun,
}: any) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
    <div className="flex items-center gap-2.5">
      <Box size={18} className="text-primary" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
        <p className="text-xs text-muted">{t.subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
      >
        <option value="en">EN</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
      </select>
      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={wireframe}
          onChange={(e) => setWireframe(e.target.checked)}
        />
        {t.wireframe}
      </label>
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-foreground/30 hover:text-foreground"
      >
        <Trash2 size={13} /> {t.clear}
      </button>
      <button
        onClick={onRun}
        className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
      >
        <Play size={13} /> {t.run}
      </button>
    </div>
  </div>
);

// 🌟 核心改进：统一的左侧指令与反馈控制塔 (Co-Pilot Hub)
const ControlCoPilotPanel = ({
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
  onGenerate,
  onReview,
  onRefine,
  onRun,
}: any) => {
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

      {/* 🚀 1. 提示词输入区 + 自动 Review 开关 */}
      <div className="p-4 border-b border-border/60 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" /> Prompt / Prompt
            Description
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

      {/* 🌟 2. 核心创新：统一的视觉评审与用户反馈修构 Hub */}
      {(verdict || reviewing) && (
        <div className="p-4 border-b border-border/60 bg-primary/5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Search size={13} className="text-primary" /> AI Vision Review
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

            <button
              onClick={onReview}
              disabled={reviewing || generating}
              className="text-[11px] text-muted hover:text-primary underline underline-offset-2 flex items-center gap-1"
            >
              {reviewing && <Loader2 size={11} className="animate-spin" />}{" "}
              Re-Analyze
            </button>
          </div>

          {/* 可编辑的修构反馈框 (融合 AI 意见 + 用户自定义要求) */}
          <div className="flex flex-col gap-2">
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="Critique & User Modifications..."
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

      {/* 💻 3. Code Editor */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-2 border-b border-border/40 text-[11px] text-muted flex items-center justify-between bg-background/30">
          <span>JavaScript (Three.js)</span>
          <span className="text-[10px] opacity-60">⌘/Ctrl+Enter to run</span>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="h-[280px] w-full flex-1 resize-none bg-background/50 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground focus:outline-none lg:h-[380px]"
        />
      </div>
    </div>
  );
};

const PreviewPanel = ({ containerRef, stats, error, t }: any) => (
  <div className="relative min-h-[360px] flex-1 bg-background lg:min-h-[520px]">
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
    />
    <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between items-center">
      <div className="pointer-events-auto rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[11px] text-primary backdrop-blur-sm">
        {t.triangles}: {stats.triangles} | {t.vertices}: {stats.vertices}
      </div>
    </div>
    {error && (
      <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto whitespace-pre-wrap border-t border-red-900/60 bg-red-950/90 px-4 py-3 font-mono text-xs text-red-300">
        {error}
      </div>
    )}
  </div>
);

// ==========================================
// 3. Main Export Component
// ==========================================
export function ModelGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);

  // State Management
  const [lang, setLang] = useState<Lang>("en");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].value);
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState<Stats>({ triangles: 0, vertices: 0 });
  const [error, setError] = useState<string | null>(null);

  // UX & Agent State
  const [autoReview, setAutoReview] = useState(true); // 默认开启自动视觉评审
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedbackInput, setFeedbackInput] = useState(""); // 融合 AI 与用户输入的反馈框
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const t = TRANSLATIONS[lang];
  const engine = useThreeEngine(containerRef, setError, setStats);

  // 1. 发起 Review
  const triggerReview = async (customDesc?: string) => {
    const descToUse = customDesc || description.trim();
    if (!descToUse) return null;

    const screenshot = engine.captureImage();
    if (!screenshot) return null;

    setReviewing(true);
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
      if (data.critique) {
        setFeedbackInput(data.critique); // 自动把 AI 评审填入可编辑框
      }
      return data;
    } catch (err) {
      setError(
        "Review failed: " + (err instanceof Error ? err.message : String(err)),
      );
      return null;
    } finally {
      setReviewing(false);
    }
  };

  // 2. 初次生成
  const handleGenerate = async () => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");

    setGenerating(true);
    setError(null);
    setVerdict(null);
    setFeedbackInput("");

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
      engine.executeCode(data.code, wireframe);

      // 🌟 如果勾选了 Auto Vision-Review，生成完自动触发视觉评审！
      if (autoReview) {
        setTimeout(() => triggerReview(desc), 300);
      }
    } catch (err) {
      setError(
        "Generate failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setGenerating(false);
    }
  };

  // 3. 带反馈的迭代生成 (Refine)
  const handleRefine = async () => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");
    if (!feedbackInput.trim()) return setError("Feedback is empty.");

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          previousCode: code,
          feedback: feedbackInput.trim(), // 🌟 发送用户/AI 共同修改后的反馈
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCode(data.code);
      engine.executeCode(data.code, wireframe);

      // 迭代后再次自动 Review 检查结果
      if (autoReview) {
        setTimeout(() => triggerReview(desc), 300);
      }
    } catch (err) {
      setError(
        "Refine failed: " + (err instanceof Error ? err.message : String(err)),
      );
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
