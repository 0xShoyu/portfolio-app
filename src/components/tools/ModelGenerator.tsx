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
} from "lucide-react";
import {
  DEFAULT_CODE,
  GEMINI_MODELS,
  TRANSLATIONS,
  isDefaultCode,
  type Lang,
} from "./modelGenerator.constants";

// ==========================================
// 1. Types & Interfaces
// ==========================================
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
// 2. Custom Hook: Three.js Engine Logic
// 核心逻辑分离：负责所有 Three.js 的初始化、渲染循环、相机控制和内存清理
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
            if (m.map) m.map.dispose(); // 防止贴图内存泄漏
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
          throw new Error(
            "buildModel(THREE) must return a THREE.Object3D (Mesh or Group)",
          );
        }

        // 🌟 防呆设计：强制为所有生成的物体开启阴影接收与投射
        result.traverse((o: any) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });

        engine.modelGroup.add(result);
        applyWireframe(isWireframe);

        // 计算包围盒并自动适配相机视角
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

        // 更新统计数据
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

  // 引擎初始化
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

    // 🌟 开启全局阴影映射 (Cozy 风格必备)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 灯光系统
    scene.add(new THREE.HemisphereLight(0x8fa3bf, 0x0e131b, 0.5)); // 降低环境光，增强阴影对比

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true; // 🌟 开启主光阴影
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4488aa, 0.3);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    // 地面系统
    const grid = new THREE.GridHelper(4, 16, 0x2a3446, 0x1a2130);
    scene.add(grid);

    // 🌟 阴影捕获层：放在网格下面，用来承接物体的阴影
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.6 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01; // 稍微下沉一点，避免和网格 Z-Fighting
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // 相机与控制状态
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

    // 交互与渲染循环逻辑 (省略具体绑定，保持原有控制不变)
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

      // Auto-pan: 当没有交互时，模型自带缓慢自转，增加生命力
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
// 3. Sub-components (UI Separation)
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

const CodeEditorPanel = ({
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
  onGenerate,
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
    <div className="flex flex-col border-b border-border/60 lg:w-[44%] lg:border-b-0 lg:border-r">
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
        <p className="text-[10px] leading-snug text-muted">{t.keyHint}</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGenerate(false)}
            placeholder={t.descPlaceholder}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => onGenerate(false)}
            disabled={generating}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {t.generate}
          </button>
        </div>
      </div>
      <p className="border-b border-border/60 px-4 py-2.5 text-[11px] leading-relaxed text-muted">
        {t.hint}
      </p>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="h-[360px] w-full flex-1 resize-none bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus:outline-none lg:h-[520px]"
      />
    </div>
  );
};

const PreviewPanel = ({
  containerRef,
  stats,
  verdict,
  error,
  lastCritique,
  reviewing,
  onReview,
  onRegenerate,
  generating,
  t,
}: any) => (
  <div className="relative min-h-[360px] flex-1 bg-background lg:min-h-[520px]">
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
    />
    <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2">
      <div className="pointer-events-auto w-fit rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[11px] text-primary backdrop-blur-sm">
        {t.triangles}: {stats.triangles} | {t.vertices}: {stats.vertices}
      </div>
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <button
          onClick={onReview}
          disabled={reviewing}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur-sm hover:text-foreground disabled:opacity-50"
        >
          {reviewing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}
          {t.review}
        </button>
        {verdict?.decision === "refine" && (
          <button
            onClick={() => onRegenerate(true)}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary backdrop-blur-sm hover:bg-primary/20 disabled:opacity-50"
          >
            <RotateCcw size={12} /> {t.regenerate}
          </button>
        )}
        {verdict && (
          <span
            className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] backdrop-blur-sm ${verdict.decision === "continue" ? "border-emerald-800 text-emerald-400" : "border-amber-800 text-amber-400"}`}
          >
            {verdict.decision === "continue"
              ? t.verdictContinue
              : t.verdictRefine}{" "}
            ({Math.round(verdict.score * 100)}%)
          </span>
        )}
      </div>
    </div>
    {error && (
      <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto whitespace-pre-wrap border-t border-red-900/60 bg-red-950/90 px-4 py-3 font-mono text-xs text-red-300">
        {error}
      </div>
    )}
    {!error && verdict?.decision === "refine" && lastCritique && (
      <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto whitespace-pre-wrap border-t border-primary/40 bg-background/95 px-4 py-3 font-mono text-xs text-primary">
        💬 {lastCritique}
      </div>
    )}
  </div>
);

// ==========================================
// 4. Main Export Component (The Glue)
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

  // AI Loop State
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [lastCritique, setLastCritique] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const t = TRANSLATIONS[lang];

  // Use separated engine hook
  const engine = useThreeEngine(containerRef, setError, setStats);

  // 初次加载默认模型
  useEffect(() => {}, []);

  const handleLangChange = (newLang: Lang) => {
    if (isDefaultCode(code)) setCode(DEFAULT_CODE[newLang]);
    setLang(newLang);
  };

  const handleWireframeToggle = (checked: boolean) => {
    setWireframe(checked);
    engine.applyWireframe(checked);
  };

  const handleClear = () => {
    setCode("");
    engine.clearModel();
    setStats({ triangles: 0, vertices: 0 });
    setError(null);
    setVerdict(null);
    setLastCritique("");
  };

  const handleGenerate = async (useFeedback: boolean) => {
    const desc = description.trim();
    if (!desc) return setError("Enter a description first.");

    setGenerating(true);
    setError(null);
    setVerdict(null);
    try {
      const body = useFeedback
        ? {
            description: desc,
            previousCode: code,
            feedback: lastCritique,
            apiKey: apiKey.trim() || undefined,
            model,
          }
        : { description: desc, apiKey: apiKey.trim() || undefined, model };

      const res = await fetch("/api/generate-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCode(data.code);
      engine.executeCode(data.code, wireframe);
    } catch (err) {
      setError(
        "Generate failed: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async () => {
    if (!description.trim())
      return setError(
        "Enter a description above first, so Review knows what to check against.",
      );
    const screenshot = engine.captureImage();
    if (!screenshot) return;

    setReviewing(true);
    try {
      const res = await fetch("/api/review-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          screenshot,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setVerdict(data);
      setLastCritique(
        data.decision === "refine" && data.critique ? data.critique : "",
      );
    } catch (err) {
      setError(
        "Review failed: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Toolbar
        t={t}
        lang={lang}
        setLang={handleLangChange}
        wireframe={wireframe}
        setWireframe={handleWireframeToggle}
        onClear={handleClear}
        onRun={() => engine.executeCode(code, wireframe)}
      />
      <div className="flex flex-col lg:flex-row">
        <CodeEditorPanel
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
          onGenerate={handleGenerate}
          onRun={() => engine.executeCode(code, wireframe)}
        />
        <PreviewPanel
          containerRef={containerRef}
          stats={stats}
          verdict={verdict}
          error={error}
          lastCritique={lastCritique}
          reviewing={reviewing}
          generating={generating}
          onReview={handleReview}
          onRegenerate={handleGenerate}
          t={t}
        />
      </div>
    </div>
  );
}
