# Phase 2 Summary: Scene Import

## 驗收成果

Phase 2 已完成 CSV-based scene import workflow。系統現在可以在 `/imports/scenes` 上傳 Scene Import CSV v1，先檢查欄位、資料、重複 `scene_code` 與經緯度，再預覽新增/更新/錯誤數量，最後由使用者確認後以 transaction 寫入既有 Work、Location、Scene catalog。

## 完成項目

- 建立 Scene Import CSV v1 contract。
- 新增 normalized import model，將 CSV 欄位格式隔離在 parser/adapter 邊界。
- 建立 CSV parser，支援 quoted fields 與 row-numbered validation errors。
- 建立 required column、unknown header、duplicate header、empty value、duplicate `scene_code`、coordinate validation。
- 建立 import diff calculation，顯示 create/update/error counts。
- 建立 transaction-backed all-or-nothing upsert：
  - Work 以 `work_short_code` match/create/update。
  - Location 以 `location_name + area_name` match/create/update。
  - Scene 以 `scene_code` match/create/update。
  - 既有 Scene 保留 `id` 與 `status`。
  - 新 Scene 預設 `NOT_SHOT`。
- 建立 `/imports/scenes` import UI。
- 首頁與 Scene Catalog 新增 Scene Import 入口。
- Playwright E2E 改用 dedicated port `3100`，避免與一般 dev server 的 `3000` 衝突。
- 更新 `README.md`、`docs/SYSTEM_ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`docs/TEST_STRATEGY.md`、`docs/DECISIONS.md`、`docs/PROJECT_REQUIREMENTS_AND_PLAN.md`、`docs/phases/PHASE_2_SCENE_IMPORT.md`。

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 4 files and 15 tests
- `npm run db:test:reset`: Passed, applied Phase 0 and Phase 1 migrations and seeded 3 works, 6 locations, 12 scenes
- `npm run test:integration`: Passed, 3 files and 9 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 5 Playwright tests
- `npm run verify`: Passed

## 已知限制

- Phase 2 僅支援 CSV，不接 Google Sheets。
- Phase 2 仍只保存 anime Drive file id，不讀取 Google Drive 圖片。
- 匯入 preview 到 confirm 之間的 CSV 文字暫存在瀏覽器表單 state；超大型匯入日後可改為 server-side staging。
- CSV 中缺席的既有資料不會被刪除。
- 完整驗證需要本機 Docker Desktop 或等效 PostgreSQL 服務。

## Commit

- Commit message: `[Phase 2] add scene import`
- Commit hash: recorded in the final assistant completion report after commit
