# Phase 3 Summary: Map And Navigation

## 驗收成果

Phase 3 已完成 no-external-API map and navigation workflow。系統現在可以透過 `/map` 以本地座標投影方式瀏覽場景 marker，依作品、地點與狀態篩選，點選 grouped marker 查看跨作品場景，並產生 Google Maps navigation link。

## 完成項目

- 建立 `/map` 地圖頁。
- 建立 application-layer map utilities：
  - map filter logic 與 catalog filter 保持一致。
  - Google Maps navigation URL generation。
  - missing/invalid coordinate handling。
  - Haversine distance calculation。
  - `35m` marker grouping。
  - local coordinate projection。
- 建立 Prisma-backed map repository，重用既有 Scene Catalog 資料。
- 建立 local projected map UI，不使用 Google Maps JS、API key、tile service 或外部 map dependency。
- grouped marker 顯示 scene count，selected marker panel 保留個別 Scene/Work identity。
- anime thumbnail 需求以 `animeImageDriveFileId` placeholder 呈現，Drive image loading 留到 Phase 8。
- Scene Detail 新增 View on map 與 Open navigation。
- 首頁與 Scene Catalog 新增 map 入口。
- Playwright 改為 single worker，避免會寫入 test database 的 E2E flow 與 map/catalog tests 並行互相影響。
- 更新 `README.md`、`docs/SYSTEM_ARCHITECTURE.md`、`docs/TEST_STRATEGY.md`、`docs/DECISIONS.md`、`docs/PROJECT_REQUIREMENTS_AND_PLAN.md`、`docs/phases/PHASE_3_MAP_AND_NAVIGATION.md`。

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 5 files and 21 tests
- `npm run db:test:reset`: Passed, applied Phase 0 and Phase 1 migrations and seeded 3 works, 6 locations, 12 scenes
- `npm run test:integration`: Passed, 4 files and 12 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 7 Playwright tests
- `npm run verify`: Passed

## 已知限制

- Phase 3 是 coordinate-projected local map，不是真實街圖。
- Google Maps 只產生導航 URL，不呼叫 Google API。
- 動畫縮圖仍為 Drive file id placeholder。
- Marker grouping 使用固定 `35m` 半徑，不做路線最佳化或自動排序。
- 完整驗證需要本機 Docker Desktop 或等效 PostgreSQL 服務。

## Commit

- Commit message: `[Phase 3] add map navigation`
- Commit hash: recorded in the final assistant completion report after commit
