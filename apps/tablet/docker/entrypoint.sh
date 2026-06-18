#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_base_url="$(json_escape "${RUNTIME_API_BASE_URL:-}")"
app_env="$(json_escape "${RUNTIME_APP_ENV:-local}")"
storage_mode="$(json_escape "${RUNTIME_STORAGE_MODE:-local}")"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__HANGLIAN_RUNTIME_CONFIG__ = {
  API_BASE_URL: "${api_base_url}",
  APP_ENV: "${app_env}",
  STORAGE_MODE: "${storage_mode}"
};
window.__HANG_LIAN_CONFIG__ = {
  apiBaseUrl: window.__HANGLIAN_RUNTIME_CONFIG__.API_BASE_URL
};
EOF
