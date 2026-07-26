# 聖地巡禮照片管理系統
## Product Requirements and Harness Engineering Development Plan

---

## 1. 文件目的

本文件定義「聖地巡禮照片管理系統」第一版的產品需求、系統架構、資料模型、開發原則、Phase 拆解、測試策略與版本控制規範。

本文件將作為 Codex 接手規劃與開發的主要依據。

Codex 在開始任何程式修改前，必須先閱讀：

1. `AGENTS.md`
2. 本文件
3. 當前 Phase 對應的文件

開發過程必須遵循 Harness Engineering 原則：

- 明確定義需求與範圍
- 將大型功能拆成可獨立驗證的 Phase 與 Block
- 每個 Block 都需完成實作、測試與驗收；整個 Phase 完成驗證後統一 commit
- 不跨 Phase 提前實作未核准功能
- 所有外部服務必須透過 Adapter 隔離
- 所有核心流程必須能以自動化測試驗證
- 每次提交都必須保持可建置、可測試、可回退

---

# 2. 專案背景

## 2.1 現有流程

目前聖地巡禮資料以作品為主要分類方式。

### 行前準備

1. 每部作品建立「動畫」與「現實」資料夾。
2. 動畫截圖依作品與集數保存於 Google Drive。
3. 每張動畫圖的資訊記錄於 Google Sheet，內容包含：
   - 作品名稱
   - 集數
   - 動畫圖資訊
   - 地點名稱
   - 地圖資訊
   - 大致地理位置
   - 座標或 Google Maps 連結
4. 根據每日行程，在 Google Drive 建立日期資料夾，例如：
   - 10/10
   - 10/11
5. 每日資料夾下再依地名建立子資料夾，例如：
   - 池袋
   - 大塚
6. 將當天預計拍攝的動畫圖複製到對應地點資料夾。

### 現地拍攝

1. 使用平板展示動畫原圖作為構圖參考。
2. 使用手機拍攝實景照片。
3. 每完成一張，就刪除每日資料夾中的動畫圖，表示該場景完成。

### 事後整理

1. 查看手機照片或 Google 相簿。
2. 依照片內容與記憶判斷其對應作品、地點及動畫圖。
3. 將照片上傳至 Google Drive。
4. 更新 Google Sheet。

---

# 3. 現有痛點

## 3.1 跨作品、同地點的場景難以整合

當三部作品都出現在相同地點時，目前只能將其動畫圖放在同一地點資料夾。

資料仍缺乏明確的：

- 作品識別
- 場景識別
- 拍攝狀態
- 行程順序
- 實景照片關聯

## 3.2 資料以作品分類，但現地活動以位置為核心

目前資料結構偏向：

```text
作品 → 地點 → 動畫圖
```

但現地合理流程應是：

```text
目前位置 → 附近所有作品場景 → 下一個鄰近地點
```

因此常出現：

- 同一區域來回移動
- 難以依實際空間安排順序
- 不容易發現附近其他作品的場景
- 容易漏拍

## 3.3 以刪除動畫圖表示完成，不可逆且不可靠

目前用「動畫圖是否被刪除」表示完成，造成：

- 已刪除後找不到參考圖
- 覺得照片品質不好時難以重新確認
- 無法區分已拍攝、待確認、已 Review、需補拍
- 無法保留完整工作狀態
- 誤刪時難以復原

## 3.4 動畫圖與實景照片未在現地建立關聯

手機拍攝照片與平板展示動畫圖之間沒有共同識別資料。

旅行結束後，只剩：

- 一批動畫截圖
- 一批實景照片

系統無法知道哪張實景照片對應哪張動畫圖。

## 3.5 事後整理高度依賴記憶

旅行結束後，需要人工進行多對多配對，常出現：

- 拍得好的照片無法判斷對應場景
- 同一場景拍了多張，不知道哪張最好
- 事後才發現漏拍
- 配對與 Google Sheet 更新耗時
- 所有日期與地點資料夾清空後失去工作脈絡

---

# 4. 第一版產品目標

第一版系統的核心目標不是自動辨識或 AI 配對，而是建立可靠的資料關聯與狀態管理。

系統必須做到：

1. 從 Google Sheet 匯入場景資料。
2. 讀取 Google Drive 中的動畫圖片。
3. 在地圖上顯示所有場景座標。
4. 支援作品、地點與行程三種瀏覽方式。
5. 讓使用者建立旅行與每日行程。
6. 讓使用者手動安排每日場景順序。
7. 每個場景保留 Google Maps 導航功能。
8. 平板可依行程順序展示動畫原圖。
9. 手機可作為拍攝伴侶，上傳剛拍攝的照片。
10. 上傳時將實景照片直接綁定 Scene ID。
11. 平板可同時比較動畫圖與實景照片。
12. 場景具有可逆的狀態管理。
13. 事後可直接依既有關聯完成 Review。
14. 重新登入後，照片關聯、排序與狀態仍存在。

---

# 5. 第一版範圍

## 5.1 必須包含

### 場景資料

- 作品
- 集數
- 場景識別碼
- 動畫圖片
- 地點名稱
- 經緯度
- Google Maps 導航點
- 備註
- 拍攝狀態

