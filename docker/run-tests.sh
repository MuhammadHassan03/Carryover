#!/usr/bin/env bash
# Clean-room test of the whole project. Runs inside the test container on a
# fresh copy of the source, so nothing from a developer machine leaks in.
set -euo pipefail
OUT=${OUT:-/out}
mkdir -p "$OUT"
rm -rf /work && mkdir -p /work
tar -C /src --exclude=./target --exclude=node_modules --exclude=./app/dist --exclude='./shots*' --exclude=./landing -cf - . | tar -C /work -xf -
cd /work

section() { printf '\n==== %s ====\n' "$1"; }

section "frontend: install, type-check, build"
(cd app && npm ci --no-audit --no-fund && npx tsc --noEmit && npm run build)

section "rust: tests"
cargo test --workspace 2>&1 | grep -E "^test |test result|panicked|error" || true
cargo test --workspace --quiet

section "rust: lint"
cargo clippy --workspace --all-targets -- -D warnings

section "scanner self-check (demo data on Linux)"
cargo run -q -p carryover-core --example scan_check

section "release build of the desktop app"
(cd app && npx tauri build --no-bundle)
ls -l target/release/carryover
printf 'binary size: %s MB\n' "$(du -m target/release/carryover | cut -f1)"

section "end-to-end: drive the real app over WebDriver"
(cd e2e && npm ci --no-audit --no-fund \
  && xvfb-run -a -s "-screen 0 1280x860x24" node app.test.mjs /work/target/release/carryover "$OUT/e2e-shots" \
  && CARRYOVER_DEMO_DELAY_MS=3000 xvfb-run -a -s "-screen 0 1280x860x24" node explore.test.mjs /work/target/release/carryover "$OUT/explore-shots")

section "ALL GREEN"
