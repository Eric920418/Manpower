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

### 1. 智慧儀表板 (Dashboard)
- **動態統計數據**：即時顯示用戶數、人力需求、行政任務等關鍵指標
- **本月統計**：新需求數、已完成數、新任務數、完成任務數
- **最近活動記錄**：操作日誌追蹤（新增、更新、刪除、登入等）
- **最近人力需求**：快速查看最新提交的需求
- **最近行政任務**：管理員可見最新任務狀態
- **快速操作**：一鍵進入常用功能頁面
- **權限感知**：根據用戶角色顯示不同內容

### 2. 動態內容管理系統 (CMS)
- **頁面編輯器**：拖拉式區塊編輯，即時預覽
- **導航管理**：動態管理導航選單（支援多層選單、拖拽排序）
- **媒體管理**：圖片/影片上傳
- **SEO 優化**：Meta tags、結構化數據

### 3. 用戶權限管理 (RBAC) - 四級權限制

| 權限層級 | 角色 | 權限範圍 |
|---------|------|---------|
| 第一級 | SUPER_ADMIN | 系統最高權限，可管理所有功能、查看所有管理員案件、分配管理員任務類型、管理活動日誌、細粒度權限控制 |
| 第二級 | ADMIN | 管理員，可處理被分配的任務類型案件、進行審批操作 |
| 第三級 | OWNER | 內容管理、表單管理、合約管理、用戶查看 |
| 第四級 | STAFF | 表單處理、合約簽署、檔案上傳 |

**SUPER_ADMIN 與 ADMIN 的區別：**
- SUPER_ADMIN 可以管理申請類型 (`/admin/task-types`)
- SUPER_ADMIN 可以分配管理員負責的任務類型 (`/admin/admin-assignments`)
- SUPER_ADMIN 可以看到所有管理員負責的案件
- SUPER_ADMIN 可以查看整個網站所有會員操作記錄
- SUPER_ADMIN 可以細粒度管理每個用戶的權限 (`/admin/user-permissions`)
- ADMIN 只能看到自己被分配的任務類型的案件

**細粒度權限控制（僅 SUPER_ADMIN）：**
- 可以為每個用戶單獨設定權限
- **授予權限（granted）**：賦予用戶角色原本沒有的權限
- **禁止權限（denied）**：禁止用戶使用角色原本擁有的權限
- 權限分為 9 大類：用戶管理、頁面管理、內容管理、導航管理、表單管理、行政事務、檔案管理、系統設定、儀表板
- 共 32 項細粒度權限可控制

### 4. 行政事務簽核系統
- **動態任務類型管理**：可自由新增、編輯、刪除申請類型（預設含建檔、廢聘、長照求才等10種類型）
- **自訂問題功能**：每個任務類型可設定無限數量的自訂問題
  - 支援三種問題類型：文字回答、單選題、複選題
  - 可設定問題是否為必填
  - 問題順序可自由調整
  - 新增行政申請時自動顯示該類型的問題
- **可視化工作流程編輯器**（React Flow）：
  - 拖拉式節點編輯，直覺調整任務類型位置
  - 視覺化連線建立流程關係
  - 支援多重後續類型（一對多分支流程）
  - 支援線性流程和分支流程混合
  - 即時預覽流程圖
- **任務流程關聯**：支援任務類型之間的步驟關係
  - **固定流程**：完成某類型任務後自動建議創建指定的後續任務
  - **條件流程**：根據問題答案觸發不同的後續任務
  - **多重後續**：一個任務類型可連接多個後續類型
  - 例如：建檔完成後同時建議創建「合約簽署」和「體檢安排」
  - 例如：回答「是否需要廢聘」為「是」時建議創建「廢聘」任務
- **關聯任務分組顯示**：
  - 相關聯的任務自動歸入同一群組
  - 任務列表支援摺疊/展開顯示
  - 主任務顯示關聯任務數量
  - 子任務以縮排方式展示
