# Phase 6 Summary: Mobile Photo Binding

## 驗收成果

Phase 6 已完成手機照片綁定。使用者現在可以在現地從 Field Mode 場景頁進入上傳頁，從本機相簿選取照片、預覽確認後上傳，照片會**永久綁定到唯一一個 Scene ID**。第一張照片上傳成功後，場景自動從未拍攝轉為待確認；刪光照片後自動退回未拍攝。

這補上了 [§3.4 與 §3.5](PROJECT_REQUIREMENTS_AND_PLAN.md) 描述的核心痛點：動畫圖與實景照片終於在現地就建立了關聯，事後不再需要靠記憶做多對多配對。

## 重要註記：本階段未實作 E2E 測試

**依使用者明確要求，Phase 6 不撰寫照片綁定的 E2E 測試。**

- 單元測試與 integration 測試均已完整覆蓋，包含交易回退與 Trip 刪除保留照片等關鍵路徑。
- `npm run verify` 仍會執行既有的 14 個 Playwright 測試，且全數通過 —— Phase 6 修改了 Field Mode 場景頁，這 14 個測試同時作為迴歸保護。
- **尚未經過瀏覽器驗證的部分**：實際的檔案選取、預覽、`fetch` 上傳流程、上傳進度與錯誤顯示、手機單手版面。這些只經過型別檢查與 production build，未經真實瀏覽器互動驗證。
- 建議在 Gate 6 現地模擬前補上，或至少手動走一次完整上傳流程。

## 完成項目

- 新增 `ScenePhoto` model 與 Phase 6 migration（Phase 4 以來第一個 migration）。
- 新增 `src/domain/scene-photo.ts`：
  - JPEG / PNG / WebP 白名單與 15 MB 上限驗證。
  - Take 編號一律取 `max + 1`，刪除後不重用。
  - 上傳與刪除後的狀態解析，全部回歸 Phase 5 轉換表驗證，**未新增第二套狀態規則**。
- 新增 `PhotoStorageAdapter` 邊界與 `LocalPhotoStorage` 實作（專案第一個 infrastructure adapter），含路徑穿越防護。
- 新增 `src/application/scene-photo.ts`：DTO、檔案大小格式化、照片與上傳路由 helper。
- 新增 `scene-photo-repository.ts`：交易式上傳與刪除，含補償刪檔。
- 新增專案首兩個 route handler：`POST /api/scene-photos` 與 `GET /api/scene-photos/[photoId]`。
- 新增上傳頁 `/field/[tripDayId]/[tripSceneId]/upload` 與 Take 相簿元件。
- Field Mode 場景頁加入實景照片區塊；刪除單張 Take 以 server action 處理。

## 變更檔案

### 新增 — Source（8）

```text
src/domain/scene-photo.ts                                驗證、Take 編號、上傳/刪除後狀態
src/infrastructure/storage/photo-storage.ts              adapter 介面與錯誤型別
src/infrastructure/storage/local-photo-storage.ts        本機檔案系統實作 + 測試注入 seam
src/application/scene-photo.ts                           DTO 與路由 helper
src/infrastructure/repositories/scene-photo-repository.ts 交易式上傳與刪除
src/app/api/scene-photos/route.ts                        POST 上傳
src/app/api/scene-photos/[photoId]/route.ts              GET 讀圖
src/app/field/[tripDayId]/[tripSceneId]/upload/page.tsx  上傳頁
```

### 新增 — 元件（2）

```text
src/components/scene-photo-gallery.tsx      Take 列表與單張刪除
src/components/scene-photo-upload-form.tsx  client component：選取、預覽、fetch 上傳
```

### 新增 — 資料庫（1）

```text
prisma/migrations/20260731090000_phase_6_photo_binding/migration.sql
```

### 新增 — 測試（2）

```text
tests/unit/scene-photo.test.ts         18 tests
tests/integration/scene-photo.test.ts  17 tests
```

### 新增 — 文件（2）

```text
docs/phases/PHASE_6_PHOTO_BINDING.md
docs/phase6_summary.md
```

### 修改 — Source（3）

```text
prisma/schema.prisma                              + ScenePhoto、Scene/Trip/TripDay 反向關聯
src/app/field/actions.ts                          + deleteScenePhotoAction 與照片錯誤訊息
src/app/field/[tripDayId]/[tripSceneId]/page.tsx  載入並傳入照片列表
src/components/field-scene-view.tsx               + photos prop 與相簿區塊
```

### 修改 — 設定（4）

```text
.gitignore                          + storage/（實景照片為個人資料，絕不進 repo）
.env.example                        + PHOTO_STORAGE_DIR
config/vitest.integration.config.ts integration 專用 storage 目錄
config/playwright.config.ts         E2E 專用 storage 目錄
```

