# Phase 7 Summary: Review Workflow

## 驗收成果

Phase 7 已完成事後審核流程。使用者現在可以從 `/reviews` 開啟審核佇列，依狀態、作品、地點、行程與審核分類篩選場景，進入單一場景後並排比較動畫參考與實景 Take，選出唯一最佳照片，並在符合條件後標記為已審核。

本階段延續 Phase 6 的照片綁定，不新增 migration。最佳照片使用既有 `ScenePhoto.isBest` 欄位與 partial unique index；所有 Take 都保留在 Scene 下，選最佳或替換最佳都不會刪除其他照片。

## 完成項目

- 新增 `/reviews` 審核佇列頁。
- 新增 `/reviews/[sceneId]` 單一場景審核頁。
- 新增 `src/domain/review.ts`：
  - 審核分類。
  - 已審核資格檢查。
  - 最佳照片唯一性規則。
  - 審核狀態 action 與合法轉換檢查。
- 新增 `src/application/review.ts`：
  - Queue filters。
  - Queue summary。
  - 審核頁 route helper。
  - 傳統中文狀態與 bucket label。
- 新增 `review-repository.ts`：
  - Queue 查詢。
  - 單一 Scene review detail。
  - transaction-backed best photo selection。
  - transaction-backed review status update。
- 擴充 `src/domain/scene-status.ts`：
  - `PENDING_REVIEW -> REVIEWED`
  - `PENDING_REVIEW -> RETAKE_REQUIRED`
  - `RETAKE_REQUIRED -> PENDING_REVIEW`
  - `REVIEWED -> PENDING_REVIEW`
  - `REVIEWED -> NOT_SHOT`
- 保留 Field Mode 為現地拍攝流程：它仍然只顯示 capture-scoped actions，不提供已審核操作。
- 擴充照片刪除後狀態修復：
  - 刪除 reviewed Scene 的非最佳照片時保持已審核。
  - 刪除 reviewed Scene 的最佳照片且仍有照片時回到待確認。
  - 刪除 reviewed Scene 的最後一張照片時回到未拍攝。
- 從首頁、Scene Detail 與 Field Mode Take gallery 加入審核入口。
- Phase 7 補上真實瀏覽器上傳 E2E 作為 Review flow 的前置步驟，補齊 Phase 6 延後的 upload browser path。

## 重要設計

### 不新增 Migration

Phase 6 已建立 `ScenePhoto.isBest` 與 partial unique index。Phase 7 只啟用欄位行為，不修改 schema。

### Reviewed 的定義

`Scene.status = REVIEWED` 代表「已完成人工審核」，不是單純有照片。要進入 `REVIEWED` 必須同時滿足：

- Scene 目前是 `PENDING_REVIEW`。
- 至少有一張 `ScenePhoto`。
- Exactly one photo is best。

UI 會在缺少最佳照片時 disable「標記已審核」，repository 也會在 transaction 內重做檢查。

### 所有 Take 都保留

最佳照片只是標記，不是搬移、刪除或覆蓋。換最佳照片時會清掉同 Scene 先前的 `isBest`，再標記新的照片。

### Queue Bucket 是 Derived State

審核分類不存 DB，而是從 `Scene.status`、照片數量與 best 狀態推導：

```text
待確認
需要補拍
未拍攝
有照片但未選最佳照片
已審核
```

「有照片但未選最佳照片」可以和其他 status bucket 重疊，因為它是待處理問題，不是新的 Scene status。

## 變更檔案

### 新增 - Source

```text
src/domain/review.ts
src/application/review.ts
src/infrastructure/repositories/review-repository.ts
src/app/reviews/actions.ts
src/app/reviews/page.tsx
src/app/reviews/[sceneId]/page.tsx
src/components/review-queue.tsx
src/components/review-scene-view.tsx
```

### 修改 - Source

```text
src/domain/scene-status.ts
src/domain/scene-photo.ts
src/infrastructure/repositories/field-mode-repository.ts
src/infrastructure/repositories/scene-photo-repository.ts
src/app/page.tsx
src/app/scenes/[sceneId]/page.tsx
src/components/field-scene-view.tsx
src/components/field-status-actions.tsx
src/components/scene-photo-gallery.tsx
```

### 新增 - Tests

```text
tests/unit/review.test.ts
tests/integration/review.test.ts
tests/e2e/review-workflow.spec.ts
```

### 修改 - Tests

```text
tests/unit/scene-status.test.ts
tests/unit/scene-photo.test.ts
tests/e2e/homepage.spec.ts
```

### 新增 - 文件

```text
docs/phases/PHASE_7_REVIEW.md
docs/phase7_summary.md
```

### 修改 - 文件

```text
README.md
docs/DATA_MODEL.md
docs/SYSTEM_ARCHITECTURE.md
docs/DECISIONS.md
```

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 10 files and 83 tests（Phase 7 新增 11 個）
- `npm run db:test:reset`: Passed, applied Phase 0, 1, 4, and 6 migrations（Phase 7 無 migration）
- `npm run test:integration`: Passed, 8 files and 51 tests（Phase 7 新增 8 個）
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 15 Playwright tests（Phase 7 新增 1 個 real upload review flow）
- `npm run verify`: Passed

## 已知限制

- 動畫參考仍是 Phase 5 placeholder，Phase 8 才接 Google Drive。
- 照片仍由 Phase 6 local storage adapter 提供，Phase 8 才替換為 Drive adapter。
- 沒有 AI 評分、auto-best、縮圖、壓縮或分享流程。
- Phase 7 不呼叫任何 Google API。

## Commit

- Commit message: `[Phase 7] add review workflow`
- Commit hash: `b1c7063`

## Follow-Up Cleanup

Phase 7 was already pushed before the URL-only navigation cleanup was finalized, so the pushed commit is preserved. The cleanup is recorded as a separate follow-up commit with message `[Phase 7] allow url-only scene navigation`.
