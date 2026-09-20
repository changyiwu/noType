# noType

`noType` 是一個 Windows AI 語音輸入工具。本專案的概念靈感來自市面上的 Typeless 軟體，目前版本為 v1.2.0。

## 專案目標

打造一個讓使用者可以直接用說話代替打字的智慧型助理，並具備以下核心能力：
1. **語音優化調整**：自動去除贅字（如「呃」、「然後」、「對」），修復文法，將零碎的想法整理成流暢、有條理的專業文字。
2. **自動格式化**：辨識說話內容，自動完成分段、加標點符號，並支援條列式整理。
3. **跨應用程式輸入**：將處理完的文字自動填入目前游標所在的輸入框中。

## 支援平台與發行形式

- Windows x64：NSIS 安裝版與 Portable 免安裝版。
- macOS Apple Silicon arm64：規劃中，尚未完成自動輸入與系統權限整合。

使用者設定保存在 Electron 的 `userData` 目錄，不會封裝進程式或提交至 Git。

## 專案目錄結構

- `src/`：Electron 主程序、Renderer、API 與平台適配層。
- `test/`：設定遷移與錄音狀態測試。
- `AGENTS.md`：本專案的跨 Agent 工作規則入口。
- `handoff.md`：下一個工作階段使用的本機交接檔，不進公開 repo。

## 開發與打包

```powershell
npm ci
npm run check
npm test
npm run dist:win
```

`npm run dist:win` 只產生 Windows x64 的 NSIS 安裝版與 Portable 免安裝版。
為避免 Google Drive 同步資料夾阻擋 electron-builder 的目錄改名，建置會先在本機暫存目錄完成，再把發行檔與 SHA-256 複製到 `dist/v版本號/`。
