#!/usr/bin/env bash
# Bloomwish preflight — run before every production build (and on CI for
# every push). Fails on anything that would break users; warns on anything
# that would embarrass us.
#
#   npm run preflight
set -uo pipefail

FAILED=0
step() { printf '\n\033[1m── %s\033[0m\n' "$1"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$1"; FAILED=1; }
pass() { printf '\033[32m✓ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m⚠ %s\033[0m\n' "$1"; }

step "TypeScript"
if npx tsc --noEmit; then pass "typecheck clean"; else fail "type errors"; fi

step "Lint (zero warnings allowed)"
if npx expo lint -- --max-warnings 0 > /tmp/preflight-lint.log 2>&1; then
  pass "lint clean"
else
  cat /tmp/preflight-lint.log
  fail "lint errors or warnings"
fi

step "Expo project health"
if npx expo-doctor > /tmp/preflight-doctor.log 2>&1; then
  pass "expo-doctor 20/20"
else
  cat /tmp/preflight-doctor.log
  fail "expo-doctor found issues"
fi

step "Bundle smoke test (iOS + web)"
EXPORT_DIR="$(mktemp -d)"
if npx expo export --platform ios --platform web --output-dir "$EXPORT_DIR" > /tmp/preflight-export.log 2>&1; then
  pass "both platforms bundle"
else
  tail -30 /tmp/preflight-export.log
  fail "bundle export failed"
fi
rm -rf "$EXPORT_DIR"

step "Secret hygiene"
if git ls-files | grep -qx '.env'; then
  fail ".env is tracked by git"
else
  pass ".env not tracked"
fi
if grep -rn "sk-ant-\|ELEVENLABS_API_KEY=" src/ 2>/dev/null | grep -v placeholder; then
  fail "possible secret committed under src/"
else
  pass "no API keys in app source"
fi

step "Production placeholders (warnings — must be resolved before store submission)"
grep -q "REPLACE_WITH_APPLE_TEAM_ID" app.json && warn "Apple Team ID placeholder in app.json"
grep -q "REPLACE_WITH" eas.json && warn "submit placeholders in eas.json"
grep -q "FOUNDING_OFFER_END_DATE: string | null = null" src/config/branding.ts \
  && warn "Founding Member end date not set in branding.ts"
grep -q "bloomwish.app/privacy" src/config/branding.ts \
  && warn "verify privacy/terms URLs are live before submission"

echo
if [ "$FAILED" -eq 0 ]; then
  printf '\033[32m\033[1mPreflight passed.\033[0m\n'
else
  printf '\033[31m\033[1mPreflight FAILED — fix the ✗ items before shipping.\033[0m\n'
  exit 1
fi