### 地圖

- 顯示場景 Marker
- 支援作品、地點、狀態篩選
- 同座標或鄰近場景的群組顯示
- 點擊後查看動畫縮圖與場景資訊
- 開啟 Google Maps 導航

### 行程

- 建立旅行
- 建立每日行程
- 將場景加入某一天
- 手動拖曳調整順序
- 保存順序
- 顯示完成進度

### 現地模式

- 平板顯示今日行程
- 顯示目前場景動畫圖
- 前一張與下一張
- 開啟導航
- 顯示場景狀態
- 不刪除動畫原圖

### 手機拍攝伴侶

- 與平板使用同一套 Web App
- 手機顯示目前選取的場景
- 從本機相簿選取剛拍攝的照片
- 上傳照片
- 上傳時綁定 Scene ID
- 同一場景允許多張 Take

### Review

- 動畫圖與實景圖並排比較
- 選擇最佳實景照片
- 標記待確認
- 標記已 Review
- 標記需要補拍
- 顯示未拍攝與漏拍場景

## 5.2 第一版不包含

以下功能明確排除，不得在未核准前實作：

- 自動路線最佳化
- 自動重新排序
- Google Photos 全相簿掃描
- AI 自動辨識動畫與實景
- AI 構圖評分
- 自動選擇最佳照片
- 多使用者共同編輯
- 公開社群與分享平台
- 原生 Android App
- 原生 iOS App
- 完整離線同步
- 即時跨裝置推播
- 自動辨識目前所在場景
- 自動生成巡禮文章

---

# 6. 使用者流程

## 6.1 行前流程

```text
整理動畫圖
    ↓
上傳 Google Drive
    ↓
填寫 Google Sheet
    ↓
同步或匯入場景資料
    ↓
地圖查看所有場景
    ↓
建立旅行與每日行程
    ↓
手動加入場景
    ↓
手動調整拍攝順序
```

## 6.2 現地流程

```text
平板開啟今日行程
    ↓
查看目前動畫場景
    ↓
需要時開啟 Google Maps 導航
    ↓
使用手機原生相機拍攝
    ↓
手機開啟同一場景
    ↓
選取剛拍攝的本機照片
    ↓
上傳並綁定 Scene ID
    ↓
平板比較動畫圖與實景圖
    ↓
標記待確認、已 Review 或需要補拍
    ↓
進入下一場景
```

## 6.3 事後流程

```text
開啟待確認列表
    ↓
查看動畫圖與所有 Take
    ↓
選擇最佳照片
    ↓
完成 Review
    ↓
查看作品、地點與行程完成度
    ↓
確認是否有漏拍或需要補拍
```

---

# 7. 核心資料模型

## 7.1 Work

表示一部動畫作品。

```typescript
interface Work {
  id: string;
  name: string;
  shortCode: string;
  description?: string;
}
```

## 7.2 Location

表示地點或地理群組。

```typescript
interface Location {
  id: string;
  name: string;
  areaName?: string;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
}
```

## 7.3 Scene

Scene 是整個系統最重要的核心實體。

```typescript
type SceneStatus =
  | "NOT_SHOT"
  | "PENDING_REVIEW"
  | "REVIEWED"
  | "RETAKE_REQUIRED"
  | "SKIPPED";

interface Scene {
  id: string;
  sceneCode: string;
  workId: string;
  episode?: string;
  animeImageDriveFileId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
  notes?: string;
  status: SceneStatus;
}
```

核心規則：

- `sceneCode` 必須唯一。
- 不得使用檔名作為 Scene 主鍵。
- 不得使用資料夾是否存在表示狀態。
- 不得刪除動畫圖表示完成。
- 所有實景照片必須綁定一個有效的 Scene ID。

## 7.4 Trip

```typescript
interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}
```

## 7.5 TripDay

```typescript
interface TripDay {
  id: string;
  tripId: string;
  date: string;
  title?: string;
}
```

## 7.6 TripScene

表示某場景被加入某一天行程，以及其人工排序。

```typescript
interface TripScene {
  id: string;
  tripDayId: string;
  sceneId: string;
  sortOrder: number;
}
```

核心規則：

- 第一版只支援人工排序。
- 系統不得自動修改使用者設定的 `sortOrder`。
- 重新載入後順序必須保留。

## 7.7 ScenePhoto

```typescript
interface ScenePhoto {
  id: string;
  sceneId: string;
  tripId?: string;
  tripDayId?: string;
  fileName: string;
  storageFileId?: string;
  capturedAt?: string;
  uploadedAt: string;
  takeNumber: number;
  isBest: boolean;
}
```

核心規則：

- 一張照片必須綁定且只能綁定一個 Scene。
- 一個 Scene 可以有多張照片。
- 新照片不得覆蓋舊 Take。
- `isBest` 同一場景最多只能有一張為 `true`。
- 沒有實景照片的場景不得標記為 `REVIEWED`。

---

# 8. 場景狀態設計

合法狀態：

```text
NOT_SHOT
PENDING_REVIEW
REVIEWED
RETAKE_REQUIRED
SKIPPED
```

