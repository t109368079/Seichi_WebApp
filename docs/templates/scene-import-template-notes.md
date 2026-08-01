# 場景匯入 CSV 範本填寫說明

範本檔案：`docs/templates/scene-import-template.csv`

請保留第一列欄位名稱，從第二列開始新增你的場景資料。上傳前不要新增其他欄位，也不要放 `status` 欄位。

## 必填欄位

- `scene_code`
- `work_name`
- `work_short_code`
- `anime_drive_file_id`
- `location_name`
- `area_name`
- `latitude`
- `longitude`

## 可空欄位

- `episode`
- `maps_url`
- `notes`

## 填寫範例

```csv
scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,longitude,maps_url,notes
NRI-101,Night Rail Ikebukuro,NRI,03,demo-drive-file-id,Ikebukuro Station East Gate,Ikebukuro,35.73028,139.71145,https://maps.google.com/?q=35.73028,139.71145,First test import
```

## 注意事項

- `scene_code` 在同一份 CSV 內不能重複。
- 如果 `scene_code` 已存在，匯入會更新既有 Scene，但保留原本的 `id` 與 `status`。
- 新的 Scene 會預設為 `未拍攝`。
- `latitude` 必須介於 `-90` 到 `90`；`longitude` 必須介於 `-180` 到 `180`。
- 如果某個欄位內容包含逗號，請用雙引號包起來，例如 `"East Gate, Main"`。
