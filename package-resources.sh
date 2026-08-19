#!/usr/bin/env bash
set -euo pipefail

PROJECT="/home/ubuntu/lutcalc-redesign"
STAGING="${PROJECT}/lutcalc-resources"
ZIP_PATH="${PROJECT}/lutcalc-resources.zip"

rm -rf "$STAGING" "$ZIP_PATH"
mkdir -p "$STAGING/fonts" "$STAGING/themes" "$STAGING/configs" "$STAGING/docs" "$STAGING/references"

# 用户提供的 Leica LG1056 字体；两份上传文件已核对为相同 SHA-256。
cp /home/ubuntu/upload/lg1056_regular.otf "$STAGING/fonts/lg1056_regular.otf"

# 内置主题和主题配置架构。
cp "$PROJECT"/client/src/themes/*.theme.json "$STAGING/themes/"
cp "$PROJECT"/client/src/themes/lutcalc-theme.schema.json "$STAGING/themes/"

# 独立 L-Log 配置文件，不改变主程序内置选项。
cp "$PROJECT"/client/public/configs/leica-l-log-v1.4-bt2020.json "$STAGING/configs/"
cp "$PROJECT"/client/public/configs/leica-l-log-v1.4-bt709.json "$STAGING/configs/"

# 配置格式、主题和 L-Log 使用说明。
cp "$PROJECT"/docs/leica-l-log-configuration-guide.md "$STAGING/docs/"
cp "$PROJECT"/docs/lutcalc-log-gamma-profile.md "$STAGING/docs/"
cp "$PROJECT"/docs/lutcalc-log-gamma-profile.schema.json "$STAGING/docs/"
cp "$PROJECT"/docs/lutcalc-workbench-theme.md "$STAGING/docs/"

# 保留研究依据，方便后续维护者核对 L-Log 与主题来源。
cp "$PROJECT"/research/leica-l-log-findings.md "$STAGING/references/"
cp "$PROJECT"/research/leica-lumix-ui-research.md "$STAGING/references/"
cp "$PROJECT"/research/original-adjustments-structure.md "$STAGING/references/"
cp "$PROJECT"/research/original-page-reference-2026-08-19.md "$STAGING/references/"
cp "$PROJECT"/research/leica-l-log-reference-manual-v1.4.pdf "$STAGING/references/"

cat > "$STAGING/README.md" <<'EOF'
# LUTCalc 必要资源包

本资源包用于 LUTCalc 中文重制项目的继续开发、主题维护和独立配置文件分发。

## 目录

- `fonts/`：Leica LG1056 字体原文件。
- `themes/`：Ubuntu、KDE、macOS、Omarchy、Leica 固件和 Lumix 固件主题 JSON，以及主题配置架构。
- `configs/`：独立 Leica L-Log 配置文件，包含 BT.2020 和 BT.709 版本。
- `docs/`：L-Log、Log/Gamma 配置格式和主题系统使用说明。
- `references/`：L-Log 白皮书、研究记录和原版布局参考资料。

## Leica 字体校验

文件：`fonts/lg1056_regular.otf`

SHA-256：`3fd5d146aa3141350fe449856a45ba4b6b47c52339b072eecfb5dc44a8afb8ce`

该字体来自用户提供的资源。使用、再分发和公开发布时，请确认其授权范围；本资源包不对第三方字体授权作额外声明。

## L-Log 配置说明

L-Log 配置文件是独立资源，不会自动注册为 LUTCalc 主程序的内置选项。具体导入方式和字段说明请阅读 `docs/leica-l-log-configuration-guide.md`。

## 原版与许可证

LUTCalc 原版核心项目遵循其原有 GPL-2.0 许可证。该资源包包含项目维护所需的研究材料、配置文件和用户提供字体，不替代任何原始项目或第三方资源的许可证声明。
EOF

(cd "$PROJECT" && zip -qr "$ZIP_PATH" "lutcalc-resources")

printf '%s\n' "Created: $ZIP_PATH"
sha256sum "$ZIP_PATH"
unzip -l "$ZIP_PATH"