- **六種任務狀態**：待處理、處理中、待補件、已批准、已退回、已完成
- **管理員任務分配**：SUPER_ADMIN 可分配各管理員負責的任務類型
- **自訂申請人/完成人**：可手動輸入申請人和完成人名稱，不限於系統用戶
- **統計儀表板**：任務數量、完成率、逾期監控

### 5. 活動日誌系統（僅 SUPER_ADMIN）
- **全站操作追蹤**：記錄所有後台管理操作
- **詳細記錄內容**：
  - **用戶管理**：創建、更新、刪除、啟停用、密碼重置
  - **任務類型管理**：創建、更新、刪除任務類型
  - **行政任務**：創建、更新、刪除、審批、狀態變更、分配、附件上傳/刪除
  - **頁面內容編輯**：各頁面內容更新（首頁、申請流程、移工列表等）
  - **導航管理**：創建、更新、刪除、排序調整
  - **人力需求管理**：更新、刪除需求單
  - **工作流程編輯**：節點位置、流程連線變更
  - **檔案上傳**：圖片上傳、任務附件上傳
- **統計儀表板**：今日/本週/本月操作統計
- **篩選功能**：按用戶、操作類型、實體類型、日期範圍篩選
- **分頁顯示**：高效處理大量日誌記錄

### 6. 工作類別與申請流程管理
- 多類別管理（看護工、幫傭、廠工、營造工、養護機構）
- 動態步驟設定
- 後台編輯器

### 7. 邀請碼系統
- 自動生成邀請碼（8 位唯一碼）
- 選填驗證機制
- 績效統計追蹤

### 8. 人力需求系統
- 履歷複選功能（最多 15 位）
- 人力需求表單
- 需求單號自動生成

### 9. 移工履歷卡片系統
- **資訊卡片設計**：清楚顯示移工完整資料
  - NEW 標籤（標示新進人員）
  - 大頭照
  - 姓名
  - 國籍標籤（印尼、菲律賓、越南、泰國等，各有對應配色）
  - 外國人編號
  - 年齡
  - 學歷
  - 身高/體重
  - 選定按鈕（可複選）
- **Worker 資料欄位**：
  - `id` - 唯一識別碼
  - `name` - 姓名
  - `foreignId` - 外國人編號
  - `age` - 年齡
  - `gender` - 性別
  - `country` - 國籍
  - `photo` - 照片
  - `education` - 學歷
  - `height` - 身高(cm)
  - `weight` - 體重(kg)
  - `isNew` - 是否為新人
  - `experience` - 工作經驗
  - `skills` - 技能列表
  - `languages` - 語言能力
  - `category` - 工作類別
  - `sourceType` - 來源類型（國內轉出工/國外引進工）

## 📁 專案結構

```
manpower/
├── app/                      # Next.js 15 App Router
│   ├── page.tsx              # 首頁
│   ├── admin/                # 後台管理
│   │   ├── dashboard/        # 儀表板
│   │   ├── users/            # 用戶管理
│   │   ├── admin-tasks/      # 行政事務簽核
│   │   ├── manpower-requests/# 人力需求管理
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
| Page | 動態頁面管理 |
| TaskType | 可動態管理的任務類型（含自訂問題、位置座標） |
| TaskTypeFlow | 任務類型流程關聯（多對多，支援條件觸發） |
| AdminTask | 行政任務（關聯 TaskType、支援父子關聯、群組分類） |
| AdminTaskTypeAssignment | 管理員任務類型分配（多對多關聯） |
| ApprovalRecord | 審批記錄 |
| AdminTaskAttachment | 行政任務附件 |
| ManpowerRequest | 人力需求單 |
| ActivityLog | 操作日誌 |
| Analytics | 數據分析 |
| SystemConfig | 系統設定 |

## 🔐 安全機制

- **NextAuth** 身份驗證（JWE session tokens）
- **IP 安全機制**：僅允許指定 IP 執行 Mutation
- **Rate Limiting**：每分鐘最多 100 查詢 / 20 mutation
- **GraphQL 深度限制**：最大 7 層嵌套
- **CSRF Protection**：跨站請求偽造防護
- **輸入驗證**：Zod schema 驗證
- **SQL Injection 防護**：Prisma ORM 參數化查詢
- **Google reCAPTCHA v3**：聯絡表單隱形驗證（分數 < 0.5 自動攔截）

## ⚡ 效能優化

### 後端優化
- **Prisma Client 單例**：避免連接池災難
- **N+1 查詢修復**：使用 Prisma include 和 select
- **DataLoader 批量載入**：User、AdminTask、ApprovalRecord 批量查詢
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

# Google reCAPTCHA v3（聯絡表單防護）
NEXT_PUBLIC_RECAPTCHA_SITE_KEY  # reCAPTCHA 網站金鑰（前端用）
RECAPTCHA_SECRET_KEY            # reCAPTCHA 私密金鑰（後端驗證用）
```

