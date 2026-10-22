#!/usr/bin/env bash

set -u

SNAPSHOT_DIR="/var/www/snapshots"
BACKEND_DIR="/opt/Sistema_Vohk/backend"
REFRESH_SECONDS=300

mkdir -p "$SNAPSHOT_DIR"

create_media_token() {
  local camera_path="$1"

  CAMERA_PATH="$camera_path" node - <<'NODE'
require('dotenv').config({ path: '/opt/Sistema_Vohk/backend/.env', quiet: true });
const jwt = require('/opt/Sistema_Vohk/backend/node_modules/jsonwebtoken');

const secret = process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET;
if (!secret) {
  throw new Error('MEDIA_TOKEN_SECRET or JWT_SECRET is not configured');
}

process.stdout.write(jwt.sign({
  tokenType: 'media',
  userId: 'snapshot-worker',
  role: 'service',
  deviceId: 'snapshot-worker',
  paths: [`/${process.env.CAMERA_PATH}`],
}, secret, {
  expiresIn: '10m',
  issuer: 'vohk-api',
  audience: 'vohk-media',
}));
NODE
}

capture_snapshot() {
  local camera="$1"
  local destination="$SNAPSHOT_DIR/$camera.jpg"
  local temporary="$SNAPSHOT_DIR/.$camera.$$.jpg"
  local token

  if ! token="$(cd "$BACKEND_DIR" && create_media_token "$camera")"; then
    echo "$(date -Is) [$camera] could not create media token" >&2
    return 1
  fi

  if timeout 25s ffmpeg -hide_banner -loglevel error -y \
    -rtsp_transport tcp \
    -i "rtsp://127.0.0.1:8554/$camera?token=$token" \
    -frames:v 1 -vf scale=640:-1 -q:v 5 "$temporary"; then
    mv -f "$temporary" "$destination"
    echo "$(date -Is) [$camera] snapshot updated"
    return 0
  fi

  rm -f "$temporary"
  echo "$(date -Is) [$camera] snapshot capture failed" >&2
  return 1
}

while true; do
  cycle_started="$(date +%s)"

  for camera in cam1 cam2 cam3 cam4 cam5; do
    capture_snapshot "$camera" || true
  done

  elapsed="$(( $(date +%s) - cycle_started ))"
  if (( elapsed < REFRESH_SECONDS )); then
    sleep "$(( REFRESH_SECONDS - elapsed ))"
  fi
done
