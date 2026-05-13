#!/bin/bash
# Remove LaTeX build artifacts and test files from userguide/
set -e

cd "$(dirname "$0")/../userguide"

# LaTeX build artifacts — userguide
rm -f userguide.aux userguide.log userguide.nav userguide.out \
      userguide.snm userguide.toc userguide.vrb texput.log

# LaTeX build artifacts — upctl-pitch
rm -f upctl-pitch.aux upctl-pitch.log upctl-pitch.nav upctl-pitch.out \
      upctl-pitch.snm upctl-pitch.toc upctl-pitch.vrb

# Build log
rm -f build.log

# Test files
rm -f test_*.pdf test_*.tex

echo "userguide cleaned up"
