# Phase 9 Summary

## What Changed

- Added the Vercel + Neon deployment contract, including `db:deploy`,
  Prisma `directUrl`, `vercel.json`, and production env guidance.
- Added production app access control using `APP_ALLOWED_GOOGLE_EMAILS`.
- Rejected disallowed Google OAuth accounts before token or session persistence.
- Protected product pages, app API routes, and mutating server actions when
  access control is active.
- Kept OAuth and `/integrations/google` reachable before login while hiding
  saved Sheet and Drive settings from unauthenticated or disallowed users.
- Marked Google Photos Picker as the production field-photo path on Vercel and
  local upload as a small-file backup.
- Updated unit, integration, and E2E coverage for allowlist and deployment
  behavior.

## Production Defaults

```text
DATABASE_URL=<neon-pooled-runtime-url>
DIRECT_DATABASE_URL=<neon-direct-migration-url>
APP_ALLOWED_GOOGLE_EMAILS=<your-google-email>
APP_ACCESS_CONTROL_MODE=production
PHOTO_STORAGE_BACKEND=google-drive
GOOGLE_REDIRECT_URI=https://<vercel-domain>/auth/google/callback
```

Existing Google OAuth, Drive folder, token encryption, Sheets, Photos Picker,
and Maps environment variables remain required.

## Manual Acceptance

1. Deploy the GitHub repository `t109368079/Seichi_WebApp` to Vercel.
2. Use Neon pooled URL for runtime `DATABASE_URL`.
3. Use Neon direct URL for `DIRECT_DATABASE_URL`.
4. Add the Vercel callback URL to Google OAuth authorized redirect URIs.
5. Enable Google Sheets, Google Drive, Google Photos Picker, and Maps Embed APIs.
6. Log in from the tablet over LTE or external Wi-Fi.
7. Confirm only the allowlisted Google email can enter the app.
8. Import or verify scene data.
9. Open Field Mode, pick one Google Photos item, store it in Drive, and review
   the Scene.
10. Treat local original-photo upload as backup only on Vercel because request
    payload limits are small.

## Known Limits

- No custom domain or Cloudflare Access in Phase 9.
- Google Photos remains user-selected through Picker; there is no album scan.
- Railway remains the fallback if Vercel serverless limits are too painful.