建議狀態轉換：

```text
NOT_SHOT
  → PENDING_REVIEW
  → SKIPPED

PENDING_REVIEW
  → REVIEWED
  → RETAKE_REQUIRED
  → SKIPPED

RETAKE_REQUIRED
  → PENDING_REVIEW
  → SKIPPED
```

規則：

- 上傳第一張實景照片後，`NOT_SHOT` 自動轉為 `PENDING_REVIEW`。
- 無照片時不可轉為 `REVIEWED`。
- 標記 `RETAKE_REQUIRED` 後，原照片仍需保留。
- 上傳新的 Take 後，可回到 `PENDING_REVIEW`。
- 不允許以刪除檔案作為狀態轉換機制。

---

# 9. 系統架構

## 9.1 建議技術方向

第一版建議採用 Responsive Web App / PWA。

建議技術：

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- PWA 支援
- 適用桌面、平板與手機

### Backend

可選擇：

- Next.js Server Actions / API Routes
- 或獨立 Node.js API

第一版以降低部署複雜度為優先。

### Database

建議：

- PostgreSQL
- Prisma ORM
- 或 Supabase PostgreSQL

### Storage

第一版開發初期可使用本機或測試 Storage Adapter。

正式整合可使用：

- Google Drive
- 或雲端 Object Storage

### Testing

- Vitest：單元測試
- Testing Library：前端元件測試
- Playwright：E2E 測試
- 測試資料庫或 transaction rollback：Integration Test

## 9.2 分層架構

```text
Presentation Layer
    ├── Desktop planning UI
    ├── Tablet field mode
    └── Mobile upload companion

Application Layer
    ├── Scene use cases
    ├── Trip planning use cases
    ├── Photo binding use cases
    └── Review use cases

Domain Layer
    ├── Scene
    ├── Work
    ├── Location
    ├── Trip
    ├── TripDay
    ├── TripScene
    ├── ScenePhoto
    └── Status transition rules

Infrastructure Layer
    ├── Database repositories
    ├── Google Sheets adapter
    ├── Google Drive adapter
    ├── Map adapter
    └── Photo storage adapter
```

## 9.3 架構規則

- UI 不得直接呼叫 Google API。
- Google Sheets、Drive、Maps 必須包裝在 Adapter 後面。
- Domain Layer 不得依賴 UI Framework。
- 狀態轉換規則必須集中管理。
- CSV 匯入與 Google Sheet 匯入必須共用同一份 validation。
- 外部 API 在單元測試中必須 mock。
- 自動化測試不得使用正式 Google 資料。
- API Key、OAuth Secret 與 token 不得提交到 Git。

---

# 10. Repository 建議結構

每個 Phase 只建立一份 `.md`，Phase 內的所有 Block 都寫在該文件中。

```text
seichi-pilgrimage-app/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── .gitignore
│
├── config/
│   ├── eslint.config.mjs
│   ├── prettier.config.json
│   ├── prettierignore
│   ├── playwright.config.ts
│   ├── vitest.unit.config.ts
│   └── vitest.integration.config.ts
│
├── docs/
│   ├── PROJECT_REQUIREMENTS_AND_PLAN.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── TEST_STRATEGY.md
│   ├── DECISIONS.md
│   │
│   └── phases/
│       ├── PHASE_0_FOUNDATION.md
│       ├── PHASE_1_SCENE_CATALOG.md
│       ├── PHASE_2_SCENE_IMPORT.md
│       ├── PHASE_3_MAP_AND_NAVIGATION.md
│       ├── PHASE_4_TRIP_PLANNING.md
│       ├── PHASE_5_FIELD_MODE.md
│       ├── PHASE_6_PHOTO_BINDING.md
│       ├── PHASE_7_REVIEW.md
│       └── PHASE_8_GOOGLE_INTEGRATION.md
│
├── infra/
│   └── docker/
│       └── compose.yaml
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── lib/
│
├── tests/
│   ├── fixtures/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── scripts/
    └── db/
        ├── database.ts
        ├── migrate-database.ts
        └── reset-database.ts
```

---

# 11. Harness Engineering 開發原則

## 11.1 開發單位

專案拆分如下：

```text
Project
  └── Phase
       └── Block
            └── Task
```

但文件管理採以下規則：

- 每個 Phase 只建立一份 `.md`。
- Block 的目標、範圍、驗收條件與測試全部寫在對應 Phase 文件中。
- 不另外建立 Block `.md`。
- Codex 每次只執行一個 Block。
- 每個 Phase 原則上對應一個 Git commit。
- Block 是規劃、實作與驗收單位，不是 commit 單位。

## 11.2 Block 生命週期

每個 Block 必須遵循：

```text
Understand
    ↓
Inspect
    ↓
Plan
    ↓
Implement
    ↓
Lint / Type Check
    ↓
Unit Test
    ↓
Integration Test
    ↓
E2E or Manual Acceptance
    ↓
Phase Commit
```

## 11.3 Block 開始前

Codex 必須：

