#!/bin/bash
# build-pdf.sh — 统一编译 upctl-compose 全部 PDF 文档
#
# 管理范围：
#   userguide/userguide.tex       → userguide.pdf       用户手册
#   userguide/upctl-pitch.tex     → upctl-pitch.pdf     Agent 可靠性工程 Pitch（含系统架构设计）
#
# 用法:
#   ./scripts/build-pdf.sh              # 编译全部
#   ./scripts/build-pdf.sh userguide    # 仅编译用户手册
#   ./scripts/build-pdf.sh pitch        # 仅编译 Pitch
#   ./scripts/build-pdf.sh clean        # 清理构建产物

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_LOG="$REPO_DIR/userguide/build.log"

DO_ALL=true
DO_CLEAN=false
DO_USERGUIDE=false
DO_PITCH=false

# --- 解析参数 ---
if [ $# -gt 0 ]; then
  DO_ALL=false
  for arg in "$@"; do
    case "$arg" in
      clean)   DO_CLEAN=true ;;
      all)     DO_ALL=true ;;
      userguide|guide) DO_USERGUIDE=true ;;
      pitch)   DO_PITCH=true ;;
      *) echo "未知目标: $arg (可用: all, userguide, pitch, clean)"; exit 1 ;;
    esac
  done
fi

if $DO_ALL; then
  DO_USERGUIDE=true
  DO_PITCH=true
fi

# --- xelatex 编译函数 ---
compile_tex() {
  local tex_file="$1"
  local base_name
  base_name="$(basename "$tex_file" .tex)"
  local tex_dir
  tex_dir="$(dirname "$tex_file")"

  echo "  [xelatex] $base_name ..."
  cd "$tex_dir"

  # xelatex 在 font warning 时返回非零，但 PDF 依然有效
  set +e
  xelatex -interaction=nonstopmode "${base_name}.tex" >> "$BUILD_LOG" 2>&1
  xelatex -interaction=nonstopmode "${base_name}.tex" >> "$BUILD_LOG" 2>&1
  set -e

  cd "$REPO_DIR"
  if [ -f "${tex_dir}/${base_name}.pdf" ]; then
    echo "    ✓ ${base_name}.pdf"
  else
    echo "    ✗ ${base_name}.pdf 未生成，请检查 $BUILD_LOG"
    return 1
  fi
}

# --- 清理 ---
if $DO_CLEAN; then
  echo "==> 清理构建产物 ..."
  cd "$REPO_DIR/userguide"
  rm -f *.aux *.log *.nav *.out *.snm *.toc *.vrb texput.log build.log
  echo "    清理完成"
  exit 0
fi

echo "==> upctl-compose PDF 构建"
echo "    日志: $BUILD_LOG"
rm -f "$BUILD_LOG"
echo ""

# --- 用户手册 ---
if $DO_USERGUIDE; then
  echo "--- 用户手册 ---"
  if [ -f "$REPO_DIR/userguide/userguide.tex" ]; then
    compile_tex "$REPO_DIR/userguide/userguide.tex"
  else
    echo "    ! userguide.tex 不存在，跳过"
  fi
  echo ""
fi

# --- Pitch ---
if $DO_PITCH; then
  echo "--- Agent 可靠性工程 Pitch ---"
  if [ -f "$REPO_DIR/userguide/upctl-pitch.tex" ]; then
    compile_tex "$REPO_DIR/userguide/upctl-pitch.tex"
  else
    echo "    ! upctl-pitch.tex 不存在，跳过"
  fi
  echo ""
fi

echo "==> 全部完成"