### 修改 — 文件（4）

```text
README.md                    Phase 6 範圍、上傳路由、格式與大小限制、儲存位置
docs/SYSTEM_ARCHITECTURE.md  Phase 6 slice、adapter 邊界、資料庫邊界
docs/DATA_MODEL.md           + Phase 6 Photo Binding Model 與狀態耦合表
docs/DECISIONS.md            + D-0026 … D-0031
```

`next-env.d.ts` 與 `tsconfig.tsbuildinfo` 由 `next build` 產生，非人為修改；後者已 gitignore。`docs/phase5_summary.md` 的檔案清單是在 Phase 5 收尾時補寫的，不屬於 Phase 6 變更。

### 新增 ADR

- **D-0026** Photo Bytes Live Behind A Storage Adapter
- **D-0027** Photo Upload Uses A Route Handler
- **D-0028** Deleting The Last Photo Reverts To NOT_SHOT
- **D-0029** capturedAt Comes From The Browser File Timestamp
- **D-0030** Deleting A Trip Preserves Photos
- **D-0031** The isBest Column Ships In Phase 6 Without Behavior

## 測試與驗證

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 9 files and 70 tests（Phase 6 新增 18 個）
- `npm run db:test:reset`: Passed, applied Phase 0, 1, 4, and 6 migrations
- `npm run test:integration`: Passed, 7 files and 43 tests（Phase 6 新增 17 個）
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 14 Playwright tests（Phase 6 未新增，全數為迴歸保護）
- `npm run verify`: Passed

Integration 測試已確認可重複執行：連續兩次執行且中間不重置資料庫，43 個測試皆通過。

## 關鍵設計

### 上傳交易

檔案寫入放在 Prisma transaction **內部**，所以儲存失敗會連同資料列一起 rollback。若寫檔成功後才失敗，catch 會補償刪除孤兒檔案。Integration 測試以注入失敗 adapter 驗證了 rollback 路徑。

補償刪除分支目前**無法從公開輸入觸發**（寫檔之後只剩狀態更新，而狀態目標一律取自轉換表內的合法值），屬於防禦性程式碼，未被測試覆蓋。保留它是為了 Phase 7 在寫檔後新增資料庫操作時仍然安全。

### 刪除順序

刪除採相反順序：先刪資料列（交易內），成功後才刪檔案。這樣儲存失敗不會留下指向不存在檔案的資料列。

### 狀態耦合

```text
upload  : NOT_SHOT        -> PENDING_REVIEW
          RETAKE_REQUIRED -> PENDING_REVIEW
          其他狀態          -> 不變

delete  : PENDING_REVIEW  -> NOT_SHOT（僅在刪除最後一張時）
          其他狀態          -> 不變
```

兩個方向都經過 Phase 5 的 `assertSceneStatusTransition` 驗證。單元測試以全狀態迴圈斷言：任何由照片操作產生的目標狀態，都必定是轉換表允許的。

## 已知限制

- **照片綁定沒有 E2E 覆蓋**，見上方註記。
- 補償刪檔分支為防禦性程式碼，無測試覆蓋。
- 照片存於本機檔案系統，Google Drive 儲存在 Phase 8 換 adapter 即可，無需 schema 變更。
- `capturedAt` 取自瀏覽器檔案時間，非 EXIF `DateTimeOriginal`。
- `isBest` 欄位與 partial unique index 已建立，但 Phase 6 完全不讀寫，Phase 7 才啟用。
- 無縮圖或影像壓縮，相簿直接載入原圖，照片多時行動網路載入較慢。
- 無跨裝置即時同步，平板需重新整理才會看到手機剛上傳的照片。
- 上傳到 `SKIPPED` 或 `REVIEWED` 場景會記錄照片但不改狀態。

## 測試資料隔離

E2E 與 integration 使用不同的 `PHOTO_STORAGE_DIR`，皆位於 gitignore 的 `storage/` 之下。Integration `afterEach` 會刪除所有 ScenePhoto 資料列與檔案，並還原被變更的 seeded 狀態。

已知的既有問題（非 Phase 6 造成）：E2E 執行後若未重置資料庫就直接跑 `npm run test:integration`，`scene-catalog`、`scene-map`、`scene-import`、`trip-planning` 會失敗。原因是 scene-import E2E 會提交 CSV 匯入而新增第 4 部作品與第 13 個場景（自 Phase 2 起即如此），而 field-mode E2E 會留下數趟含 BHC-001 的旅行（自 Phase 5 起）。`npm run verify` 在 integration 之前一律執行 `db:test:reset`，因此不受影響。

## Commit

- Commit message: `[Phase 6] add mobile photo binding`
- Commit hash: recorded in the final assistant completion report after commit
