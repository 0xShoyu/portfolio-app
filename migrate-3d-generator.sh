#!/usr/bin/env bash
#
# migrate-3d-generator.sh
#
# 把散落在 portfolio-app 各处的 3D Generator 工具代码,收拢进一个独立文件夹
# `threejs-ai-model-generator/`,方便后续用 git subtree split 镜像到公开仓库。
#
# 用 git mv 而不是 mv,保留文件的 commit 历史(subtree split 依赖这个)。
# API route.ts 因为 Next.js App Router 靠文件路径定路由,不能挪走,
# 脚本会把真实逻辑挪进新文件夹,原地只留一个三行的转发壳。
#
# 用法: 在 portfolio-app 仓库根目录(能看到 package.json 的地方)执行:
#   chmod +x migrate-3d-generator.sh
#   ./migrate-3d-generator.sh
#
set -euo pipefail

# ---------------------------------------------------------------------------
# 0. 前置检查
# ---------------------------------------------------------------------------
if [ ! -f "package.json" ]; then
  echo "❌ 没找到 package.json,请在 portfolio-app 仓库根目录运行这个脚本。"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作区有未提交的改动。先 commit 或 stash 一下,保证这次迁移是一个干净、可回滚的 commit。"
  exit 1
fi

TOOL_DIR="threejs-ai-model-generator"
BRANCH_NAME="migrate/3d-generator-extraction"

echo "▶ 创建迁移分支: ${BRANCH_NAME}"
git checkout -b "${BRANCH_NAME}"

mkdir -p "${TOOL_DIR}/components"
mkdir -p "${TOOL_DIR}/hooks"
mkdir -p "${TOOL_DIR}/lib"

# ---------------------------------------------------------------------------
# 1. 迁移组件 / hook / 常量 / 类型
# ---------------------------------------------------------------------------
echo "▶ 迁移组件文件..."

git mv src/components/tools/ModelGenerator.tsx \
       "${TOOL_DIR}/components/ModelGenerator.tsx"

git mv src/components/tools/ModelGeneratorClient.tsx \
       "${TOOL_DIR}/components/ModelGeneratorClient.tsx"

git mv src/components/tools/modelGenerator.constants.ts \
       "${TOOL_DIR}/constants.ts"

git mv src/components/tools/modelGenerator/PreviewPanel.tsx \
       "${TOOL_DIR}/components/PreviewPanel.tsx"

git mv src/components/tools/modelGenerator/TerminalView.tsx \
       "${TOOL_DIR}/components/TerminalView.tsx"

git mv src/components/tools/modelGenerator/Toolbar.tsx \
       "${TOOL_DIR}/components/Toolbar.tsx"

git mv src/components/tools/modelGenerator/ControlCoPilotPanel.tsx \
       "${TOOL_DIR}/components/ControlCoPilotPanel.tsx"

git mv src/components/tools/modelGenerator/types.ts \
       "${TOOL_DIR}/types.ts"

git mv src/components/tools/modelGenerator/useThreeEngine.ts \
       "${TOOL_DIR}/hooks/useThreeEngine.ts"

# 原来的 modelGenerator/ 子文件夹这时应该空了,顺手清掉
rmdir src/components/tools/modelGenerator 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. 迁移 API 逻辑,原地留薄壳 route.ts
# ---------------------------------------------------------------------------
echo "▶ 迁移 API route 逻辑..."

git mv src/app/api/generate-model/route.ts \
       "${TOOL_DIR}/lib/generate-model-handler.ts"

git mv src/app/api/review-model/route.ts \
       "${TOOL_DIR}/lib/review-model-handler.ts"

# 把 handler 文件里的 `export async function POST` 改名,
# 因为它现在不再是一个 route 文件,只是一个普通的处理函数。
# ⚠️ 这一步是基于 Next.js route handler 的常规命名约定做的字符串替换,
#    迁移完之后务必打开这两个文件确认替换准确。
sed -i.bak 's/export async function POST(/export async function generateModelHandler(/' \
  "${TOOL_DIR}/lib/generate-model-handler.ts"
sed -i.bak 's/export async function POST(/export async function reviewModelHandler(/' \
  "${TOOL_DIR}/lib/review-model-handler.ts"
rm -f "${TOOL_DIR}/lib/generate-model-handler.ts.bak" "${TOOL_DIR}/lib/review-model-handler.ts.bak"

# 原地新建薄壳 route.ts,只做转发,路径深度是固定的(src/app/api/xxx/),
# 所以这里的相对路径是可以放心写死的。
mkdir -p src/app/api/generate-model
cat > src/app/api/generate-model/route.ts << 'EOF'
export { generateModelHandler as POST } from "../../../../threejs-ai-model-generator/lib/generate-model-handler";
EOF

