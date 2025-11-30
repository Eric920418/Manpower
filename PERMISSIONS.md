# 權限系統說明文檔

本系統採用 **三級 RBAC（Role-Based Access Control）** 權限架構。

## 🎯 權限架構總覽

```
┌─────────────────────────────────────────┐
│       超級管理員 (SUPER_ADMIN)          │
│              100% 權限                   │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│           業主 (OWNER)                   │
│        ~80% 權限（管理層級）             │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│        業務人員 (STAFF)                  │
│        ~30% 權限（執行層級）             │
└─────────────────────────────────────────┘
```

## 📋 權限對照表

### 超級管理員 (SUPER_ADMIN)

**定位**：系統維護者、技術管理員

**完整權限清單**：
- ✅ 所有系統功能
- ✅ 用戶管理（CRUD + 角色分配）
- ✅ 系統核心設定
- ✅ 資料庫管理
- ✅ 日誌與審計
- ✅ 安全設定

**使用場景**：
- 系統初始化設定
- 緊急故障排除
- 安全性配置
- 權限分配

---

### 業主 (OWNER)

**定位**：公司經營者、內容管理者

**擁有權限**：
| 功能模組 | 建立 | 讀取 | 更新 | 刪除 | 發布 | 備註 |
|---------|------|------|------|------|------|------|
| 用戶管理 | ✅ | ✅ | ✅ | ❌ | - | 不能刪除用戶或改角色 |
| 內容管理 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整權限 |
| 頁面管理 | ✅ | ✅ | ✅ | ✅ | ✅ | 完整權限 |
| 導航管理 | ✅ | ✅ | ✅ | ✅ | - | 完整權限 |
| 表單管理 | ✅ | ✅ | ✅ | ✅ | - | 含模板建立與匯出 |
| 合約管理 | ✅ | ✅ | ✅ | ✅ | ✅ | 含核准權限 |
| 檔案管理 | ✅ | ✅ | - | ✅ | - | 完整權限 |
| 系統設定 | ❌ | ✅ | ❌ | ❌ | - | 僅查看 |
| 系統日誌 | - | ✅ | - | - | - | 僅查看 |
| 數據分析 | - | ✅ | - | - | - | 完整統計 |

**限制事項**：
- ❌ 不能修改系統核心設定（如資料庫連線、API 金鑰）
- ❌ 不能刪除用戶帳號（僅能停用）
- ❌ 不能修改用戶角色權限
- ❌ 不能查看敏感系統日誌

**使用場景**：
- 日常內容更新
- 表單處理與回覆
- 合約審核與核准
- 業務數據查看
- 團隊成員管理（建立/編輯）

---

### 業務人員 (STAFF)

**定位**：一般員工、客服人員

**擁有權限**：
| 功能模組 | 建立 | 讀取 | 更新 | 刪除 | 處理 | 備註 |
|---------|------|------|------|------|------|------|
| 用戶管理 | ❌ | ✅ | ❌ | ❌ | - | 僅查看自己資料 |
| 內容管理 | ❌ | ✅ | ❌ | ❌ | - | 僅查看 |
| 頁面管理 | ❌ | ✅ | ❌ | ❌ | - | 僅查看 |
| 導航管理 | ❌ | ✅ | ❌ | ❌ | - | 僅查看 |
| 表單管理 | ❌ | ✅ | ❌ | ❌ | ✅ | 可處理客戶表單 |
| 合約管理 | ❌ | ✅ | ❌ | ❌ | ✅ | 可簽署自己的合約 |
| 檔案管理 | ✅ | ✅ | ❌ | ❌ | - | 可上傳相關檔案 |
| 儀表板 | - | ✅ | - | - | - | 僅基本數據 |

**限制事項**：
- ❌ 不能建立或修改任何模板
- ❌ 不能刪除任何資料
- ❌ 不能查看其他員工的詳細資料
- ❌ 不能匯出完整數據
- ❌ 不能查看系統設定

**使用場景**：
- 回覆客戶表單
- 簽署勞動合約
- 上傳工作相關檔案
- 查看自己的工作數據

---

## 💡 權限使用範例

### 前端權限檢查

