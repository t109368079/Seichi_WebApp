# Phase 4 Summary: Trip Planning

## 驗收成果

Phase 4 已完成旅行規劃 workflow。系統現在可以透過 `/trips` 建立旅行，依起訖日期自動建立每日 TripDay，從 Scene Catalog、Scene Detail、Map 與 Location 頁加入場景到指定日期，並在 Trip Detail 中手動排序與移除場景。

## 完成項目

- 新增 Trip、TripDay、TripScene Prisma models 與 Phase 4 migration。
- 新增 domain-layer Trip 規則：
  - `yyyy-mm-dd` 日期 validation。
  - inclusive TripDay date generation。
  - duplicate Scene prevention。
  - append/move/reorder/remove order normalization。
  - Trip progress aggregation。
- 新增 Prisma-backed Trip Planning repository：
  - create Trip with generated days。
  - add Scene to TripDay。
  - reorder/move/remove TripScene in transactions。
  - hard delete Trip with planning-row cascade。
  - location-scoped planning data。
- 新增 `/trips` 與 `/trips/[tripId]`。
- 新增 `/locations/[locationId]`。
- Scene Catalog、Scene Detail、Map、Location page 支援 `tripDayId` context 與「加入此日 / 已加入此日」狀態。
- Trip Detail 支援 native drag reorder 與上移/下移 fallback。
- 首頁加入旅行規劃入口。

## 測試與驗證

- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 6 files and 28 tests
- `npm run db:test:reset`: Passed, applied Phase 0, Phase 1, and Phase 4 migrations
- `npm run test:integration`: Passed, 5 files and 17 tests
- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run test:e2e`: Passed, 8 Playwright tests
- `npm run build`: Passed
- `npm run verify`: Passed

## 已知限制

- Phase 4 不提供 Field Mode。
- Phase 4 不支援照片上傳、ScenePhoto 或 Review。
- Phase 4 不做路線最佳化、自動排序或 Google API 整合。
- 動畫縮圖仍為 Drive file id placeholder。

## Commit

- Commit message: `[Phase 4] add trip planning`
- Commit hash: recorded in the final assistant completion report after commit
