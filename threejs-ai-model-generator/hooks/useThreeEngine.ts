"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { Stats } from "../types";

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

  // 🌟 分解图控制：factor 从 0(正常装配状态)到 1(完全分解)。executeCode 每次成功
  // 构建之后,会给模型的每个顶层部件记录好"原始位置"和"从模型中心指向它的方向",
  // 这里只是沿着那个方向做纯几何插值——不需要重新生成或重新执行代码,可以直接
  // 绑一个 slider 拖着实时看。
  const setExplodeFactor = useCallback((factor: number) => {
    const engine = engineRef.current;
    if (!engine || !engine.modelGroup.children.length) return;
    const result = engine.modelGroup.children[0];
    if (!result || !result.userData?.__explodeReady) return;
    const clamped = Math.max(0, Math.min(1, factor));
    const baseDistance = engine.explodeBaseDistance ?? 1;
    result.children.forEach((child: any) => {
      const origin = child.userData.__originPos;
      const dir = child.userData.__explodeDir;
      if (!origin || !dir) return;
      child.position.copy(origin).addScaledVector(dir, clamped * baseDistance);
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

          // 🌟 包含式检查：整个 mesh 是否落在某个锚点部件的范围内(带一点容差)。
          // 适用于"这个部件整体贴在另一个部件里面"的场景,比如 A 柱贴着同一块玻璃舱。
          function assertWithinBounds(mesh, anchorMesh, opts) {
            const tolerance = (opts && opts.tolerance) ?? 0.2;
            const childBox = new THREE.Box3().setFromObject(mesh);
            const anchorBox = new THREE.Box3().setFromObject(anchorMesh);
            if (childBox.isEmpty() || anchorBox.isEmpty()) return mesh;
            const anchorSize = new THREE.Vector3();
            anchorBox.getSize(anchorSize);
            const maxExtent = Math.max(anchorSize.x, anchorSize.y, anchorSize.z) || 0.01;
            const expandedAnchorBox = anchorBox.clone().expandByScalar(maxExtent * tolerance);
            if (!expandedAnchorBox.containsBox(childBox)) {
              const childName = mesh.name || "(unnamed part)";
              const anchorName = anchorMesh.name || "(unnamed anchor)";
              throw new Error(
                'Attachment check failed: "' + childName + '" falls outside the expected bounds of its anchor "' +
                anchorName + '" (tolerance: ' + (tolerance * 100).toFixed(0) + '% of anchor size). ' +
                'This usually means a coordinate was computed against the wrong reference point — ' +
                'check the endpoints/position passed for "' + childName + '".'
              );
            }
            return mesh;
          }

          // 🌟 单点邻近检查：只校验一个 3D 端点是否落在某个锚点部件附近,不要求整根
          // 梁都塞进锚点的包围盒。适用于"这一端连着这个部件"的跨接场景,比如两根柱子
          // 之间的横梁的其中一端,或者从座位连到地面的凳腿的"座位那一端"。
          function assertPointNear(point, anchorMesh, opts) {
            const tolerance = (opts && opts.tolerance) ?? 0.3;
            const anchorBox = new THREE.Box3().setFromObject(anchorMesh);
            if (anchorBox.isEmpty()) return point;
            const anchorSize = new THREE.Vector3();
            anchorBox.getSize(anchorSize);
            const maxExtent = Math.max(anchorSize.x, anchorSize.y, anchorSize.z) || 0.01;
            const expandedBox = anchorBox.clone().expandByScalar(maxExtent * tolerance);
            if (!expandedBox.containsPoint(point)) {
              const anchorName = anchorMesh.name || "(unnamed anchor)";
              throw new Error(
                'Attachment check failed: a beam endpoint at (' + point.x.toFixed(3) + ', ' + point.y.toFixed(3) + ', ' + point.z.toFixed(3) +
                ') falls outside the expected bounds of its anchor "' + anchorName + '" (tolerance: ' + (tolerance * 100).toFixed(0) + '% of anchor size). ' +
                'Double-check the coordinate you passed for this endpoint against where "' + anchorName + '" actually is.'
              );
            }
            return point;
          }

          // 🌟 两点之间搭一根杆（A柱、结构梁、肢体连杆等）,用四元数对齐,调用方永远
          // 不需要手动猜 rotation.x/y/z 该转哪个轴、转多少度。第 4 个参数可选,有两种
          // 传法,分别对应两种完全不同的依附关系：
          //
          //   1) 传一个 mesh —— "包含式"：整根梁都应该贴在这一个部件里面
          //      （比如 A 柱贴着同一块挡风玻璃舱）。用 assertWithinBounds 整根检查。
          //      例：buildBeamBetween(p1, p2, t, cabinMesh)
          //
          //   2) 传 { start, end } —— "跨接式"：这根梁两端分别连着两个不同的部件
          //      （比如连接两根不同柱子的横梁,或者从座位连到地面的凳腿）。
          //      start / end 都是可选的,只校验你实际传了的那一端——凳腿连地面的那一端
          //      往往没有对应的 mesh,直接不传那一侧就行。
          //      例：buildBeamBetween(p1, p2, t, { start: pillarA, end: pillarB })
          //      例：buildBeamBetween(p1, p2, t, { start: seatMesh })  // 另一端接地面,不传
          //
          // 两种情况下,端点算错、杆子捅到错误的地方时都会当场报错(附带具体端点坐标),
          // 而不是悄悄渲染出一根穿模或者飘在半空的杆子。
          function buildBeamBetween(p1, p2, thickness, anchors) {
            const start = new THREE.Vector3(p1[0], p1[1], p1[2] ?? 0);
            const end = new THREE.Vector3(p2[0], p2[1], p2[2] ?? 0);
            const dir = new THREE.Vector3().subVectors(end, start);
            const length = dir.length();
            const geo = new THREE.CylinderGeometry(thickness, thickness, length, 6);
            geo.translate(0, length / 2, 0); // 原点对齐到起点 p1,方便直接用 position.copy(start)
            const mesh = new THREE.Mesh(geo);
            mesh.position.copy(start);
            mesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              dir.clone().normalize(),
            );

            if (anchors) {
              if (anchors.isObject3D) {
                // 单一 mesh：包含式检查
                assertWithinBounds(mesh, anchors, { tolerance: 0.15 });
              } else {
                // { start, end } 对象：跨接式检查,每端各自独立校验
                if (anchors.start) assertPointNear(start, anchors.start, { tolerance: 0.3 });
                if (anchors.end) assertPointNear(end, anchors.end, { tolerance: 0.3 });
              }
            }

            return mesh;
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

          // 🌟 分解图支持：记录每个顶层命名部件当前的位置,以及"从模型中心指向
          // 该部件"的方向。之后 setExplodeFactor(0~1) 可以随时无损地沿这个方向
          // 把部件推开或收回,不依赖重新生成代码,纯几何计算。
          let maxChildDistance = 0;
          result.children.forEach((child: any) => {
            const childBox = new THREE.Box3().setFromObject(child);
            if (childBox.isEmpty()) return;
            const childCenter = new THREE.Vector3();
            childBox.getCenter(childCenter);
            const dir = childCenter.clone().sub(center);
            const dist = dir.length();
            if (dist > maxChildDistance) maxChildDistance = dist;
            child.userData.__originPos = child.position.clone();
            child.userData.__explodeDir =
              dist > 0.0001 ? dir.normalize() : new THREE.Vector3(0, 1, 0);
          });
          result.userData.__explodeReady = true;
          engine.explodeBaseDistance = Math.max(
            maxDim * 0.6,
            maxChildDistance * 1.2,
            0.5,
          );
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
    setExplodeFactor,
  };
}
