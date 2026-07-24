"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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

interface Verdict {
  decision: "continue" | "refine";
  score: number;
  critique?: string;
}

interface EngineState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  modelGroup: THREE.Group;
  rotY: number;
  elevation: number;
  camDistance: number;
  minDist: number;
  maxDist: number;
  lookTarget: THREE.Vector3;
  dragging: boolean;
  lastX: number;
  lastY: number;
  activePointers: Map<number, { x: number; y: number }>;
  pinchStartDist: number | null;
  pinchStartCamDist: number | null;
  frameId: number;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function ModelGenerator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<EngineState | null>(null);

  const [lang, setLang] = useState<Lang>("en");
  const [code, setCode] = useState(DEFAULT_CODE.en);
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].value);
  const [wireframe, setWireframe] = useState(false);
  const [stats, setStats] = useState({ triangles: 0, vertices: 0 });
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [lastCritique, setLastCritique] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const t = TRANSLATIONS[lang];

  // ---------- 场景内部辅助函数 ----------
  const clearModel = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    while (engine.modelGroup.children.length) {
      const obj = engine.modelGroup.children.pop()!;
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
  }, []);

  const applyWireframeToModel = useCallback((wf: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.modelGroup.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => {
          (m as THREE.MeshStandardMaterial).wireframe = wf;
        });
      }
    });
  }, []);

  const fitCameraToObject = useCallback((object: THREE.Object3D) => {
    const engine = engineRef.current;
    if (!engine) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      engine.camDistance = 3;
      engine.lookTarget.set(0, 0.4, 0);
      return;
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fitDist =
      (maxDim / (2 * Math.tan((engine.camera.fov * Math.PI) / 180 / 2))) * 1.8;
    engine.camDistance = fitDist;
    engine.minDist = fitDist * 0.15;
    engine.maxDist = fitDist * 8;
    engine.lookTarget.copy(center);
  }, []);

  const updateStats = useCallback((object: THREE.Object3D) => {
    let tris = 0;
    let verts = 0;
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        const g = mesh.geometry;
        const posCount = g.attributes.position
          ? g.attributes.position.count
          : 0;
        verts += posCount;
        tris += g.index ? g.index.count / 3 : posCount / 3;
      }
    });
    setStats({ triangles: Math.round(tris), vertices: verts });
  }, []);

  const runUserCode = useCallback(
    (codeStr: string) => {
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
          throw new Error(t.errNotObject);
        }
        engine.modelGroup.add(result);
        applyWireframeToModel(wireframe);
        fitCameraToObject(result);
        updateStats(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      clearModel,
      applyWireframeToModel,
      fitCameraToObject,
      updateStats,
      wireframe,
      t.errNotObject,
    ],
  );

  // ---------- Three.js 场景搭建（只跑一次） ----------
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
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x8fa3bf, 0x0e131b, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4488aa, 0.25);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(4, 16, 0x2a3446, 0x1a2130);
    scene.add(grid);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const engine: EngineState = {
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
      pinchStartDist: null,
      pinchStartCamDist: null,
      frameId: 0,
    };
    engineRef.current = engine;

    function updateCamera() {
      const h = engine.camDistance * Math.cos(engine.elevation);
      const y = engine.camDistance * Math.sin(engine.elevation);
      camera.position.set(
        engine.lookTarget.x,
        engine.lookTarget.y + y,
        engine.lookTarget.z + h,
      );
      camera.lookAt(engine.lookTarget);
    }

    function pointerDist() {
      const pts = Array.from(engine.activePointers.values());
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    function onPointerDown(e: PointerEvent) {
      container!.setPointerCapture(e.pointerId);
      engine.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (engine.activePointers.size === 1) {
        engine.dragging = true;
        engine.lastX = e.clientX;
        engine.lastY = e.clientY;
      } else if (engine.activePointers.size === 2) {
        engine.dragging = false;
        engine.pinchStartDist = pointerDist();
        engine.pinchStartCamDist = engine.camDistance;
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!engine.activePointers.has(e.pointerId)) return;
      engine.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (engine.activePointers.size === 2) {
        const d = pointerDist();
        if (engine.pinchStartDist && engine.pinchStartCamDist) {
          engine.camDistance = clamp(
            engine.pinchStartCamDist * (engine.pinchStartDist / d),
            engine.minDist,
            engine.maxDist,
          );
        }
        return;
      }
      if (engine.dragging && engine.activePointers.size === 1) {
        const dx = e.clientX - engine.lastX;
        const dy = e.clientY - engine.lastY;
        engine.lastX = e.clientX;
        engine.lastY = e.clientY;
        engine.rotY += dx * 0.008;
        engine.elevation = clamp(engine.elevation + dy * 0.008, -1.4, 1.4);
      }
    }

    function endPointer(e: PointerEvent) {
      engine.activePointers.delete(e.pointerId);
      if (engine.activePointers.size === 0) engine.dragging = false;
      else if (engine.activePointers.size === 1) {
        engine.dragging = true;
        const [p] = engine.activePointers.values();
        engine.lastX = p.x;
        engine.lastY = p.y;
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      engine.camDistance = clamp(
        engine.camDistance + e.deltaY * 0.0015 * engine.camDistance,
        engine.minDist,
        engine.maxDist,
      );
    }

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", endPointer);
    container.addEventListener("pointercancel", endPointer);
    container.addEventListener("wheel", onWheel, { passive: false });

    function onResize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    onResize();

    function animate() {
      engine.frameId = requestAnimationFrame(animate);
      updateCamera();
      engine.modelGroup.rotation.y = engine.rotY;
      renderer.render(scene, camera);
    }
    animate();

    // 场景就绪后跑一次默认示例
    runUserCode(DEFAULT_CODE.en);

    return () => {
      cancelAnimationFrame(engine.frameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endPointer);
      container.removeEventListener("pointercancel", endPointer);
      container.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 交互操作 ----------
  const resetVerdict = useCallback(() => {
    setVerdict(null);
    setLastCritique("");
  }, []);

  const handleGenerate = useCallback(
    async (useFeedback: boolean) => {
      const desc = description.trim();
      if (!desc) {
        setError("Enter a description first.");
        return;
      }
      setGenerating(true);
      setError(null);
      resetVerdict();
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
        runUserCode(data.code);
      } catch (err) {
        setError(
          "Generate failed: " +
            (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setGenerating(false);
      }
    },
    [description, code, lastCritique, apiKey, model, runUserCode, resetVerdict],
  );

  const handleReview = useCallback(async () => {
    const desc = description.trim();
    if (!desc) {
      setError(
        "Enter a description above first, so Review knows what to check against.",
      );
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    setReviewing(true);
    try {
      engine.renderer.render(engine.scene, engine.camera);
      const screenshot = engine.renderer.domElement.toDataURL("image/png");
      const res = await fetch("/api/review-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          screenshot,
          apiKey: apiKey.trim() || undefined,
          model,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVerdict(data as Verdict);
      if (data.decision === "refine" && data.critique) {
        setLastCritique(data.critique);
      } else {
        setLastCritique("");
      }
    } catch (err) {
      setError(
        "Review failed: " + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setReviewing(false);
    }
  }, [description, apiKey, model]);

  const handleClear = useCallback(() => {
    setCode("");
    clearModel();
    setStats({ triangles: 0, vertices: 0 });
    setError(null);
    resetVerdict();
    textareaRef.current?.focus();
  }, [clearModel, resetVerdict]);

  const handleLangChange = useCallback(
    (newLang: Lang) => {
      if (isDefaultCode(code)) {
        setCode(DEFAULT_CODE[newLang]);
      }
      setLang(newLang);
    },
    [code],
  );

  const handleWireframeToggle = useCallback(
    (checked: boolean) => {
      setWireframe(checked);
      applyWireframeToModel(checked);
    },
    [applyWireframeToModel],
  );

  const handleTextareaKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newValue = code.slice(0, start) + "  " + code.slice(end);
        setCode(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runUserCode(code);
      }
    },
    [code, runUserCode],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 顶部工具栏 */}
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
            onChange={(e) => handleLangChange(e.target.value as Lang)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            <option value="en">EN</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => handleWireframeToggle(e.target.checked)}
            />
            {t.wireframe}
          </label>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <Trash2 size={13} />
            {t.clear}
          </button>
          <button
            onClick={() => runUserCode(code)}
            className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Play size={13} />
            {t.run}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* 代码面板 */}
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
                onKeyDown={(e) => e.key === "Enter" && handleGenerate(false)}
                placeholder={t.descPlaceholder}
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
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
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            className="h-[360px] w-full flex-1 resize-none bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus:outline-none lg:h-[520px]"
          />
        </div>

        {/* 预览面板 */}
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
                onClick={handleReview}
                disabled={reviewing}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur-sm transition-colors hover:text-foreground disabled:opacity-50"
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
                  onClick={() => handleGenerate(true)}
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary backdrop-blur-sm transition-colors hover:bg-primary/20 disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  {t.regenerate}
                </button>
              )}
              {verdict && (
                <span
                  className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] backdrop-blur-sm ${
                    verdict.decision === "continue"
                      ? "border-emerald-800 text-emerald-400"
                      : "border-amber-800 text-amber-400"
                  }`}
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
      </div>
    </div>
  );
}