1. 閱讀 `AGENTS.md`。
2. 閱讀本文件。
3. 閱讀當前 Phase 文件。
4. 檢查現有程式碼。
5. 說明預計修改的檔案。
6. 說明資料模型或 API 影響。
7. 說明測試策略。
8. 確認不包含 Phase 以外的功能。

## 11.4 Block 完成條件

一個 Block 只有在以下條件全部成立時才算完成：

- 所有 Acceptance Criteria 通過。
- 所需單元測試已新增且通過。
- 所需 Integration Test 已通過。
- 必要 E2E Test 已通過。
- Lint 通過。
- Type Check 通過。
- Build 通過。
- 文件已更新。
- 無未說明的已知錯誤。
- 無無關程式碼變更。
- Phase 全部 Block 完成後，已建立獨立 Git commit。
- Phase Commit 後工作目錄乾淨。

---

# 12. Phase 與工作拆解

---

## Phase 0：Foundation and Engineering Harness

### 目標

建立 Codex 可以可靠開發、驗證與提交的工程環境。

### Blocks

#### Block 0.1：Repository 與基本文件

建立：

- `README.md`
- `AGENTS.md`
- `.gitignore`
- `.env.example`
- `docs/PROJECT_REQUIREMENTS_AND_PLAN.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/TEST_STRATEGY.md`
- `docs/DECISIONS.md`

驗收條件：

- README 能讓新開發者完成安裝。
- AGENTS.md 明確定義開發與驗證流程。
- 不包含任何正式憑證。
- 所有文件彼此沒有明顯矛盾。

#### Block 0.2：Web App 骨架

建立：

- Next.js
- TypeScript
- Tailwind CSS
- ESLint
- Vitest
- Playwright

驗收條件：

- Development server 可啟動。
- Production build 成功。
- 首頁可顯示。
- 首頁 E2E 測試通過。

#### Block 0.3：資料庫與 Migration

建立：

- PostgreSQL 開發環境
- ORM schema
- Migration
- Seed
- Reset script

驗收條件：

- 空資料庫可透過 migration 建立。
- Seed 後可讀取固定 Demo 資料。
- Reset 後環境可重建。
- Integration Test 可使用獨立測試資料庫。

#### Block 0.4：統一驗證入口

建立：

```bash
npm run verify
```

最低內容：

```text
format check
lint
typecheck
unit tests
integration tests
build
```

驗收條件：

- 任一檢查失敗時，命令回傳非零狀態。
- 本機與 CI 使用相同驗證入口。
- Codex 完成每個 Block 前都必須執行。

---

## Phase 1：Scene Catalog

### 目標

建立作品、地點與場景的核心資料模型及基本瀏覽能力。

### Blocks

#### Block 1.1：Domain Model

建立：

- Work
- Location
- Scene
- SceneStatus

驗收條件：

- Scene Code 唯一。
- 經緯度格式驗證。
- 狀態只接受合法值。
- 不使用檔名作為 Scene ID。
- Domain Model 不依賴 UI Framework。

#### Block 1.2：Demo Dataset

建立固定測試資料：

- 3 部作品
- 至少 2 個地區
- 至少 12 個場景
- 多個跨作品同位置場景
- 含不同狀態

驗收條件：

- Seed 結果可重現。
- Demo 資料可用於 Unit、Integration、E2E。
- 不使用真實私人 Google 資料。

#### Block 1.3：Scene List

建立：

- 所有場景列表
- 作品篩選
- 地點篩選
- 狀態篩選
- 場景詳情入口

驗收條件：

- 同地點不同作品可同時顯示。
- 篩選結果正確。
- 重新整理後篩選條件可保留於 URL 或狀態中。

### 主要單元測試

- Scene Code uniqueness validation
- Latitude / longitude validation
- SceneStatus validation
- Scene filter logic
- Work and Location relationship

---

## Phase 2：Scene Import

### 目標

先以 CSV 完成穩定匯入流程，再準備 Google Sheet 共用介面。

### Blocks

#### Block 2.1：Import Schema

標準欄位：

```text
scene_code
work_name
episode
anime_drive_file_id
location_name
latitude
longitude
maps_url
notes
```

驗收條件：

- 缺少必填欄位時回報錯誤。
- 重複 Scene Code 時回報錯誤。
- 經緯度錯誤時指出行號。
- 不允許靜默忽略錯誤。

#### Block 2.2：CSV Parser and Validation

建立：

- CSV Parser
- Validation
- Error Report
- Normalized Import Model

驗收條件：

- 正確資料可解析。
- 錯誤資料不寫入資料庫。
- 錯誤訊息包含欄位與行號。
- Parser 不依賴 UI。

#### Block 2.3：Import Preview

流程：

```text
選擇 CSV
  → 解析
  → 顯示新增、更新、錯誤數
  → 確認
  → 寫入
```

驗收條件：

- 使用者確認前不寫入。
- 顯示新增、更新與錯誤數量。
- 寫入失敗時不可留下部分不一致資料。

### 主要單元測試

- Required column validation
- Duplicate Scene Code
- Invalid coordinates
- Empty values
- Normalization
- Import diff calculation

### 主要 Integration Test

