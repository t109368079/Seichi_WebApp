# Phase 5 Summary: Tablet Field Mode

## 驗收成果

Phase 5 已完成平板現地模式。系統現在可以從 Trip Detail 或 `/trips/[tripId]/field` 今日捷徑進入現地模式，依出發前排定的人工順序瀏覽當日場景，查看動畫參考面板、開啟 Google Maps 導航、以前後切換走訪場景，並記錄可逆的拍攝狀態。動畫參考面板在任何狀態變更後都不會被移除。

Phase 5 未新增任何資料表或 migration，只寫入既有的 `Scene.status` 欄位。

## 完成項目

- 新增 `src/domain/scene-status.ts`，集中管理 Phase 5 狀態轉換表：
  - `NOT_SHOT` → `PENDING_REVIEW` / `RETAKE_REQUIRED` / `SKIPPED`
  - `PENDING_REVIEW` → `RETAKE_REQUIRED` / `SKIPPED` / `NOT_SHOT`
  - `RETAKE_REQUIRED` → `PENDING_REVIEW` / `SKIPPED` / `NOT_SHOT`
  - `SKIPPED` → `NOT_SHOT`
  - `REVIEWED` 在 Phase 5 為終端狀態
- 新增 `getLocalTripDateString`，以本地日曆日期而非 UTC 推導「今日」。
- 新增 application layer `src/application/field-mode.ts`：
  - `buildFieldSceneCursor` 前後場景與位置計算。
  - `resolveTodayTripDayId` 今日對應。
  - `getFieldCompletionSummary` 現地處理率。
  - 現地操作中文標籤與路由 helper。
- 新增 `src/infrastructure/repositories/field-mode-repository.ts`：
  - 讀取路徑重用 Phase 4 的 `getTripDetail`，確保現地順序與行程規劃永不分歧。
  - 狀態寫入在 transaction 內先驗證轉換再更新。
  - 今日解析在超出旅行日期範圍時 fallback 到第一天。
- 新增 `/field/[tripDayId]` 今日行程頁與 `/field/[tripDayId]/[tripSceneId]` 場景執行頁。
- 新增 `/trips/[tripId]/field` 今日捷徑，解析後 redirect。
- 新增動畫參考面板、現地狀態操作、今日行程與場景執行元件。
- Trip 列表加入「今日行程」、Trip Detail 每日卡片加入「進入現地模式」、首頁更新為 Phase 5 範圍。
- 所有 Field Mode 控制項使用最小 44px 觸控目標。

## 變更檔案

### 新增 — Source（11）

```text
src/domain/scene-status.ts                                  Phase 5 狀態轉換表（唯一定義處）
src/application/field-mode.ts                               cursor、今日解析、處理率、操作標籤
src/infrastructure/repositories/field-mode-repository.ts    讀取重用 getTripDetail；狀態寫入含驗證
src/app/field/actions.ts                                    現地狀態 server action 與中文錯誤訊息
src/app/field/[tripDayId]/page.tsx                          今日行程頁（Block 5.1）
src/app/field/[tripDayId]/[tripSceneId]/page.tsx            場景執行頁（Block 5.2）
src/app/trips/[tripId]/field/page.tsx                       今日捷徑，解析後 redirect
src/components/anime-reference-panel.tsx                    動畫參考面板，無任何隱藏路徑
src/components/field-day-view.tsx                           今日行程清單與進度
src/components/field-scene-view.tsx                         場景執行版面
src/components/field-status-actions.tsx                     四個可逆狀態動作
```

所有 Field Mode 頁面皆為 server component，使用原生 `<form action={...}>`，無 `"use client"`。

### 新增 — 測試（4）

```text
tests/unit/scene-status.test.ts        轉換表全矩陣、REVIEWED 終端、action 對應
tests/unit/field-mode.test.ts          cursor 邊界、今日解析、UTC 跨日、處理率
tests/integration/field-mode.test.ts   手動順序、合法/非法轉換、REVIEWED 唯讀、今日 fallback
tests/e2e/field-mode.spec.ts           完整現地流程、狀態還原、三個平板尺寸
```

