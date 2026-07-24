# notype（專案藍圖）

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。

## 專案簡介

開發類似 Typeless 的 AI 語音輸入工具：智慧優化語音轉錄內容，並自動輸入至游標位置。目前已完成主要交付（v1.1.2），並打包為 Windows 安裝執行檔。

## 關鍵時程

<!-- 目前無固定時程 -->

## 目標與路線圖

- [x] 階段一：語音轉錄與 AI 智慧修飾核心功能
- [x] 階段二：自動輸入至游標位置
- [x] 階段三：v1.1.2 打包為 Windows 安裝執行檔並發布
- [x] 階段四：專案規則入口統一為跨 Agent `agents.md`
- [ ] 階段五：收集使用者試用反饋，調整 AI 智慧修飾的 System Prompt 或模型參數
- [ ] 階段六：評估加入語音指令進行對話編輯功能
- [ ] 階段七：補上可重複執行的測試與打包驗證

## 資料夾結構

```
notype/
├─ src/                   # 原始碼
├─ dist/                  # 打包產物
├─ config.json            # 設定檔
├─ package.json  package-lock.json
├─ README.md
├─ agents.md              # 本檔：專案藍圖
├─ handoff.md             # 交接檔（每次收工必更新）
└─ .gitignore
```

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `agents.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | https://github.com/changyiwu/noType （公開，預設分支 `main`） | 指定時 |
| L3 | Obsidian | `notype/專案工作流程.md` | 有需要時 |

## 工作約定

- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文；涉及檔案操作時回報完整產出位置
- Windows 指令優先使用 PowerShell 語法
- 收工時更新 Obsidian 專案筆記，檢查 diff，且只提交本次任務相關檔案
- 不把每日流水帳寫進本檔

## 安全與隱私

- 不要 commit API key、token、密碼或 Firebase Admin 憑證
- 不要 commit 語音內容、轉錄逐字稿或其他個人隱私資料
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單
- 不要自動納入無關的 Git 變更

## 最近進度

- 2026-07-22：將專案規則入口統一為跨 Agent `agents.md`，移除舊規則檔並同步 README。
- 2026-07-24：專案藍圖改用標準範本格式（補上路線圖 checklist、資料夾結構與同步層級表）。
