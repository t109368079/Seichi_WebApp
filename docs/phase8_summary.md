# Phase 8 Summary: Google Integration

## 驗收成果

Phase 8 已將核心閉環接上 Google OAuth、Google Sheets 與 Google Drive，同時保持 UI 不直接呼叫 Google API。使用者可以在 `/integrations/google` 連接 Google 帳號、管理 Sheet 與 Drive photo folder 設定，並在 `/imports/scenes` 以 Google Sheet 預覽與匯入場景資料。

本階段也讓動畫參考圖透過 app route 從 Google Drive 讀取，並新增可選的 Google Drive 實景照片儲存 adapter。Local photo storage 仍是預設值；只有設定 `PHOTO_STORAGE_BACKEND=google-drive` 時才會切到 Drive。

後續擴充已新增 Google Photos Picker 作為現地照片來源。Google Photos 不作為永久 storage：匯入流程只在 server memory 短暫下載 Picker 選中的照片，接著立刻透過 Google Drive photo storage adapter 保存，資料庫仍只保存 Drive file id。

## 完成項目

- 新增 Google OAuth web-server flow：
  - `/auth/google/start`
  - `/auth/google/callback`
  - httpOnly session cookie
  - encrypted access/refresh tokens
  - hashed app session token storage
  - logout and revoke actions
- 新增 `/integrations/google` 設定頁：
  - Google connection status
  - default Sheet ID/range
  - Drive photo folder ID
- 新增 Google Sheets adapter，讀取 `spreadsheets.values.get`，並重用 Phase 2 Scene Import validation 與 all-or-nothing commit。
- 新增 Google Drive adapter：
  - file metadata
  - file media download
  - multipart upload
  - delete
- 新增 Google Photos Picker adapter：
  - create/get/delete picker session
  - list picked media items
  - download selected image bytes with the `=d` download parameter
- 新增 `/api/scenes/[sceneId]/anime-image`，讓 UI 只讀 app image route，不直接讀 Drive。
- 新增 `/api/google-photos-picker/sessions` 與 `/api/scene-photos/google-photos`，讓現地上傳頁可從 Google 相簿匯入照片。
- 將 `AnimeReferencePanel` 從 placeholder 改為 app route 圖片，錯誤時由 route 回傳穩定 fallback SVG。
- 擴充 `PhotoStorageAdapter.save` 回傳最終 storage descriptor。
- 新增 `GoogleDrivePhotoStorage`，Drive backend 會把 Drive file id 寫入 `ScenePhoto.storageFileId`。
- 保留 local photo storage 為預設 backend。
- 新增 mocked Google test mode，讓 integration 與 E2E 不碰正式 Google 帳號或私人資料。

## 重要設計

### UI 不直接呼叫 Google API

UI components 只呼叫 server actions 或 app routes。OAuth、Sheets、Drive image、Drive photo storage 都在 infrastructure adapter 與 repository 後面。

### Google Sheet 與 CSV 共用 Validation

Google Sheets rows 先轉成 Phase 2 的 table/import contract，再走同一組 required columns、duplicate scene codes、optional coordinates / maps_url、preview summary 與 transaction commit 規則。

### Token 與 Session 儲存

Google access/refresh tokens 以 `GOOGLE_TOKEN_ENCRYPTION_KEY` 加密後存入 `GoogleAccount`。Browser cookie 裡只有 opaque session token；DB 只存 `GoogleSession.sessionTokenHash`。

### Drive Photo Storage 是可選 Backend

`PHOTO_STORAGE_BACKEND=google-drive` 才會啟用 Drive photo storage。Repository 仍透過 `PhotoStorageAdapter` 操作照片，因此 storage failure rollback、DB failure cleanup、ScenePhoto relation 都維持 Phase 6/7 的語意。

### Google Photos 只作為來源

Google Photos Picker 匯入要求 `PHOTO_STORAGE_BACKEND=google-drive`。系統不保存 Google Photos temporary `baseUrl`，也不將 Picker 下載的照片寫入本機 storage。刪除 Take 時只刪除 WebApp 上傳到 Drive 的那份，不碰 Google Photos 原始備份。

## 變更檔案

### 新增 - Source

