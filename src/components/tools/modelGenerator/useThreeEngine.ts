"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { Stats } from "./types";

export function useThreeEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onError: (err: string | null) => void,
  onStatsUpdate: (stats: Stats) => void,
) {
  const engineRef = useRef<any>(null);

  // 1. 切换 WebGL 画布背景与网格主题
  const setCanvasTheme = useCallback((mode: "dark" | "day") => {
    const engine = engineRef.current;
    if (!engine) return;

    if (mode === "day") {
      engine.scene.background = new THREE.Color(0xf1f5f9);
      engine.scene.remove(engine.grid);
      engine.grid.geometry.dispose();
      engine.grid.material.dispose();
      engine.grid = new THREE.GridHelper(4, 16, 0x94a3b8, 0xcbd5e1);
      engine.scene.add(engine.grid);
    } else {
      engine.scene.background = new THREE.Color(0x0b0f16);
      engine.scene.remove(engine.grid);
      engine.grid.geometry.dispose();
      engine.grid.material.dispose();
      engine.grid = new THREE.GridHelper(4, 16, 0x2a3446, 0x1a2130);
      engine.scene.add(engine.grid);
    }
  }, []);

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
    (codeStr: string, isWireframe: boolean): boolean => {
      const engine = engineRef.current;
      if (!engine) return false;

      try {
        clearModel();

        const HELPER_FUNCTIONS = `
          function buildExtrudeShape(points, holes) {
            const shape = new THREE.Shape();
            if (points.length > 0) {
              shape.moveTo(points[0][0], points[0][1]);
              for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
            }
            for (const loop of holes ?? []) {
              if (loop.length < 3) continue;
              const path = new THREE.Path();
              path.moveTo(loop[0][0], loop[0][1]);
              for (let i = 1; i < loop.length; i++) path.lineTo(loop[i][0], loop[i][1]);
              path.closePath();
              shape.holes.push(path);
            }
            return shape;
          }

          function ovalLoop(cx, cy, rx, ry, seg = 24) {
            const loop = [];
            for (let i = 0; i < seg; i++) {
              const a = (i / seg) * Math.PI * 2;
              loop.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
            }
            return loop;
          }

          function buildExtrudeGeometry(profile) {
            const holes = [...(profile.holes ?? []), ...((profile.ovalHoles ?? []).map(o => ovalLoop(o.cx, o.cy, o.rx, o.ry)))];
            const shape = buildExtrudeShape(profile.points, holes);
            return new THREE.ExtrudeGeometry(shape, { depth: profile.depth, bevelEnabled: false, steps: 1 });
          }

          function buildCurveSweepGeometry(sweep) {
            const shape = new THREE.Shape();
            const cs = sweep.crossSection.points;
            if (cs.length > 0) {
              shape.moveTo(cs[0][0], cs[0][1]);
              for (let i = 1; i < cs.length; i++) shape.lineTo(cs[i][0], cs[i][1]);
              shape.closePath();
            }
            const spine = sweep.spine.map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const path = new THREE.CatmullRomCurve3(spine, sweep.closed ?? false);
            return new THREE.ExtrudeGeometry(shape, { extrudePath: path, steps: Math.max(24, spine.length * 8), bevelEnabled: false });
          }

          function buildLatheGeometry(profile) {
            const points = profile.points.map(p => new THREE.Vector2(Math.max(0.0001, p[0]), p[1]));
            return new THREE.LatheGeometry(points, profile.segments ?? 24);
          }

          function buildTubeGeometry(path) {
            const vectors = path.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const curve = new THREE.CatmullRomCurve3(vectors, path.closed ?? false);
            const tubularSegments = Math.max(8, path.points.length * 6);
            return new THREE.TubeGeometry(curve, tubularSegments, path.radius ?? 0.05, path.radialSegments ?? 8, path.closed ?? false);
          }
        `;

        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const fn = new Function(
          "THREE",
          HELPER_FUNCTIONS + "\n" + codeStr + "\n;return buildModel(THREE);",
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
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onError(msg);
        return false;
      }
    },
    [clearModel, applyWireframe, onError, onStatsUpdate],
  );

  // 🌟 核心修复：无变形、完美长宽比、高对比度离屏多视角截图
  const captureImage = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return null;

    const container = containerRef.current;
    const origWidth = container?.clientWidth || 800;
    const origHeight = container?.clientHeight || 600;
    const origAspect = engine.camera.aspect;
    const origRotY = engine.rotY;
    const origElevation = engine.elevation;

    // 1. 创建 1024x512 拼接画布
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = 1024;
    combinedCanvas.height = 512;
    const ctx = combinedCanvas.getContext("2d");
    if (!ctx) return null;

    // 2. 🌟 强制将渲染器临时切为 512x512 正方形，比例为 1.0 (无变形!)
    engine.renderer.setSize(512, 512, false);
    engine.camera.aspect = 1.0;
    engine.camera.updateProjectionMatrix();

    const renderAngleToCanvas = (
      rotY: number,
      elevation: number,
      offsetX: number,
    ) => {
      engine.rotY = rotY;
      engine.elevation = elevation;

      const h = engine.camDistance * Math.cos(engine.elevation);
      const y = engine.camDistance * Math.sin(engine.elevation);
      engine.camera.position.set(
        engine.lookTarget.x,
        engine.lookTarget.y + y,
        engine.lookTarget.z + h,
      );
      engine.camera.lookAt(engine.lookTarget);
      engine.modelGroup.rotation.y = engine.rotY;

      engine.renderer.render(engine.scene, engine.camera);
      ctx.drawImage(engine.renderer.domElement, offsetX, 0, 512, 512);
    };

    // 📸 视角 A：视角 45°，俯角 0.48 (约 28° 俯视，看清顶部和底座)
    renderAngleToCanvas(Math.PI / 4, 0.48, 0);

    // 📸 视角 B：视角 -60°，俯角 0.52 (约 30° 俯视)
    renderAngleToCanvas(-Math.PI / 3, 0.52, 512);

    // 3. 还原渲染器尺寸、相机比例与旋转视角
    engine.renderer.setSize(origWidth, origHeight, false);
    engine.camera.aspect = origAspect;
    engine.camera.updateProjectionMatrix();

    engine.rotY = origRotY;
    engine.elevation = origElevation;
    engine.modelGroup.rotation.y = engine.rotY;
    const h = engine.camDistance * Math.cos(engine.elevation);
    const y = engine.camDistance * Math.sin(engine.elevation);
    engine.camera.position.set(
      engine.lookTarget.x,
      engine.lookTarget.y + y,
      engine.lookTarget.z + h,
    );
    engine.camera.lookAt(engine.lookTarget);
    engine.renderer.render(engine.scene, engine.camera);

    return combinedCanvas.toDataURL("image/png");
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

    scene.add(new THREE.HemisphereLight(0x8fa3bf, 0x0e131b, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // 🌟 增强补光灯 (intensity 从 0.3 -> 0.55, 位置调低)，照亮底部和阴影细节！
    const fillLight = new THREE.DirectionalLight(0x66aacc, 0.55);
    fillLight.position.set(-4, -1, -3);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(4, 16, 0x2a3446, 0x1a2130);
    scene.add(grid);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.5 }),
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
      grid,
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
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
  }, []);

  return {
    executeCode,
    clearModel,
    captureImage,
    applyWireframe,
    setCanvasTheme,
  };
}