- Valid CSV import
- Invalid CSV rollback
- Existing Scene update
- Mixed valid and invalid rows rejection strategy

---

## Phase 3：Map and Navigation

### 目標

以地理位置瀏覽場景，提供每個場景的導航點，不做自動路線最佳化。

### Blocks

#### Block 3.1：Scene Map

功能：

- 顯示所有場景 Marker
- 依作品、地點、狀態篩選
- 點擊 Marker 顯示場景資訊
- 顯示動畫縮圖、作品與集數

驗收條件：

- 所有有座標場景正確顯示。
- 篩選結果與列表一致。
- 無座標場景不造成頁面錯誤。

#### Block 3.2：Overlapping Scene Handling

功能：

- 相同或鄰近位置群組化
- 點開後列出所有場景
- 保留每部作品識別

驗收條件：

- 多部作品同座標時不遺失場景。
- 使用者可進入個別 Scene。
- 群組數量正確。

#### Block 3.3：Navigation Point

功能：

- 每個 Scene 提供「開啟導航」
- 以該 Scene 座標作為 destination
- 交由 Google Maps App 或網頁導航

驗收條件：

- URL 生成正確。
- 手機、平板與桌面均可開啟。
- 缺少座標時按鈕停用並顯示原因。
- 系統不自行改變行程順序。

### 主要單元測試

- Google Maps URL generation
- Missing coordinate handling
- Marker grouping
- Map filter logic

---

## Phase 4：Trip Planning

### 目標

建立旅行、每日行程、場景加入與人工排序。

### Blocks

#### Block 4.1：Trip and TripDay

功能：

- 建立旅行
- 設定起訖日期
- 建立每日行程

驗收條件：

- 日期範圍合法。
- 每日行程與旅行正確關聯。
- 旅行刪除策略明確。

#### Block 4.2：Add Scene to TripDay

功能：

- 從場景列表加入
- 從地圖加入
- 從地點頁加入
- 顯示已加入狀態

驗收條件：

- Scene 正確加入指定日期。
- 不可建立意外重複項目。
- 加入後可移除。

#### Block 4.3：Manual Ordering

功能：

- 拖曳排序
- 保存 `sortOrder`
- 重新整理後保留
- 可在同一天移動順序

驗收條件：

- 系統不自動重排。
- 排序結果持久化。
- 並發或失敗時避免順序損壞。

#### Block 4.4：Trip Summary

顯示：

- 總場景數
- 未拍攝
- 待確認
- 已 Review
- 需要補拍
- 缺少座標

### 主要單元測試

- Trip date validation
- sortOrder calculation
- Reorder logic
- Duplicate scene prevention
- Progress aggregation

### 主要 Integration Test

- Create trip and days
- Add scenes
- Reorder and persist
- Remove scene
- Reload and verify order

---

## Phase 5：Tablet Field Mode

### 目標

讓平板成為現地參考圖與流程控制中心。

### Blocks

#### Block 5.1：Today Itinerary

顯示：

- 今日所有場景
- 人工排序
- 作品
- 地點
- 狀態
- 完成進度

驗收條件：

- 顯示順序與行前規劃一致。
- 狀態更新後進度正確。
- 可快速進入任一 Scene。

#### Block 5.2：Scene Execution Page

顯示：

- 動畫原圖
- 作品
- 集數
- 地點
- 備註
- 導航按鈕
- 前一張
- 下一張
- 狀態

驗收條件：

- 動畫圖不可因狀態變更而刪除。
- 前後導航遵循人工順序。
- 可返回行程列表。

#### Block 5.3：Field Status Actions

提供：

- 待確認
- 需要補拍
- 跳過
- 返回未拍攝

驗收條件：

- 狀態轉換符合 Domain 規則。
- 不合法轉換被拒絕。
- 狀態變更後頁面與統計同步。

#### Block 5.4：Tablet Responsive Layout

測試尺寸：

- 1024 × 768
- 1280 × 800
- 1366 × 1024

驗收條件：

- 動畫圖可清楚觀看。
- 主要按鈕適合觸控。
- 橫向平板操作順暢。
- 不需精準滑鼠操作。

### 主要單元測試

- Previous / next scene calculation
- Status action availability
- Progress update
- Responsive component behavior where applicable

### 主要 E2E Test

```text
開啟今日行程
→ 進入第一場景
→ 查看動畫圖
→ 開啟導航連結
→ 前往下一場景
→ 狀態更新
```

---

## Phase 6：Mobile Photo Binding

### 目標

讓手機作為拍攝伴侶，將本機照片直接綁定 Scene。

### Blocks

#### Block 6.1：Mobile Scene View

功能：

- 手機查看今日行程
- 進入指定 Scene
- 顯示簡化動畫參考圖
- 顯示上傳入口

第一版不要求即時推播同步。

驗收條件：

- 手機可明確確認目前 Scene。
- 不會將照片上傳到錯誤 Scene。
- UI 適合單手操作。

#### Block 6.2：Local Photo Selection

功能：

- 從本機相簿選取照片
- 支援 JPEG、PNG、WebP
- 顯示預覽
- 確認後上傳

驗收條件：

