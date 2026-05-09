#!/bin/bash
# Remove LaTeX build artifacts and test files from userguide/
set -e

cd "$(dirname "$0")/../userguide"

# LaTeX build artifacts
rm -f userguide.aux userguide.log userguide.nav userguide.out \
      userguide.snm userguide.toc userguide.vrb texput.log

# Test files
rm -f test_*.pdf test_*.tex

echo "userguide cleaned up"