```typescript
// 1. 使用 Hook 檢查權限
import { usePermission } from '@/hooks/usePermission';
import { Permission } from '@/lib/permissions';

function UserManagementPage() {
  const { can, canAny, isSuperAdmin, isOwner } = usePermission();

  return (
    <div>
      {/* 僅超級管理員可見 */}
      {isSuperAdmin() && <SystemConfigButton />}

      {/* 超級管理員或業主可見 */}
      {(isSuperAdmin() || isOwner()) && <UserListTable />}

      {/* 檢查特定權限 */}
      {can(Permission.USER_DELETE) && <DeleteUserButton />}

      {/* 檢查多個權限（任一） */}
      {canAny([Permission.USER_CREATE, Permission.USER_UPDATE]) && (
        <UserForm />
      )}
    </div>
  );
}

// 2. 使用權限守衛組件
import { PermissionGuard, RoleGuard } from '@/hooks/usePermission';

function Dashboard() {
  return (
    <div>
      {/* 需要特定權限才顯示 */}
      <PermissionGuard permission={Permission.DASHBOARD_STATS}>
        <StatisticsPanel />
      </PermissionGuard>

      {/* 需要特定角色才顯示 */}
      <RoleGuard roles={[Role.SUPER_ADMIN, Role.OWNER]}>
        <ManagementPanel />
      </RoleGuard>

      {/* 無權限時顯示替代內容 */}
      <PermissionGuard
        permission={Permission.CONTRACT_APPROVE}
        fallback={<div>您無權限核准合約</div>}
      >
        <ApproveButton />
      </PermissionGuard>
    </div>
  );
}
```

### 後端權限檢查

```typescript
// GraphQL Resolver 範例
import { hasPermission, canManageRole } from '@/lib/permissions';
import { Permission } from '@/lib/permissions';

const resolvers = {
  Mutation: {
    deleteUser: async (_, { userId }, context) => {
      // 檢查是否有刪除權限
      if (!hasPermission(context.user.role, Permission.USER_DELETE)) {
        throw new Error('您沒有權限刪除用戶');
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      // 檢查是否可以管理該角色
      if (!canManageRole(context.user.role, targetUser.role)) {
        throw new Error('您無法刪除更高層級的用戶');
      }

      return await prisma.user.delete({ where: { id: userId } });
    },

    updateContract: async (_, { id, data }, context) => {
      const contract = await prisma.contract.findUnique({ where: { id } });

      // 業務人員只能修改自己相關的合約
      if (
        context.user.role === Role.STAFF &&
        contract.createdBy !== context.user.id
      ) {
        throw new Error('您只能修改自己的合約');
      }

      // 檢查更新權限
      if (!hasPermission(context.user.role, Permission.CONTRACT_UPDATE)) {
        throw new Error('您沒有權限修改合約');
      }

      return await prisma.contract.update({ where: { id }, data });
    },
  },
};
```

### Middleware 路由保護

```typescript
// middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { Permission } from '@/lib/permissions';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = token.role as Role;

  // 超級管理員專屬路徑
  if (request.nextUrl.pathname.startsWith('/admin/system')) {
    if (userRole !== Role.SUPER_ADMIN) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // 業主以上才能進入用戶管理
  if (request.nextUrl.pathname.startsWith('/admin/users')) {
    if (!hasPermission(userRole, Permission.USER_READ)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

---

## 🔐 安全性考量

### 1. 最小權限原則
每個角色僅授予執行其職責所需的最小權限集合。

### 2. 防禦性檢查
即使前端已經隱藏了按鈕，後端 API 仍需進行權限驗證。

### 3. 審計日誌
所有敏感操作（用戶管理、權限變更）都會記錄在 `ActivityLog` 表中。

### 4. 角色層級保護
低層級角色無法修改或刪除高層級角色的用戶。

```typescript
// ✅ 正確：業主可以編輯業務人員
Owner → Staff ✓

// ❌ 錯誤：業主不能編輯超級管理員
Owner → Super Admin ✗

// ❌ 錯誤：業務人員不能編輯任何人
Staff → Anyone ✗
```

---

## 📊 權限決策流程圖

```
用戶請求操作
    ↓
檢查是否登入？
    ↓ 是
檢查角色權限
    ↓
是否為 SUPER_ADMIN？
    ↓ 是          ↓ 否
  允許所有      檢查具體權限
                    ↓
              權限列表中是否包含？
                ↓ 是        ↓ 否
              允許操作     拒絕操作
                              ↓
                          記錄未授權嘗試
                              ↓
                          返回錯誤訊息
```

---

## 🚀 快速參考

### 常見權限檢查

```typescript
// 是否可以建立用戶？
can(Permission.USER_CREATE);

// 是否可以刪除表單？
can(Permission.FORM_DELETE);

// 是否可以核准合約？
can(Permission.CONTRACT_APPROVE);

// 是否可以查看系統設定？
can(Permission.SYSTEM_CONFIG);

// 是否可以匯出數據？
can(Permission.FORM_EXPORT);
```

### 角色判斷

```typescript
isSuperAdmin(); // 是否為超級管理員
isOwner(); // 是否為業主
isStaff(); // 是否為業務人員

// 是否可以管理某個角色
canManage(Role.STAFF); // 業主可以管理業務人員
canManage(Role.OWNER); // 僅超級管理員可以
```

---

## 📝 權限變更記錄

| 日期 | 變更內容 | 影響 |
|------|---------|------|
| 2025-11-13 | 從六級權限簡化為三級權限 | 所有角色定義 |
| 2025-11-13 | 建立完整權限配置文件 | 新增權限檢查機制 |

---

**維護者**：開發團隊
**最後更新**：2025-11-13