- 不支援格式被拒絕。
- 使用者取消時不改變狀態。
- 上傳前可確認 Scene 與照片。

#### Block 6.3：Photo Upload and Scene Binding

照片上傳必須包含：

- sceneId
- tripId
- tripDayId
- capturedAt
- original file name
- takeNumber

驗收條件：

- 缺少 Scene ID 時拒絕。
- Scene 不存在時回傳明確錯誤。
- 上傳成功後照片永久綁定 Scene。
- 上傳失敗時 Scene 狀態不變。
- 第一張成功上傳後 Scene 轉為 `PENDING_REVIEW`。

#### Block 6.4：Multiple Takes

功能：

- 同一場景上傳多張照片
- 自動編號 Take
- 不覆蓋舊照片
- 可檢視所有 Take

驗收條件：

- Take Number 正確。
- 刪除某張照片不影響其他 Take。
- 所有照片都保留 Scene 關聯。

### 主要單元測試

- File type validation
- File size validation
- Take number generation
- Scene status update
- Scene binding validation

### 主要 Integration Test

- Successful upload
- Invalid Scene ID
- Upload rollback
- Multiple Takes
- Status transition after upload

### 主要 E2E Test

```text
手機開啟 Scene
→ 選取本機照片
→ 預覽
→ 確認上傳
→ 平板 Scene 出現實景照片
→ 狀態變為待確認
```

---

## Phase 7：Review Workflow

### 目標

完成動畫圖與實景圖比較、最佳照片選擇及 Review 狀態管理。

### Blocks

#### Block 7.1：Side-by-Side Comparison

顯示：

```text
動畫原圖 | 實景照片
```

驗收條件：

- 平板橫向顯示清楚。
- 可切換不同 Take。
- 兩側圖片可獨立放大。

#### Block 7.2：Best Photo Selection

功能：

- 選擇最佳 Take
- 顯示目前最佳照片
- 更換最佳照片

驗收條件：

- 同 Scene 只能有一張最佳照片。
- 更換時原最佳照片取消。
- 所有 Take 仍然保留。

#### Block 7.3：Review Status

功能：

- PENDING_REVIEW → REVIEWED
- PENDING_REVIEW → RETAKE_REQUIRED
- RETAKE_REQUIRED → PENDING_REVIEW

驗收條件：

- 無照片時不可 REVIEWED。
- 已 Review 場景需有最佳照片。
- 刪除最佳照片後需重新確認狀態。

#### Block 7.4：Review Queue

顯示：

- 待確認
- 需要補拍
- 未拍攝
- 有照片但未選最佳照片
- 已 Review

支援：

- 作品篩選
- 地點篩選
- 行程篩選

### 主要單元測試

- Legal status transitions
- Illegal status transitions
- Best photo uniqueness
- Review eligibility
- Review queue filters

### 主要 Integration Test

- Upload → Pending Review
- Select best → Reviewed
- Mark retake
- Upload new take → Pending Review
- Replace best photo

### 主要 E2E Test

```text
開啟 Review Queue
→ 進入待確認 Scene
→ 比較多張 Take
→ 選擇最佳照片
→ 標記已 Review
→ 作品與行程進度更新
```

---

## Phase 8：Google Integration

### 目標

在核心閉環已穩定後，接入真實 Google Sheet 與 Google Drive。

### Blocks

#### Block 8.1：Google OAuth

功能：

- Google 登入
- 最小權限授權
- Token 安全保存
- 登出與撤銷處理

驗收條件：

- Secret 不進入 Git。
- 權限符合最小需求。
- Token 過期時有明確處理。

#### Block 8.2：Google Sheets Adapter

功能：

- 輸入或設定 Sheet ID
- 讀取場景資料
- 轉換成 Phase 2 的 Normalized Import Model
- 使用既有 validation

驗收條件：

- 不建立第二套匯入規則。
- Sheet 與 CSV 使用相同 validation。
- API 錯誤可理解。
- 測試使用 mock，不連正式帳號。

#### Block 8.3：Google Drive Anime Image Adapter

功能：

- 依 Drive File ID 取得動畫圖
- 取得必要 metadata
- 提供 UI 可顯示的安全介面

驗收條件：

- UI 不直接呼叫 Drive API。
- File ID 無效時顯示明確錯誤。
- 權限不足時不造成整頁崩潰。

#### Block 8.4：Photo Storage Integration

決定實景照片最終保存方式：

- Google Drive
- 或其他 Object Storage

驗收條件：

- ScenePhoto 保存穩定 File ID。
- 檔案移動或重新命名不破壞 Scene 關聯。
- Storage 失敗時資料庫 transaction 回退。
- 不依賴 Google Photos 暫時連結作為永久來源。

### 主要 Integration Test

- Mock Google Sheet import
- Mock Drive metadata
- Expired token handling
- Permission denied handling
- Storage failure rollback

---

# 13. 單元測試策略

## 13.1 單元測試範圍

單元測試必須優先覆蓋純邏輯：

