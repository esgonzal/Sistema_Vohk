# Protected camera deployment

The application now returns signed, device-scoped camera URLs only after the normal API authorization checks. The default grant lasts 12 hours. The Angular concierge renews grants after 10 hours, so an unattended screen reconnects automatically instead of requiring a page reload.

## Environment

Add these values to `backend/.env` on the server:

```ini
# Generate independent random values; do not commit them.
MEDIA_TOKEN_SECRET=LONG_RANDOM_VALUE
MEDIA_AUTH_SHARED_SECRET=ANOTHER_LONG_RANDOM_VALUE

# Optional. Keep this longer than the Angular refresh interval (10 hours).
MEDIA_TOKEN_TTL=12h
```

Generate each secret with `openssl rand -hex 32`. `MEDIA_TOKEN_SECRET` falls back to `JWT_SECRET` to avoid an outage during migration, but an independent value is recommended.

## Safe rollout order

1. Deploy and restart the backend first. Confirm an authenticated device response contains `?token=...` in its snapshot and stream URLs.
2. Build and deploy both Angular applications and the Flutter release. The Vöhk One camera wall no longer uses the unauthenticated MediaMTX iframe.
3. Copy `deploy/nginx/vohk-sites.conf` to `/etc/nginx/sites-available/default`. Replace `MEDIA_AUTH_SHARED_SECRET_VALUE` with the exact `MEDIA_AUTH_SHARED_SECRET` value from the backend environment.
4. Run `sudo nginx -t`. Do not reload Nginx unless this succeeds.
5. Merge `deploy/mediamtx/auth-snippet.yml` into the active MediaMTX configuration. Preserve all existing camera path/source definitions.
6. Restart MediaMTX, then reload Nginx.
7. Test an authenticated snapshot and live stream from Angular and Flutter.
8. In a private/incognito browser, verify that a bare `/snapshots/...` URL and a bare `/cam1/` URL return `401`.

Do not reverse steps 1–3: enabling proxy authentication before the backend and clients are deployed would temporarily make every camera unavailable.
