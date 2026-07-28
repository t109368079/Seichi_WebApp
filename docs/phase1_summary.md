# Phase 1 Summary: Scene Catalog

## 驗收成果

Phase 1 已完成第一個產品資料切面：作品、地點、場景與場景狀態。系統現在可以用永久 `Scene.id` 與唯一 `sceneCode` 管理 demo 場景，並透過 `/scenes` 瀏覽與篩選跨作品、同地點的場景資料。

## 完成項目

- 建立 Prisma 資料模型：`Work`、`Location`、`Scene`、`SceneStatus`。
- 建立 domain validation：SceneStatus、經緯度、sceneCode 重複檢查、Scene identity 與 anime image file id 分離。
- 建立可重現 demo seed：3 部作品、6 個地點、2 個地區、12 個場景。
- Demo data 包含跨作品同地點能力：
  - `Ikebukuro Station East Gate` 同時包含 `BHC-001`、`SLC-001`、`ARS-001`。
  - `Otsuka Station North Exit` 同時包含 `BHC-003`、`SLC-003`、`ARS-003`。
- 建立 `/scenes` 場景目錄頁。
- 建立作品、地點、狀態篩選，篩選條件保留於 URL。
- 建立 `/scenes/[sceneId]` 場景詳情頁。
- 首頁新增 Scene Catalog 入口。
- Playwright E2E 改用 test database，讓 browser tests 使用 `db:test:reset` 後的 deterministic seed data。
- 更新 `README.md`、`docs/SYSTEM_ARCHITECTURE.md`、`docs/DATA_MODEL.md`、`docs/TEST_STRATEGY.md`、`docs/DECISIONS.md`、`docs/phases/PHASE_1_SCENE_CATALOG.md`。

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 3 files and 9 tests
- `npm run db:test:reset`: Passed, applied Phase 0 and Phase 1 migrations and seeded 3 works, 6 locations, 12 scenes
- `npm run test:integration`: Passed, 2 files and 5 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 3 Playwright tests
- `npm run verify`: Passed

## 已知限制

- Phase 1 僅儲存 synthetic anime Drive file id，不讀取 Google Drive 圖片。
- Phase 1 僅儲存座標與 maps URL，不實作地圖 marker 或導航。
- Trip planning、Field mode、照片上傳、ScenePhoto、Review workflow 仍屬後續 Phase。
- 完整驗證需要本機 Docker Desktop 或等效 PostgreSQL 服務。

## Commit

- Commit message: `[Phase 1] add scene catalog`
- Commit hash: recorded in the final assistant completion report after commit