- Scene Code 驗證
- 經緯度驗證
- CSV 欄位與資料驗證
- Status transition
- Trip date validation
- Manual order calculation
- Duplicate scene prevention
- Google Maps URL generation
- File validation
- Take number generation
- Best photo uniqueness
- Progress aggregation

## 13.2 單元測試原則

- 不連資料庫。
- 不連 Google API。
- 不依賴實際網路。
- 輸入與輸出必須可重現。
- 每個 bug 修正需新增 regression test。
- Domain 規則修改必須同步更新測試。

## 13.3 Integration Test 原則

Integration Test 驗證：

- Repository
- Database transaction
- API endpoint
- Use case
- Adapter contract

每個 Integration Test 必須：

- 使用測試資料庫。
- 可重複執行。
- 不依賴正式帳號。
- 測試後清理資料。
- 驗證失敗時不留下部分寫入。

## 13.4 E2E Test 原則

第一版只保留高價值流程：

1. 匯入場景。
2. 建立旅行與手動排序。
3. 平板執行行程。
4. 手機上傳照片並綁定 Scene。
5. Review 並更新進度。

E2E 不應重複所有單元測試細節。

---

# 14. Git 版本控制原則

## 14.1 Commit 粒度

- 主分支必須使用 `main`。
- 每個 Phase 原則上對應一個 commit。
- Commit 必須只包含該 Phase 所需變更。
- 不可混入無關重構。
- 不可在同一 commit 同時實作多個 Phase。
- Commit 前必須通過 Phase 驗證與 `npm run verify`。

## 14.2 Commit Message

Commit message 必須使用以下格式：

```text
[Phase <n>] <feature>
```

範例：

```text
[Phase 0] complete foundation
[Phase 1] add scene catalog
[Phase 2] add scene import
[Phase 3] add map navigation
[Phase 4] add trip planning
[Phase 5] add tablet field mode
[Phase 6] add mobile photo binding
[Phase 7] add review workflow
[Phase 8] add google integration
```

## 14.3 Commit 前檢查

Codex 必須執行：

```bash
npm run verify
git status
git diff --check
```

必要時執行 Block-specific tests。

## 14.4 Commit 完成報告

每個 Block 完成後，Codex 必須回報：

1. 實作摘要
2. 修改檔案
3. 新增或修改的測試
4. 執行過的命令
5. 測試結果
6. 已知限制
7. Commit hash
8. `git status` 結果

## 14.5 禁止事項

- 不得 commit `.env`。
- 不得 commit OAuth Secret。
- 不得 commit Access Token。
- 不得使用 `--no-verify` 跳過檢查。
- 不得在測試失敗時提交。
- 不得擅自 force push。
- 不得修改已發布歷史，除非使用者明確要求。

---

# 15. AGENTS.md 最低規範

`AGENTS.md` 至少應包含：

```markdown
# Project Purpose

This repository contains a responsive pilgrimage photo management application.

# Required Reading

Before changing code:

1. Read docs/PROJECT_REQUIREMENTS_AND_PLAN.md.
2. Read the current phase document.
3. Inspect existing implementation and tests.

# Engineering Workflow

For each block:

1. Inspect.
2. Plan.
3. Implement only the current block.
4. Add or update tests.
5. Run block-specific verification.
6. Run npm run verify.
7. Update documentation.
8. Commit the completed phase.
9. Leave the worktree clean.

# Architecture Rules

- Business rules belong in the domain layer.
- UI must not directly call Google APIs.
- External services must use adapters.
- Scene identity uses sceneId / sceneCode, never filenames.
- Photos must be bound to exactly one Scene.
- Do not delete anime images to represent completion.
- Do not automatically reorder user itineraries.

# Safety Rules

- Never commit secrets.
- Do not use production Google data in automated tests.
- Use fixtures and mocks.
- Do not implement out-of-scope features.

# Definition of Done

A block is complete only when acceptance criteria, tests, lint, typecheck,
build, documentation, phase commit, and clean git status are all satisfied.
```

---

# 16. Codex 標準操作 Prompt

## 16.1 Phase 規劃 Prompt

```text
Read:

- AGENTS.md
- docs/PROJECT_REQUIREMENTS_AND_PLAN.md
- docs/phases/PHASE_X_<NAME>.md

Do not modify code yet.

Inspect the repository and prepare a plan for the next unfinished block.

Report:

1. Current relevant architecture
2. Current implementation status
3. Files likely to change
4. Data model or API impact
5. Tests to add or modify
6. Risks and assumptions
7. Step-by-step implementation plan
8. Explicit out-of-scope items

Do not propose features outside the current phase.
```

## 16.2 Block 實作 Prompt

```text
Implement the next approved block in:

docs/phases/PHASE_X_<NAME>.md

Requirements:

- Follow AGENTS.md.
- Follow docs/PROJECT_REQUIREMENTS_AND_PLAN.md.
- Implement only the approved block.
- Do not implement future blocks or phases.
- Add all required unit and integration tests.
- Add an E2E test only when the phase requires it.
- Run block-specific tests during implementation.
- Run npm run verify before completion.
- Fix failures caused by this block.
- Update the phase document with implementation status.
- Create one focused Git commit after the approved phase is complete.

At completion, report:

1. Summary
2. Files changed
3. Tests added or changed
4. Commands executed and results
5. Acceptance criteria status
6. Known limitations
7. Commit hash
8. Git status
```