### 新增 — 文件（2）

```text
docs/phases/PHASE_5_FIELD_MODE.md      Phase 5 規劃與驗收文件
docs/phase5_summary.md                 本文件
```

### 修改 — Source（4）

```text
src/domain/trip.ts                     + getLocalTripDateString（本地日曆日期）
src/app/page.tsx                       首頁改為 Phase 5 範圍文案
src/app/trips/page.tsx                 旅行卡片 + 「今日行程」入口
src/components/trip-detail-view.tsx    每日卡片 + 「進入現地模式」入口
```

### 修改 — 測試（1）

```text
tests/e2e/homepage.spec.ts             首頁 phase banner 斷言改為「第五階段：平板現地模式」
```

### 修改 — 文件（4）

```text
README.md                              Phase 5 範圍、Field Mode 路由與狀態動作說明
docs/SYSTEM_ARCHITECTURE.md            Phase 5 slice、分層說明、資料庫邊界
docs/DATA_MODEL.md                     + Phase 5 Field Status Model 與轉換表
docs/DECISIONS.md                      + D-0021 … D-0025
```

### 未變更

```text
prisma/schema.prisma                   無 schema 變更
prisma/migrations/                     無新增 migration
package.json / package-lock.json       無新增相依套件
config/                                無測試或工具設定變更（平板尺寸以 test.use 處理）
```

`next-env.d.ts` 會被 `next build` 重新產生，內容通常不變；若 diff 顯示有異動屬建置產物，非 Phase 5 的人為修改。

### 新增 ADR

- **D-0021** Field Mode Allows Manual PENDING_REVIEW Before Photo Binding
- **D-0022** REVIEWED Is Terminal In Phase 5
- **D-0023** Field Mode Routes Use TripDay Identity
- **D-0024** Field Mode E2E Restores Seeded Scene Status
- **D-0025** Anime Reference Stays A Placeholder Until Phase 8

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 8 files and 52 tests（Phase 5 新增 24 個）
- `npm run db:test:reset`: Passed, applied Phase 0, Phase 1, and Phase 4 migrations
- `npm run test:integration`: Passed, 6 files and 26 tests（Phase 5 新增 9 個）
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 14 Playwright tests（Phase 5 新增 6 個）
- `npm run verify`: Passed

E2E 涵蓋三個平板尺寸 1024x768、1280x800、1366x1024，各驗證動畫參考面板可見、主要控制項高度至少 44px，且無橫向捲動。

## 測試資料隔離

E2E 共用一個測試資料庫且以單一 worker 執行，Playwright 依路徑排序 spec，因此 `field-mode.spec.ts` 會在 `scene-catalog.spec.ts` 與 `scene-map.spec.ts` 之前執行。後兩者斷言精確的 `RETAKE_REQUIRED` 結果集，所以 Field Mode spec 會用 Block 5.3 的可逆動作把 `BHC-001` 還原為 `NOT_SHOT`、`SLC-001` 還原為 `PENDING_REVIEW`。

Field Mode 的每個 E2E 測試都自行建立旅行並以擷取到的 URL 導航，不以旅行名稱查找，因此在未重置資料庫的情況下重跑不會產生重複比對。Integration 測試以 `afterEach` 還原所有被變更的 seeded 狀態。

## 已知限制

- 動畫參考仍為 placeholder，真實 Drive 圖片待 Phase 8。
- `REVIEWED` 場景在現地模式為唯讀，審核狀態變更留待 Phase 7。
- `PENDING_REVIEW` 目前需手動標記，Phase 6 才會加入照片上傳自動觸發。
- 不提供跨裝置即時同步，平板需重新整理才會看到其他裝置造成的變更。
- 不做路線最佳化、自動排序或 Google API 整合。

## Commit

- Commit message: `[Phase 5] add tablet field mode`
- Commit hash: recorded in the final assistant completion report after commit
