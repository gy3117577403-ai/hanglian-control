#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

validate_upstream() {
  case "$1" in
    http://*|https://*) ;;
    *)
      echo "API_UPSTREAM must start with http:// or https://" >&2
      exit 1
      ;;
  esac

  case "$1" in
    *[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/.?_=-]*)
      echo "API_UPSTREAM contains unsupported characters" >&2
      exit 1
      ;;
  esac
}

api_upstream="${API_UPSTREAM:-http://hanglian-control-api-arjqfyctswwx.ns-jhdb1ue7.svc.cluster.local:3000}"
validate_upstream "$api_upstream"

sed "s|__API_UPSTREAM__|${api_upstream}|g" \
  /etc/nginx/conf.d/default.conf \
  > /tmp/hanglian-nginx.conf
cat /tmp/hanglian-nginx.conf > /etc/nginx/conf.d/default.conf
rm -f /tmp/hanglian-nginx.conf

api_base_url="$(json_escape "${RUNTIME_API_BASE_URL:-/api}")"
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