mkdir -p src/app/api/review-model
cat > src/app/api/review-model/route.ts << 'EOF'
export { reviewModelHandler as POST } from "../../../../threejs-ai-model-generator/lib/review-model-handler";
EOF

# ---------------------------------------------------------------------------
# 3. 全局扫描并尝试修正引用这些文件的 import 路径
# ---------------------------------------------------------------------------
echo "▶ 扫描全仓库,尝试自动修正对旧路径的 import 引用..."

# 旧路径片段 -> 新的相对路径片段(以 src/app/tools/3d-generator/page.tsx 的深度为基准,
# 即从 src/app/tools/3d-generator/ 到仓库根目录是 4 层)
declare -a OLD_NEW_PAIRS=(
  "@/components/tools/ModelGeneratorClient|../../../../${TOOL_DIR}/components/ModelGeneratorClient"
  "@/components/tools/ModelGenerator|../../../../${TOOL_DIR}/components/ModelGenerator"
  "@/components/tools/modelGenerator.constants|../../../../${TOOL_DIR}/constants"
  "components/tools/modelGenerator/useThreeEngine|../hooks/useThreeEngine"
  "components/tools/modelGenerator/types|../types"
  "components/tools/modelGenerator/PreviewPanel|./PreviewPanel"
  "components/tools/modelGenerator/TerminalView|./TerminalView"
  "components/tools/modelGenerator/Toolbar|./Toolbar"
  "components/tools/modelGenerator/ControlCoPilotPanel|./ControlCoPilotPanel"
)

TOUCHED_FILES=()
for pair in "${OLD_NEW_PAIRS[@]}"; do
  OLD="${pair%%|*}"
  NEW="${pair##*|}"
  MATCHES=$(grep -rl --include="*.ts" --include="*.tsx" "${OLD}" src "${TOOL_DIR}" 2>/dev/null || true)
  if [ -n "${MATCHES}" ]; then
    for f in ${MATCHES}; do
      sed -i.bak "s|${OLD}|${NEW}|g" "$f"
      rm -f "${f}.bak"
      TOUCHED_FILES+=("$f")
    done
  fi
done

if [ ${#TOUCHED_FILES[@]} -gt 0 ]; then
  echo "  已尝试修正以下文件里的 import:"
  printf '    %s\n' "${TOUCHED_FILES[@]}" | sort -u
else
  echo "  ⚠️ 没匹配到任何已知的旧 import 字符串——大概率是因为实际的 import 写法和脚本猜测的不一致,
     需要手动检查 src/app/tools/3d-generator/page.tsx 以及 ${TOOL_DIR}/ 内部文件之间的相互引用。"
fi

# ---------------------------------------------------------------------------
# 4. 收尾:告诉你哪些地方脚本没法自动确认,需要你自己盯一眼
# ---------------------------------------------------------------------------
echo ""
echo "✅ 文件迁移和尝试性 import 修正完成,已经在分支 ${BRANCH_NAME} 上。"
echo ""
echo "接下来手动做这几件事,一件都别跳过:"
echo "  1. 跑一次类型检查,把剩下的断链 import 全部揪出来:"
echo "       npx tsc --noEmit"
echo "  2. 全仓库再搜一遍有没有漏网的旧路径引用:"
echo "       grep -rn 'tools/modelGenerator\\|tools/ModelGenerator' src/ | grep -v '${TOOL_DIR}'"
echo "  3. 检查 ${TOOL_DIR}/components/*.tsx 有没有 import 通用 UI 组件"
echo "     (src/components/ui/Card.tsx, CardIcon.tsx, Container.tsx, TechBadge.tsx)"
echo "     或 src/lib/utils.ts 里的 cn() —— 这些是 peer dependency,开源仓库的 README 要写清楚,"
echo "     或者干脆复制一份精简版进 ${TOOL_DIR} 自己的文件夹,减少外部依赖。"
echo "  4. src/components/home/CodeWindow.tsx 这次没有动——先确认它是不是也被"
echo "     3d-generator 页面用到,如果是,再决定要不要一并挪进 ${TOOL_DIR}。"
echo "  5. public/threejs-preview.html 这个旧的独立原型页面也没有动,"
echo "     如果确认没人再引用了,可以手动 git mv 到 ${TOOL_DIR}/legacy/ 或者直接删掉。"
echo "  6. 本地跑起来点一遍 /tools/3d-generator 页面,确认生成、review、截图流程都正常。"
echo "  7. 都验证没问题后, git add -A && git commit,再合回 main。"
echo ""
echo "确认没问题之后,下一步就是我们之前聊的 git subtree split + GitHub Action 自动镜像了。"