```text
src/application/google-integration.ts
src/infrastructure/google/google-auth-client.ts
src/infrastructure/google/google-drive.ts
src/infrastructure/google/google-http.ts
src/infrastructure/google/google-photos-picker.ts
src/infrastructure/google/google-session-cookie.ts
src/infrastructure/google/google-sheets.ts
src/infrastructure/google/google-test-fetch.ts
src/infrastructure/google/token-crypto.ts
src/infrastructure/repositories/anime-image-repository.ts
src/infrastructure/repositories/google-photos-picker-repository.ts
src/infrastructure/repositories/google-integration-repository.ts
src/infrastructure/storage/google-drive-photo-storage.ts
src/app/api/scenes/[sceneId]/anime-image/route.ts
src/app/api/google-photos-picker/sessions/route.ts
src/app/api/google-photos-picker/sessions/[sessionId]/route.ts
src/app/api/scene-photos/google-photos/route.ts
src/app/auth/google/start/route.ts
src/app/auth/google/callback/route.ts
src/app/auth/google/mock-connect/route.ts
src/app/integrations/google/actions.ts
src/app/integrations/google/page.tsx
```

### 修改 - Source

```text
.env.example
config/playwright.config.ts
prisma/schema.prisma
src/application/scene-import.ts
src/application/scene-photo.ts
src/components/anime-reference-panel.tsx
src/components/scene-photo-upload-form.tsx
src/components/scene-import-form.tsx
src/infrastructure/repositories/scene-import-repository.ts
src/infrastructure/repositories/scene-photo-repository.ts
src/infrastructure/storage/local-photo-storage.ts
src/infrastructure/storage/photo-storage.ts
src/app/api/scene-photos/route.ts
src/app/api/scene-photos/[photoId]/route.ts
src/app/field/actions.ts
src/app/imports/scenes/actions.ts
src/app/imports/scenes/page.tsx
src/app/page.tsx
src/app/scenes/[sceneId]/page.tsx
```

### 新增或追蹤 - Storage Boundary

```text
src/infrastructure/storage/photo-storage.ts
src/infrastructure/storage/local-photo-storage.ts
src/infrastructure/storage/google-drive-photo-storage.ts
```

### 新增 - Database

```text
prisma/migrations/20260803100000_phase_8_google_integration/migration.sql
```

### 新增 - Tests

```text
tests/unit/google-integration.test.ts
tests/integration/google-integration.test.ts
```

### 修改 - Tests

```text
tests/unit/scene-import.test.ts
tests/e2e/scene-catalog.spec.ts
tests/e2e/homepage.spec.ts
tests/e2e/scene-import.spec.ts
```

### 新增 - 文件

```text
docs/phases/PHASE_8_GOOGLE_INTEGRATION.md
docs/phase8_summary.md
```

### 修改 - 文件

```text
.gitignore
README.md
docs/DATA_MODEL.md
docs/SYSTEM_ARCHITECTURE.md
docs/DECISIONS.md
docs/TEST_STRATEGY.md
```

## 測試與驗證

- `npm run typecheck`: Passed
- `npm run test:unit`: Passed
- `npm run db:test:reset`: Passed
- `npm run test:integration`: Passed
- `npm run verify`: Passed after final phase verification
- `git diff --check`: Passed after final phase verification

## 已知限制

- Google Sheet write-back / bidirectional sync 未實作。
- Google Photos 全相簿掃描未實作；只支援使用者透過 Picker 選取照片後匯入。
- Google Photos 匯入需要 Drive photo storage backend，local storage backend 會拒絕此來源以避免本機永久副本。
- AI 配對、評分、auto-best、照片壓縮與分享流程仍在範圍外。
- Drive photo storage 需要使用者設定 OAuth 與 folder；測試環境只使用 mock。

## Follow-Up Cleanup

實測 Google Sheet 維護流程後，`anime_drive_file_id` 已放寬為可填 raw Drive file id 或常見 Drive share URL。Import parser 會在寫入資料庫前正規化成 Drive file id，因此 Sheet 端可以保留較好複製整理的連結格式，app 內仍維持穩定 file id。

## Commit

- Commit message: `[Phase 8] add google integration`
- Commit hash: to be reported after the phase commit is created.
