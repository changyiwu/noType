# notype（跨 Agent 專案規則）

> 本檔是不同 Agent 共用的專案入口。

## 專案入口

- 專案名稱：`notype`
- 專案用途：開發類似 Typeless 的 AI 語音輸入工具，智慧優化語音轉錄內容並自動輸入至游標位置。
- 主要工作目錄：`C:\Users\chang\我的雲端硬碟\agents\notype`
- GitHub repo：<https://github.com/changyiwu/noType.git>
- 預設分支：`main`

## Obsidian 對應筆記

- Vault：`C:\Users\chang\我的雲端硬碟\2ndbrain`
- 專案筆記：`notype/專案工作流程.md`

## 工作規則

- 回應與文件使用繁體中文。
- 涉及檔案操作時回報完整產出位置。
- Windows 指令優先使用 PowerShell 語法。
- 開工時讀取本檔、`handoff.md` 與 Obsidian 專案筆記，並檢查 Git 狀態。
- 收工時更新 Obsidian 專案筆記，檢查 diff，且只提交本次任務相關檔案。
- 不把每日流水帳寫進本檔。

## 安全與隱私

- 不要 commit API key、token、密碼或 Firebase Admin 憑證。
- 不要 commit NotebookLM 個人匯出清單或筆記本 ID 清單。
- 不要自動納入無關的 Git 變更。
- 不要儲存個人隱私資訊。

## 最近進度

- 2026-07-22：將專案規則入口統一為跨 Agent `agents.md`，移除舊規則檔並同步 README。
