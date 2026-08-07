# notype（專案藍圖）

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。

## 專案簡介

開發類似 Typeless 的 AI 語音輸入工具：智慧優化語音轉錄內容，並自動輸入至游標位置。目前 v1.2.0 支援 Windows x64 的 NSIS 安裝版與 Portable 免安裝版；macOS 僅規劃 Apple Silicon arm64。

## 關鍵時程

<!-- 目前無固定時程 -->

## 目標與路線圖

- [x] 階段一：語音轉錄與 AI 智慧修飾核心功能
- [x] 階段二：自動輸入至游標位置
- [x] 階段三：v1.1.2 打包為 Windows 安裝執行檔並發布
- [x] 階段四：專案規則入口統一為跨 Agent `agents.md`
- [ ] 階段五：收集使用者試用反饋，調整 AI 智慧修飾的 System Prompt 或模型參數
- [ ] 階段六：評估加入語音指令進行對話編輯功能
- [x] 階段七：v1.2.0 補上可重複執行的測試、Windows x64 暫存打包驗證與 Portable 產物
- [ ] 階段八：完成 macOS Apple Silicon arm64 的自動輸入、權限、簽章與 ZIP 發布
- [ ] 階段九：公開發布前升級 Electron 與依賴、完成安全強化及 Windows／Apple 數位簽章

## 資料夾結構

```
notype/
├─ src/                   # 原始碼
│  └─ platform/           # Windows／macOS 平台適配層
├─ scripts/               # 可重複執行的打包腳本
├─ test/                  # Node.js 單元測試
├─ dist/                  # 打包產物
├─ package.json  package-lock.json
├─ README.md
├─ agents.md              # 本檔：專案藍圖
├─ handoff.md             # 交接檔（每次收工必更新）
└─ .gitignore
```

執行期設定一律存放於 Electron `app.getPath('userData')/config.json`；專案根目錄的舊 `config.json` 只作一次性遷移來源，且不得納入 Git。

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `agents.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | https://github.com/changyiwu/noType （公開，預設分支 `main`） | 指定時 |
| L3 | Obsidian | `notype/專案工作流程.md` | 有需要時 |

## 三個檔案的職責（依「時效性」分家，不是依「詳細程度」）

| 檔案 | 時效 | 寫入方式 | 放什麼 |
|------|------|---------|--------|
| `handoff.md` | **只對下一個 session 有效**，過期即丟 | 每次收工整份重寫 | 做到哪、下一步、**這次**的暫時 workaround |
| `agents.md`（本檔） | **長期有效**，每個 session 都適用 | 只有規則本身變了才改 | 目標、路線圖、常設規則、結構 |
| Obsidian／`git log` | **歷史**：發生過什麼、為什麼 | 只增不刪 | 決策紀錄、踩坑完整版、逐次進度 |

驗收標準：**`handoff.md` 整份刪掉，不應損失任何長期資訊**——會的話代表該升級進本檔卻沒升級。

**本檔不要出現的東西**：❌ `## 最近進度`／逐次工作紀錄、❌ 決策理由與踩坑完整版。2026-08-03 移除了 `## 最近進度`，內容逐條比對後已在 L3 筆記的〈🗓️ 最近更動紀錄〉——**是主動移除，不是遺漏，不要補回來**。踩過的坑只把**結論**收斂成一條祈使句寫進〈工作約定〉，原因留 L3。

## 工作約定

- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文；涉及檔案操作時回報完整產出位置
- Windows 指令優先使用 PowerShell 語法
- GDrive 專案的 Windows 發行檔一律用 `npm run dist:win`，先在系統暫存目錄打包再複製回 `dist/v版本號/`
- 收工時更新 Obsidian 專案筆記，檢查 diff，且只提交本次任務相關檔案
- 不把每日流水帳寫進本檔

## 安全與隱私

- 不要 commit API key、token、密碼或 Firebase Admin 憑證
- 不要 commit 語音內容、轉錄逐字稿或其他個人隱私資料
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單
- 不要自動納入無關的 Git 變更
