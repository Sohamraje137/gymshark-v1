#!/usr/bin/env bash
# Prints a session cookie for a dev-login user, for curl / browser automation.
# Usage: scripts/dev-login.sh alex@demo.local [http://localhost:3000]
#   curl -b "$(scripts/dev-login.sh alex@demo.local)" http://localhost:3000/dashboard
set -euo pipefail
EMAIL="${1:?email required}"; BASE="${2:-http://localhost:3000}"
JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
CSRF="$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')"
curl -s -b "$JAR" -c "$JAR" -o /dev/null -X POST "$BASE/api/auth/callback/dev-login" \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "email=$EMAIL" \
  --data-urlencode "passcode=${DEV_LOGIN_PASSCODE:-}" --data-urlencode "callbackUrl=$BASE/dashboard"
TOKEN="$(awk '$6 ~ /authjs.session-token$/ {print $7}' "$JAR")"
[ -n "$TOKEN" ] || { echo "dev login failed (is DEV_LOGIN_ENABLED=true and the server running?)" >&2; exit 1; }
echo "authjs.session-token=$TOKEN"
