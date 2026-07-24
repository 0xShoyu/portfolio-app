export type Lang = "en" | "zh" | "ja";

export const GEMINI_MODELS = [
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
] as const;

interface Translation {
  title: string;
  subtitle: string;
  wireframe: string;
  run: string;
  clear: string;
  tabPreview: string;
  tabCode: string;
  hint: string;
  triangles: string;
  vertices: string;
  errNotObject: string;
  errRender: string;
  descPlaceholder: string;
  generate: string;
  review: string;
  regenerate: string;
  keyPlaceholder: string;
  keyHint: string;
  verdictContinue: string;
  verdictRefine: string;
}

export const TRANSLATIONS: Record<Lang, Translation> = {
  en: {
    title: "3D Model Previewer & Generator",
    subtitle: "Describe a shape, watch it render live.",
    wireframe: "Wireframe",
    run: "Run",
    clear: "Clear",
    tabPreview: "Preview",
    tabCode: "Code",
    hint: "Write a function buildModel(THREE) { ... return group; } — return a Mesh or Group. Camera, lighting, rotation and auto-fit are handled for you. (⌘/Ctrl+Enter to run)",
    triangles: "Triangles",
    vertices: "Vertices",
    errNotObject:
      "buildModel(THREE) must return a THREE.Object3D (a Mesh or Group)",
    errRender: "Render error: ",
    descPlaceholder: "Describe a model… e.g. a chibi astronaut with a jetpack",
    generate: "Generate",
    review: "Review",
    regenerate: "Regenerate",
    keyPlaceholder: "Gemini API key (session only, never saved)",
    keyHint:
      "Only kept in memory for this tab — gone on refresh, never stored or sent anywhere but this site's own API routes.",
    verdictContinue: "Looks good",
    verdictRefine: "Needs work",
  },
  zh: {
    title: "3D 模型预览与生成器",
    subtitle: "描述一个形状，实时看它渲染出来。",
    wireframe: "线框",
    run: "运行",
    clear: "清空",
    tabPreview: "预览",
    tabCode: "代码",
    hint: "写一个 function buildModel(THREE) { ... return group; }，返回一个 Mesh 或 Group 即可，摄像机/灯光/旋转由预览器自动处理。(⌘/Ctrl+Enter 运行)",
    triangles: "三角面",
    vertices: "顶点",
    errNotObject:
      "buildModel(THREE) 必须 return 一个 THREE.Object3D（Mesh 或 Group）",
    errRender: "渲染错误: ",
    descPlaceholder: '描述一个模型…比如"背着喷射背包的圆滚滚宇航员"',
    generate: "生成",
    review: "评审",
    regenerate: "重新生成",
    keyPlaceholder: "Gemini API key（只在本次会话有效，不会保存）",
    keyHint: "只存在这个标签页的内存里——刷新就没了，只会发给本站自己的接口。",
    verdictContinue: "看起来不错",
    verdictRefine: "需要改进",
  },
  ja: {
    title: "3Dモデル プレビュー＆ジェネレーター",
    subtitle: "形を説明すると、その場でレンダリングされます。",
    wireframe: "ワイヤーフレーム",
    run: "実行",
    clear: "クリア",
    tabPreview: "プレビュー",
    tabCode: "コード",
    hint: "function buildModel(THREE) { ... return group; } を書いてください。Mesh か Group を return するだけで、カメラ・ライト・回転・自動フィットは自動処理されます。(⌘/Ctrl+Enter で実行)",
    triangles: "三角形",
    vertices: "頂点",
    errNotObject:
      "buildModel(THREE) は THREE.Object3D（Mesh または Group）を return する必要があります",
    errRender: "レンダリングエラー: ",
    descPlaceholder:
      "モデルを説明…例：ジェットパックを背負ったちびキャラの宇宙飛行士",
    generate: "生成",
    review: "レビュー",
    regenerate: "再生成",
    keyPlaceholder: "Gemini APIキー（このセッションのみ、保存されません）",
    keyHint:
      "このタブのメモリ内にのみ保持されます。リロードすると消え、このサイト自身のAPI以外には送信されません。",
    verdictContinue: "良好",
    verdictRefine: "要改善",
  },
};

function makeDefaultCode(comments: {
  legs: string;
  torso: string;
  head: string;
  visor: string;
  jetpack: string;
  nozzle: string;
}): string {
  return `function buildModel(THREE) {
  const HEIGHTS = { LEG: 0.4, TORSO: 0.5, HEAD: 0.3, JETPACK: 0.45 };
  const group = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.7 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x1a2a33, roughness: 0.3, metalness: 0.4 });
  const jetpackMat = new THREE.MeshStandardMaterial({ color: 0x333844, roughness: 0.6 });
  const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.2 });

  ${comments.legs}
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.32, HEIGHTS.LEG, 0.22), suitMat);
  legs.position.y = HEIGHTS.LEG / 2;
  group.add(legs);

  ${comments.torso}
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, HEIGHTS.TORSO, 0.26), suitMat);
  torso.position.y = HEIGHTS.LEG + HEIGHTS.TORSO / 2;
  group.add(torso);

  ${comments.head}
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, HEIGHTS.HEAD, 0.28), suitMat);
  head.position.y = HEIGHTS.LEG + HEIGHTS.TORSO + HEIGHTS.HEAD / 2;
  group.add(head);

  ${comments.visor}
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.03), visorMat);
  visor.position.set(0, HEIGHTS.LEG + HEIGHTS.TORSO + HEIGHTS.HEAD / 2, 0.14);
  group.add(visor);

  ${comments.jetpack}
  const jetpack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, HEIGHTS.JETPACK, 8), jetpackMat);
  jetpack.position.set(0, HEIGHTS.LEG + HEIGHTS.TORSO / 2 + 0.05, -0.19);
  group.add(jetpack);

  ${comments.nozzle}
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.08, 8), thrusterMat);
  nozzle.position.set(0, HEIGHTS.LEG, -0.19);
  group.add(nozzle);

  return group;
}`;
}

export const DEFAULT_CODE: Record<Lang, string> = {
  en: makeDefaultCode({
    legs: "// legs",
    torso: "// torso",
    head: "// head",
    visor: "// helmet visor",
    jetpack: "// jetpack body",
    nozzle: "// nozzle (cyan glow = active state)",
  }),
  zh: makeDefaultCode({
    legs: "// 腿",
    torso: "// 躯干",
    head: "// 头",
    visor: "// 头盔面罩",
    jetpack: "// 背后喷射器主体",
    nozzle: "// 喷嘴（青色发光，对应 active 状态）",
  }),
  ja: makeDefaultCode({
    legs: "// 脚",
    torso: "// 胴体",
    head: "// 頭",
    visor: "// ヘルメットバイザー",
    jetpack: "// ジェットパック本体",
    nozzle: "// ノズル（シアン発光 = active 状態）",
  }),
};

export function isDefaultCode(value: string): boolean {
  const trimmed = value.trim();
  return Object.values(DEFAULT_CODE).some((c) => c.trim() === trimmed);
}
