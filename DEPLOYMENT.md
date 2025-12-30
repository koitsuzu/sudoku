# 部署至 GitHub Pages 說明

您的數獨遊戲是純靜態網站（HTML/CSS/JS），部署到 GitHub Pages 非常簡單。您只需要提供以下內容並按照步驟操作：

## 1. 準備檔案
確保您的資料夾中包含以下核心檔案：
- `index.html`
- `style.css`
- `script.js`

## 2. 部署步驟

### 方法 A：使用 GitHub 網頁介面上傳（最簡單）
1. 登入 [GitHub](https://github.com/) 並建立一個新的 Repository (例如命名為 `sudoku-game`)。
2. 點擊 **"uploading an existing file"**。
3. 將您的 `index.html`, `style.css`, `script.js` 拖入網頁中。
4. 點擊 **"Commit changes"**。
5. 前往 **Settings** > **Pages**。
6. 在 **Build and deployment** 下，將 Branch 設定為 `main` (或 `master`)，資料夾設定為 `/ (root)`，點擊 **Save**。
7. 等待約 1-2 分鐘，您的網站就會在 `https://<您的帳號>.github.io/sudoku-game/` 上線。

### 方法 B：使用 Git 指令（進階）
如果您電腦有安裝 Git，可以執行：
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <您的倉庫網址>
git push -u origin main
```
然後同樣到 Settings > Pages 開啟功能即可。

## 3. 注意事項
- **檔案路徑**：確保 `index.html` 內引用的路徑是相對路徑（目前的代碼已經是相對路徑，無需修改）。
- **完全免費**：GitHub Pages 是完全免費的靜態託管服務。

祝您的數獨遊戲順利上線！