## 🎉 功能完成總結

### Phase 1 - 基礎建設 ✅
- 專案初始化與環境設定
- 資料庫架構設計（13+ 核心模型）
- 用戶認證系統（NextAuth + RBAC）
- 基礎 CMS 功能（ContentBlock + GraphQL API）

### Phase 2 - 核心功能 ✅
- 行政事務簽核系統（十種類型、五種狀態、審批流程）
- 權限管理 (RBAC)（三級權限 + 細粒度權限控制）
- 檔案上傳與管理

### Phase 3 - 頁面系統 ✅
- 首頁編輯器（Header、Hero、精選人才、新聞、聯絡、Footer）
- 申請流程頁面（動態類別與步驟）
- 移工列表頁面（篩選、資料管理）
- 常見問題頁面（分類、FAQ）
- 最新消息頁面（CKEditor 富文本、詳情頁、自動 slug 生成）
- 主力人力頁面（業務人員展示）
- 創業加盟頁面（8 個模組化區塊，支援分頁切換顯示加盟主分享卡片列表）
- 履歷瀏覽頁面（搜尋、篩選、複選）
- 人力需求表單（完整流程）

### 後台管理頁面
- `/admin/dashboard` - 智慧儀表板（動態統計、最近活動、快速操作）
- `/admin/users` - 用戶管理
- `/admin/admin-tasks` - 行政事務管理（簽核系統，ADMIN 和 SUPER_ADMIN 可訪問）
- `/admin/task-types` - 申請類型管理（僅 SUPER_ADMIN）
- `/admin/admin-assignments` - 管理員任務分配（僅 SUPER_ADMIN，分配管理員負責的任務類型）
- `/admin/user-permissions` - 用戶權限管理（僅 SUPER_ADMIN，細粒度控制每個用戶的權限）
- `/admin/activity-logs` - 活動日誌（僅 SUPER_ADMIN，查看全站用戶操作行為記錄）
- `/admin/manpower-requests` - 人力需求管理
- `/admin/navigation` - 導航管理
- `/admin/analytics` - 數據分析
- `/admin/home-page` - 首頁編輯
- `/admin/application-process` - 申請流程編輯
- `/admin/workers` - 移工列表編輯
- `/admin/faq` - 常見問題編輯
- `/admin/news` - 最新消息編輯
- `/admin/staff` - 業務人員編輯
- `/admin/franchise` - 創業加盟編輯
- `/admin/privacy-policy` - 隱私權政策編輯

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
- `/franchise` - 創業加盟（分頁切換、加盟主分享卡片列表）
- `/franchise/stories/[id]` - 加盟主分享文章詳情
- `/faq` - 常見問題
- `/privacy-policy` - 隱私權與網站使用說明

## 📚 相關文檔

- [Next.js 15 文檔](https://nextjs.org/docs)
- [Prisma 文檔](https://www.prisma.io/docs)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [NextAuth.js](https://next-auth.js.org/)

---

如有任何問題或建議，請聯繫開發團隊。
