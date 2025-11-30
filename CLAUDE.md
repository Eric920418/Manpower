# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概覽

這是一個基於 Next.js 15 + GraphQL + Prisma 的內容管理系統模板。具有動態後台管理功能，支援彈性擴展新的內容類型。

## 開發命令

```bash
# 開發伺服器（預設 port 3000）
pnpm dev

# 建置專案
pnpm build

# 正式環境啟動
pnpm start

# 程式碼檢查
pnpm lint

# 資料庫遷移
pnpm prisma migrate dev    # 開發環境
pnpm prisma migrate deploy  # 正式環境（禁用 --accept-data-loss）

# 資料庫工具
pnpm prisma studio         # 開啟 Prisma Studio 檢視資料
pnpm prisma generate       # 生成 Prisma Client
```

## 核心架構

### 資料模型設計
專案採用彈性的 ContentBlock 模型，透過 `key` 區分不同內容類型，`payload` 儲存 JSON 格式的動態資料：

- **ContentBlock**: 核心資料模型，位於 `prisma/schema.prisma`
- **defaults.ts**: 定義每個內容類型的預設結構 (`graphql/utils/defaults.ts`)
- **resolvers.ts**: GraphQL 解析器，自動處理查詢和更新 (`graphql/resolvers.ts`)

### 後台管理系統流程
1. 所有內容類型存儲在 ContentBlock 表中
2. GraphQL resolvers 自動處理 CRUD 操作
3. 每個內容類型都有對應的編輯組件（`src/components/Edit/`）
4. 動態路由 `/admin/[slug]` 根據 slug 渲染對應編輯器

### 認證與安全
- NextAuth 處理後台登入（`app/api/auth/[...nextauth]/route.ts`）
- IP 安全機制（`app/api/auth/ip-security/route.ts`）
- IpBlocklist 模型記錄可疑 IP

## 新增內容類型的標準流程

當需要新增內容類型（例如 `aboutPage`）時：

1. **更新 defaults.ts** - 定義資料結構和預設值
2. **創建 GraphQL schema** - 在 `graphql/schemas/` 新增 `.graphql` 檔
3. **註冊 resolvers** - 在 `graphql/resolvers.ts` 新增查詢和修改
4. **創建編輯組件** - 在 `src/components/Edit/` 新增編輯器
5. **更新路由配置** - 修改 `app/admin/[slug]/page.tsx` 的 EditPages
6. **添加側邊欄連結** - 更新 `src/components/Admin/Sidebar.tsx`

## 重要開發原則

1. **套件管理**: 必須使用 `pnpm` 安裝套件，不使用 npm 或 yarn
2. **資料庫操作**: 禁止使用 `--accept-data-loss` 執行 Prisma 遷移
3. **錯誤處理**: 所有錯誤應完整顯示在前端以便調試
4. **文檔管理**: 更新功能後必須同步更新 README.md，不創建額外文檔
5. **語言偏好**: 使用中文回覆和註解

## 檔案上傳處理

- 上傳端點: `/api/upload` 和 `/api/uploadImage`
- 檔案存儲: `uploads/` 目錄（自動創建）
- 圖片訪問: `/api/images/[filename]` 提供靜態服務

## GraphQL 架構特點

- 使用 GraphQL Yoga 作為伺服器
- JSON Scalar 處理彈性資料類型
- 自動合併預設值與用戶輸入（深度合併）
- Query 和 Mutation 遵循一致的命名規範

## 前端組件架構

- CKEditor 5 整合於 `CustomEditor.tsx`
- Apollo Client 處理 GraphQL 請求
- Framer Motion 提供動畫效果
- Tailwind CSS 4.0 處理樣式

## 環境變數要求

```env
DATABASE_URL       # PostgreSQL 連接字串
NEXTAUTH_SECRET    # NextAuth 加密金鑰
NEXTAUTH_URL       # 應用程式 URL
```