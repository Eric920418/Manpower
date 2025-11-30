# 佑羲人力管理系統 - Enterprise HR Management System

基於 Next.js 15 + GraphQL + Prisma 的企業級人力資源管理與形象網站系統。

## 🎯 專案願景

打造一個整合「品牌形象展示」與「業務營運管理」的全方位人力資源服務平台。

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────┐
│           前台 - 公開形象網站                │
│  (SEO優化、響應式設計)                       │
├─────────────────────────────────────────────┤
│           中台 - 員工工作平台                │
│  (表單處理、客戶管理、簽約流程)              │
├─────────────────────────────────────────────┤
│           後台 - 管理決策系統                │
│  (權限管理、內容編輯、數據分析)              │
├─────────────────────────────────────────────┤
│           基礎服務層                         │
│  (GraphQL API、Prisma ORM、NextAuth)        │
└─────────────────────────────────────────────┘
```

## 🚀 快速開始

### 環境需求
- Node.js 18.17+
- PostgreSQL 14+
- pnpm 8.0+

### 安裝步驟

```bash
# 1. 安裝依賴 (必須使用 pnpm)
pnpm install

# 2. 環境設定
cp .env.example .env.local

# 3. 編輯 .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/manpower"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3001"  # ⚠️ 開發環境預設 port 3001

# 4. 初始化資料庫
pnpm prisma migrate dev
pnpm prisma generate
pnpm db:seed

# 5. 啟動開發伺服器
pnpm dev
```

訪問 http://localhost:3001

### 測試帳號
| 角色 | 帳號 | 密碼 |
|------|------|------|
| 超級管理員 | admin@youshi-hr.com | admin123 |
| 業主 | owner@youshi-hr.com | password123 |
| 業務人員 | staff1@youshi-hr.com | password123 |

## 🔧 開發指令

```bash
# 開發
pnpm dev              # 啟動開發伺服器 (port 3001)
pnpm prisma studio    # 開啟 Prisma Studio

# 資料庫
pnpm prisma migrate dev     # 開發環境遷移
pnpm prisma migrate deploy  # 生產環境遷移 (禁用 --accept-data-loss)
pnpm prisma generate        # 生成 Prisma Client
pnpm prisma db push         # 同步 schema（不建立遷移）
pnpm db:seed                # 填充測試資料

# 建置與部署
pnpm build            # 建置生產版本
pnpm start            # 啟動生產伺服器
pnpm lint             # 程式碼檢查
```

## 📦 核心功能模組

### 1. 動態內容管理系統 (CMS)
- **頁面編輯器**：拖拉式區塊編輯，即時預覽
- **導航管理**：動態管理導航選單（支援多層選單、拖拽排序）
- **媒體管理**：圖片/影片上傳
- **SEO 優化**：Meta tags、結構化數據

### 2. 用戶權限管理 (RBAC) - 三級權限制

| 權限層級 | 角色 | 權限範圍 |
|---------|------|---------|
| 第一級 | SUPER_ADMIN | 系統最高權限，完整存取所有功能 |
| 第二級 | OWNER | 內容管理、表單管理、合約管理、用戶查看 |
| 第三級 | STAFF | 表單處理、合約簽署、檔案上傳 |

### 3. 智能表單系統
- 求職應徵表、企業需求表、加盟申請表
- 多狀態管理（待處理、處理中、已完成、已拒絕）
- 表單統計數據

### 4. 電子簽約管理
- 合約模板庫（勞動合約、服務協議、加盟合約）
- 簽署流程、合約追蹤

### 5. 工作類別與申請流程管理
- 多類別管理（看護工、幫傭、廠工、營造工、養護機構）
- 動態步驟設定
- 後台編輯器

### 6. 邀請碼系統
- 自動生成邀請碼（8 位唯一碼）
- 選填驗證機制
- 績效統計追蹤

### 7. 人力需求系統
- 履歷複選功能（最多 15 位）
- 人力需求表單
- 需求單號自動生成

## 📁 專案結構

```
manpower/
├── app/                      # Next.js 15 App Router
│   ├── page.tsx              # 首頁
│   ├── admin/                # 後台管理
│   │   ├── dashboard/        # 儀表板
│   │   ├── users/            # 用戶管理
│   │   ├── forms/            # 表單管理
│   │   ├── contracts/        # 合約管理
│   │   ├── navigation/       # 導航管理
│   │   └── [slug]/           # 動態頁面編輯
│   └── api/                  # API 路由
│       ├── graphql/          # GraphQL 端點
│       ├── auth/             # 認證相關
│       └── upload/           # 檔案上傳
├── graphql/                  # GraphQL 設定
│   ├── schemas/              # Schema 定義
│   ├── resolvers/            # Resolvers
│   ├── prismaClient.ts       # Prisma 單例
│   └── utils/defaults.ts     # 預設值定義
├── prisma/                   # 資料庫
│   ├── schema.prisma         # 資料模型
│   └── migrations/           # 遷移記錄
├── src/
│   ├── components/           # React 元件
│   │   ├── Admin/            # 後台元件
│   │   ├── Edit/             # 編輯器元件
│   │   ├── Resume/           # 履歷相關
│   │   └── UI/               # 通用 UI
│   ├── hooks/                # 自訂 Hooks
│   │   ├── usePermission.tsx # 權限檢查
│   │   └── useStaffList.ts   # 業務人員快取
│   ├── lib/                  # 工具庫
│   │   └── permissions.ts    # 權限定義
│   └── types/                # TypeScript 型別
└── public/                   # 靜態資源
```

## 🗄️ 資料庫設計

### 核心資料表

| 資料表 | 用途 |
|-------|------|
| User | 用戶管理（含邀請碼、權限） |
| ContentBlock | 動態內容儲存（JSON payload） |
| Navigation | 導航選單（支援階層） |
| FormSubmission | 表單提交記錄 |
| FormTemplate | 表單模板 |
| Contract | 電子合約 |
| ContractTemplate | 合約模板 |
| ManpowerRequest | 人力需求單 |
| Attachment | 附件檔案 |
| ActivityLog | 操作日誌 |
| Analytics | 數據分析 |
| IpBlocklist | IP 黑名單 |

## 🔐 安全機制

- **NextAuth** 身份驗證（JWE session tokens）
- **IP 安全機制**：僅允許指定 IP 執行 Mutation
- **Rate Limiting**：每分鐘最多 100 查詢 / 20 mutation
- **GraphQL 深度限制**：最大 7 層嵌套
- **CSRF Protection**：跨站請求偽造防護
- **輸入驗證**：Zod schema 驗證
- **SQL Injection 防護**：Prisma ORM 參數化查詢

## ⚡ 效能優化

### 後端優化
- **Prisma Client 單例**：避免連接池災難
- **N+1 查詢修復**：使用 Prisma include 和 select
- **DataLoader 批量載入**：User、FormTemplate、Contract、Signature 批量查詢
- **GraphQL 響應快取**：靜態資料 5 分鐘快取，動態資料 30 秒快取
- **資料庫索引優化**：複合索引支援常用查詢模式

### 前端優化
- **Apollo Client 快取**：cache-and-network 策略
- **Apollo 快取持久化**：localStorage 保存快取，頁面重載後恢復（2MB 限制）
- **CKEditor 動態載入**：延遲載入編輯器（約 500KB），顯示骨架屏
- **Next.js ISR**：靜態頁面增量再生成
- **React.memo**：減少不必要的重渲染

### 圖片優化
- **自動壓縮**：使用 sharp 壓縮上傳圖片
- **格式轉換**：JPEG 自動轉 WebP（更好的壓縮率）
- **尺寸限制**：最大 1920x1080，保持比例縮放
- **串流傳輸**：支援 ETag、Range 請求、斷點續傳

## 📝 開發規範

### 程式碼風格
- TypeScript 嚴格模式
- ESLint + Prettier 自動格式化
- 中文註解說明業務邏輯

### Git 提交規範
```
feat: 新功能
fix: 錯誤修復
docs: 文檔更新
style: 代碼格式調整
refactor: 重構
test: 測試相關
chore: 構建/工具更新
```

### 資料夾命名
- 元件：PascalCase (如 `UserProfile`)
- 工具函數：camelCase (如 `formatDate`)
- 路由：kebab-case (如 `user-profile`)

## ⚠️ 重要提醒

1. **必須使用 pnpm** 管理套件，禁用 npm/yarn
2. **禁止使用** `--accept-data-loss` 執行資料庫遷移
3. **所有錯誤**必須完整顯示在前端供調試
4. **更新功能後**必須同步更新此 README.md
5. **生產環境**必須設定強密碼和 HTTPS
6. **NEXTAUTH_URL** 開發環境為 http://localhost:3001

## 🌐 環境變數

```env
# 必要
DATABASE_URL          # PostgreSQL 連接字串
NEXTAUTH_SECRET       # NextAuth 加密金鑰
NEXTAUTH_URL          # 應用程式 URL

