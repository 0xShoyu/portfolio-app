#!/usr/bin/env bash
#
# fix-imports-round2.sh
#
# 基于 `npx tsc --noEmit` 报出来的精确错误清单,逐一修正
# threejs-ai-model-generator/ 内部因为文件搬家、但相对路径没跟着改的 import。
#
# 用法: 在 portfolio-app 仓库根目录运行:
#   chmod +x fix-imports-round2.sh
#   ./fix-imports-round2.sh
#   npx tsc --noEmit   # 再跑一遍确认清零
#
set -euo pipefail

if [ ! -f "package.json" ]; then
  echo "❌ 请在 portfolio-app 仓库根目录运行。"
  exit 1
fi

TOOL_DIR="threejs-ai-model-generator"

fix() {
  local file="$1" old="$2" new="$3"
  if [ ! -f "$file" ]; then
    echo "  ⚠️  跳过(文件不存在): $file"
    return
  fi
  if ! grep -qF -- "$old" "$file"; then
    echo "  ⚠️  跳过(没找到这段字符串,可能已经改过了): $file"
    return
  fi
  sed -i.bak "s|${old}|${new}|g" "$file"
  rm -f "${file}.bak"
  echo "  ✅ 已修正: $file"
}

echo "▶ 逐一修正 import 路径..."

fix "${TOOL_DIR}/components/ControlCoPilotPanel.tsx" \
    '../modelGenerator.constants' '../constants'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator.constants' '../constants'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator/types' '../types'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator/useThreeEngine' '../hooks/useThreeEngine'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator/Toolbar' './Toolbar'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator/ControlCoPilotPanel' './ControlCoPilotPanel'

fix "${TOOL_DIR}/components/ModelGenerator.tsx" \
    './modelGenerator/PreviewPanel' './PreviewPanel'

# 这一条是上一轮脚本自己引入的错误:ModelGeneratorClient.tsx 现在跟
# ModelGenerator.tsx 同在 components/ 目录下了,不再需要跨 4 层目录的相对路径。
fix "${TOOL_DIR}/components/ModelGeneratorClient.tsx" \
    '../../../../threejs-ai-model-generator/components/ModelGenerator' './ModelGenerator'

fix "${TOOL_DIR}/components/TerminalView.tsx" \
    './types' '../types'

fix "${TOOL_DIR}/components/Toolbar.tsx" \
    '../modelGenerator.constants' '../constants'

fix "${TOOL_DIR}/hooks/useThreeEngine.ts" \
    './types' '../types'

echo ""
echo "✅ 修复完成。现在跑:"
echo "     npx tsc --noEmit"
echo "   如果还有报错,大概率是 PreviewPanel.tsx / ControlCoPilotPanel.tsx 里"
echo "   还有别的没被 tsc 第一轮扫到的相对路径引用(比如它们互相 import 的情况),"
echo "   把新的报错贴给我,这次直接照着报错改就行,不用再猜了。"
