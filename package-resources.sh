#!/usr/bin/env bash
set -euo pipefail

PROJECT="/home/ubuntu/lutcalc-redesign"
STAGING="${PROJECT}/lutcalc-resources"
ZIP_PATH="${PROJECT}/lutcalc-resources.zip"

rm -rf "$STAGING" "$ZIP_PATH"
mkdir -p "$STAGING/fonts" "$STAGING/themes" "$STAGING/docs" "$STAGING/references"

# 用户提供的 Leica LG1056 字体；两份上传文件已核对为相同 SHA-256。
cp /home/ubuntu/upload/lg1056_regular.otf "$STAGING/fonts/lg1056_regular.otf"

# 内置主题和主题配置架构。
cp "$PROJECT"/client/src/themes/*.theme.json "$STAGING/themes/"
cp "$PROJECT"/client/src/themes/lutcalc-theme.schema.json "$STAGING/themes/"

# 配置格式、主题使用说明。
cp "$PROJECT"/docs/lutcalc-log-gamma-profile.md "$STAGING/docs/"
cp "$PROJECT"/docs/lutcalc-log-gamma-profile.schema.json "$STAGING/docs/"
cp "$PROJECT"/docs/lutcalc-workbench-theme.md "$STAGING/docs/"

# 保留研究依据，方便后续维护者核对主题与布局来源。
cp "$PROJECT"/research/original-adjustments-structure.md "$STAGING/references/"
cp "$PROJECT"/research/original-page-reference-2026-08-19.md "$STAGING/references/"

cat > "$STAGING/README.md" <<'EOF'
# LUTCalc 必要资源包

本资源包用于 LUTCalc 中文重制项目的继续开发、主题维护和独立配置文件分发。

## 目录

- `fonts/`：Leica LG1056 字体原文件。
- `themes/`：Ubuntu、KDE、macOS、Omarchy 主题 JSON，以及主题配置架构。
- `docs/`：Log/Gamma 配置格式和主题系统使用说明。
- `references/`：研究记录和原版布局参考资料。

## Leica 字体校验

文件：`fonts/lg1056_regular.otf`

SHA-256：`3fd5d146aa3141350fe449856a45ba4b6b47c52339b072eecfb5dc44a8afb8ce`

该字体来自用户提供的资源。使用、再分发和公开发布时，请确认其授权范围；本资源包不对第三方字体授权作额外声明。

## 自定义 Log/Gamma 配置说明

Log/Gamma 配置文件是独立资源；带 `curve.engineParams` 的公式型配置导入后会自动注册到引擎的 Gamma 下拉（主计算器与 LUT 分析）。仓库随附示例见 `examples/log-gamma-profiles/`，字段说明见 `docs/lutcalc-log-gamma-profile.md`。

## 原版与许可证

LUTCalc 原版核心项目遵循其原有 GPL-2.0 许可证。该资源包包含项目维护所需的研究材料、配置文件和用户提供字体，不替代任何原始项目或第三方资源的许可证声明。
EOF

(cd "$PROJECT" && zip -qr "$ZIP_PATH" "lutcalc-resources")

printf '%s\n' "Created: $ZIP_PATH"
sha256sum "$ZIP_PATH"
unzip -l "$ZIP_PATH"
