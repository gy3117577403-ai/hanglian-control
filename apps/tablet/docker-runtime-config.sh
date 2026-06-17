#!/bin/sh
set -eu

API_BASE_URL="${API_BASE_URL:-${VITE_API_BASE_URL:-}}"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__HANG_LIAN_CONFIG__ = {
  apiBaseUrl: "${API_BASE_URL}"
};
EOF
