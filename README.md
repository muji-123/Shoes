# 👟 SOLE VAULT — 私人球鞋展示櫃

個人球鞋收藏管理 App，支援新增、編輯、備份還原。

## 功能
- 📸 新增球鞋 + 上傳照片
- ✏️ 編輯已收藏球鞋
- 🔍 搜尋 + 標籤篩選
- 📦 網格 / 列表視圖
- 💾 備份匯出 / 還原（JSON）
- 自動儲存於瀏覽器

---

## 部署到 GitHub Pages（免費）

### 第一次設定

**1. 安裝依賴**
```bash
npm install
npm install gh-pages --save-dev
```

**2. 修改 `package.json`**

在最上面加入你的 GitHub Pages 網址：
```json
{
  "homepage": "https://你的帳號.github.io/sole-vault",
  ...
}
```

**3. 上傳到 GitHub**
```bash
git init
git add .
git commit -m "init: SOLE VAULT"
git branch -M main
git remote add origin https://github.com/你的帳號/sole-vault.git
git push -u origin main
```

**4. 部署**
```bash
npm run deploy
```

完成後網址為：`https://你的帳號.github.io/sole-vault`

---

### 之後更新
每次修改後執行：
```bash
git add .
git commit -m "update"
git push
npm run deploy
```