# 選填
ALLOWED_ORIGINS       # CORS 允許的域名
NEXT_PUBLIC_GA_MEASUREMENT_ID  # Google Analytics ID
DEBUG_QUERIES         # 顯示所有 Prisma 查詢
DEBUG_GRAPHQL         # 顯示所有 GraphQL 操作
```

## 🎉 功能完成總結

### Phase 1 - 基礎建設 ✅
- 專案初始化與環境設定
- 資料庫架構設計（13+ 核心模型）
- 用戶認證系統（NextAuth + RBAC）
- 基礎 CMS 功能（ContentBlock + GraphQL API）

### Phase 2 - 核心功能 ✅
- 表單管理系統（完整 CRUD、提交記錄處理）
- 權限管理 (RBAC)（三級權限 + 44 項細粒度權限）
- 檔案上傳與管理

### Phase 3 - 頁面系統 ✅
- 首頁編輯器（Header、Hero、精選人才、新聞、聯絡、Footer）
- 申請流程頁面（動態類別與步驟）
- 移工列表頁面（篩選、資料管理）
- 常見問題頁面（分類、FAQ）
- 最新消息頁面（CKEditor 富文本、詳情頁、自動 slug 生成）
- 主力人力頁面（業務人員展示）
- 創業加盟頁面（8 個模組化區塊）
- 履歷瀏覽頁面（搜尋、篩選、複選）
- 人力需求表單（完整流程）

### 後台管理頁面
- `/admin/dashboard` - 儀表板
- `/admin/users` - 用戶管理
- `/admin/forms` - 表單管理
- `/admin/files` - 檔案管理
- `/admin/contracts` - 合約管理
- `/admin/navigation` - 導航管理
- `/admin/analytics` - 數據分析
- `/admin/[slug]` - 動態頁面編輯

### 前台展示頁面
- `/` - 首頁
- `/apply-process` - 申請流程
- `/application-process` - 類別申請流程
- `/workers` - 移工列表
- `/resume` - 履歷瀏覽
- `/resume/request` - 人力需求表單
- `/staff` - 業務人員
- `/news` - 最新消息
- `/news/[slug]` - 新聞詳情
- `/franchise` - 創業加盟
- `/faq` - 常見問題

## 📚 相關文檔

- [Next.js 15 文檔](https://nextjs.org/docs)
- [Prisma 文檔](https://www.prisma.io/docs)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [NextAuth.js](https://next-auth.js.org/)

---

如有任何問題或建議，請聯繫開發團隊。