## 16.3 Review Prompt

```text
Review commit <commit-hash> against:

- AGENTS.md
- docs/PROJECT_REQUIREMENTS_AND_PLAN.md
- the current phase document

Do not modify code.

Check:

1. Missing acceptance criteria
2. Scope violations
3. Data integrity issues
4. Incorrect status transitions
5. Authentication or authorization risks
6. Error-handling gaps
7. Unit-test gaps
8. Integration-test gaps
9. E2E gaps
10. Unrelated code changes
11. Mobile and tablet usability risks
12. Secret or credential exposure

Classify findings as:

- Blocker
- Major
- Minor
- Suggestion
```

---

# 17. Human Approval Gates

Harness Engineering 不代表所有決策交給 AI。

以下節點需要使用者人工確認。

## Gate 1：需求與範圍

確認：

- 第一版功能
- 排除項目
- 狀態名稱
- 使用流程

## Gate 2：資料模型

確認：

- Scene
- Work
- Location
- Trip
- TripDay
- TripScene
- ScenePhoto

資料模型核准後再大量匯入真實資料。

## Gate 3：Wireframe

至少確認：

- 場景列表
- 地圖頁
- 行程排序頁
- 平板 Field Mode
- 手機照片上傳頁
- Review 頁

## Gate 4：核心閉環

在接 Google API 前，使用 Demo Dataset 驗證：

```text
匯入
→ 地圖
→ 行程
→ 手動排序
→ 平板查看
→ 手機上傳
→ Scene Binding
→ Review
```

## Gate 5：Google Integration

核心閉環穩定後才整合：

- Google OAuth
- Google Sheets
- Google Drive

## Gate 6：現地模擬

正式旅行前，以住家附近場景模擬：

- 平板展示動畫圖
- 導航
- 手機拍攝
- 照片選取
- 上傳
- 平板比較
- 補拍
- Review

---

# 18. 第一版 Definition of Done

第一版只有在以下完整流程可被實際完成時才算完成：

1. 匯入至少三部作品的場景。
2. 每個場景具有永久 Scene ID。
3. 在同一地圖看到跨作品的相同地點。
4. 建立一趟旅行與每日行程。
5. 將場景加入指定日期。
6. 手動調整並保存所有場景順序。
7. 平板依人工順序顯示動畫圖。
8. 每個場景可以開啟 Google Maps 導航。
9. 手機可從本機相簿選取實景照片。
10. 實景照片上傳時直接綁定 Scene ID。
11. 同一場景可以保存多張 Take。
12. 平板可以比較動畫圖與實景圖。
13. 可以標記待確認、已 Review、需要補拍與跳過。
14. 可以選擇最佳實景照片。
15. 可以依作品查看完成度。
16. 可以依地點查看完成度。
17. 可以依行程查看完成度。
18. 可以找出未拍攝與需要補拍的場景。
19. 重新登入後，照片關聯、狀態與順序仍存在。
20. 事後不再需要依靠記憶完成動畫圖與實景照片配對。
21. 所有核心 Domain 規則有單元測試。
22. 所有重要資料寫入流程有 Integration Test。
23. 主要使用者閉環有 E2E Test。
24. 所有 Phase 完成時皆有對應 Git commit。
25. `npm run verify` 全部通過。

---

# 19. 建議開發順序

```text
Phase 0
Foundation and Engineering Harness
    ↓
Phase 1
Scene Catalog
    ↓
Phase 2
Scene Import
    ↓
Phase 3
Map and Navigation
    ↓
Phase 4
Trip Planning
    ↓
Phase 5
Tablet Field Mode
    ↓
Phase 6
Mobile Photo Binding
    ↓
Phase 7
Review Workflow
    ↓
Phase 8
Google Integration
```

重要原則：

- 先用 Demo Dataset 與本機照片完成閉環。
- 再接 Google Sheet 與 Google Drive。
- 不要讓 OAuth 或外部 API 阻塞核心產品驗證。
- 每個 Phase 必須可以獨立展示與驗收。
- 每個 Block 必須經過 build、test 與 review；整個 Phase 驗證通過並 commit 後才能進入下一個 Phase。

---

# 20. Codex 接手後的第一個任務

Codex 不應立即開始實作完整 App。

第一個任務應是：

1. 閱讀本文件。
2. 檢查目前 repository 是否存在。
3. 建立或修正 `AGENTS.md`。
4. 產生 `docs/phases/PHASE_0_FOUNDATION.md`。
5. 在 Phase 0 文件中定義所有 Blocks：
   - Objective
   - Scope
   - Out of Scope
   - Tasks
   - Acceptance Criteria
   - Required Unit Tests
   - Required Integration Tests
   - Required E2E Tests
   - Verification Commands
   - Commit Plan
6. 先提交 Phase 0 規劃供人工核准。
7. 核准後才開始 Block 0.1。

Codex 必須以 Phase 為單位維護文件，但每次只實作一個 Block。

---

## End of Document
