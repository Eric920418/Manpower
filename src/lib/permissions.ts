/**
 * RBAC 權限配置系統
 * 四級權限：超級管理員 > 管理員 > 業主 > 業務人員
 */

import { Role } from '@prisma/client';

/**
 * 權限動作類型 - 使用 const object 確保型別安全
 */
export type Permission =
  // 用戶管理
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_roles'
  // 內容管理
  | 'content:create'
  | 'content:read'
  | 'content:update'
  | 'content:delete'
  | 'content:publish'
  // 頁面管理
  | 'page:create'
  | 'page:read'
  | 'page:update'
  | 'page:delete'
  | 'page:publish'
  // 導航管理
  | 'nav:create'
  | 'nav:read'
  | 'nav:update'
  | 'nav:delete'
  // 表單管理
  | 'form:create'
  | 'form:read'
  | 'form:update'
  | 'form:delete'
  | 'form:process'
  | 'form:export'
  // 行政事務管理
  | 'admin_task:create'
  | 'admin_task:read'
  | 'admin_task:update'
  | 'admin_task:delete'
  | 'admin_task:approve'
  // 檔案管理
  | 'file:upload'
  | 'file:read'
  | 'file:delete'
  // 系統設定
  | 'system:config'
  | 'system:logs'
  | 'system:analytics'
  // 儀表板
  | 'dashboard:view'
  | 'dashboard:stats';

/**
 * ✅ 權限常量對象 - 用於型別安全的權限檢查
 * 使用方式：Permission.USER_READ 而非 'user:read'
 */
export const PermissionEnum = {
  // 用戶管理
  USER_CREATE: 'user:create' as const,
  USER_READ: 'user:read' as const,
  USER_UPDATE: 'user:update' as const,
  USER_DELETE: 'user:delete' as const,
  USER_MANAGE_ROLES: 'user:manage_roles' as const,
  // 內容管理
  CONTENT_CREATE: 'content:create' as const,
  CONTENT_READ: 'content:read' as const,
  CONTENT_UPDATE: 'content:update' as const,
  CONTENT_DELETE: 'content:delete' as const,
  CONTENT_PUBLISH: 'content:publish' as const,
  // 頁面管理
  PAGE_CREATE: 'page:create' as const,
  PAGE_READ: 'page:read' as const,
  PAGE_UPDATE: 'page:update' as const,
  PAGE_DELETE: 'page:delete' as const,
  PAGE_PUBLISH: 'page:publish' as const,
  // 導航管理
  NAV_CREATE: 'nav:create' as const,
  NAV_READ: 'nav:read' as const,
  NAV_UPDATE: 'nav:update' as const,
  NAV_DELETE: 'nav:delete' as const,
  // 表單管理
  FORM_CREATE: 'form:create' as const,
  FORM_READ: 'form:read' as const,
  FORM_UPDATE: 'form:update' as const,
  FORM_DELETE: 'form:delete' as const,
  FORM_PROCESS: 'form:process' as const,
  FORM_EXPORT: 'form:export' as const,
  // 行政事務管理
  ADMIN_TASK_CREATE: 'admin_task:create' as const,
  ADMIN_TASK_READ: 'admin_task:read' as const,
  ADMIN_TASK_UPDATE: 'admin_task:update' as const,
  ADMIN_TASK_DELETE: 'admin_task:delete' as const,
  ADMIN_TASK_APPROVE: 'admin_task:approve' as const,
  // 檔案管理
  FILE_UPLOAD: 'file:upload' as const,
  FILE_READ: 'file:read' as const,
  FILE_DELETE: 'file:delete' as const,
  // 系統設定
  SYSTEM_CONFIG: 'system:config' as const,
  SYSTEM_LOGS: 'system:logs' as const,
  SYSTEM_ANALYTICS: 'system:analytics' as const,
  // 儀表板
  DASHBOARD_VIEW: 'dashboard:view' as const,
  DASHBOARD_STATS: 'dashboard:stats' as const,
} as const;

/**
 * 角色權限映射表
 */
export const RolePermissions: Record<Role, Permission[]> = {
  /**
   * 超級管理員 - 擁有所有權限
   */
  SUPER_ADMIN: [
    // 用戶管理
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage_roles',
    // 內容管理
    'content:create',
    'content:read',
    'content:update',
    'content:delete',
    'content:publish',
    // 頁面管理
    'page:create',
    'page:read',
    'page:update',
    'page:delete',
    'page:publish',
    // 導航管理
    'nav:create',
    'nav:read',
    'nav:update',
    'nav:delete',
    // 表單管理
    'form:create',
    'form:read',
    'form:update',
    'form:delete',
    'form:process',
    'form:export',
    // 行政事務管理
    'admin_task:create',
    'admin_task:read',
    'admin_task:update',
    'admin_task:delete',
    'admin_task:approve',
    // 檔案管理
    'file:upload',
    'file:read',
    'file:delete',
    // 系統設定
    'system:config',
    'system:logs',
    'system:analytics',
    // 儀表板
    'dashboard:view',
    'dashboard:stats',
  ],

  /**
   * 管理員 - 行政事務處理人員
   * 可以：
   * - 處理被分配的任務類型案件
   * - 審批行政事務
   * - 查看基本儀表板
   * 不可以：
   * - 管理用戶
   * - 管理系統設定
   * - 管理申請類型
   */
  ADMIN: [
    // 用戶管理（僅查看）
    'user:read',

    // 內容管理（僅查看）
    'content:read',

    // 頁面管理（僅查看）
    'page:read',

    // 導航管理（僅查看）
    'nav:read',

    // 表單管理（受限）
    'form:read',
    'form:process',

    // 行政事務管理（完整權限，但僅限被分配的類型）
    'admin_task:create',
    'admin_task:read',
    'admin_task:update',
    'admin_task:approve',

    // 檔案管理（受限）
    'file:upload',
    'file:read',

    // 儀表板
    'dashboard:view',
    'dashboard:stats',
  ],

  /**
   * 業主 - 公司經營者
   * 可以：
   * - 管理所有內容和頁面
   * - 查看所有表單
   * - 查看系統分析和日誌
   * - 管理一般用戶（不能管理超級管理員）
   * 不可以：
   * - 修改系統核心設定
   * - 刪除用戶
   * - 審批行政事務（目前僅 SUPER_ADMIN）
   */
  OWNER: [
    // 用戶管理（受限）
    'user:read',
    'user:create',
    'user:update',

    // 內容管理（完整）
    'content:create',
    'content:read',
    'content:update',
    'content:delete',
    'content:publish',

    // 頁面管理（完整）
    'page:create',
    'page:read',
    'page:update',
    'page:delete',
    'page:publish',

    // 導航管理（完整）
    'nav:create',
    'nav:read',
    'nav:update',
    'nav:delete',

    // 表單管理（完整）
    'form:create',
    'form:read',
    'form:update',
    'form:delete',
    'form:process',
    'form:export',

    // 行政事務管理（僅創建和查看，不能審批）
    'admin_task:create',
    'admin_task:read',
    'admin_task:update',

    // 檔案管理（完整）
    'file:upload',
    'file:read',
    'file:delete',

    // 系統功能（僅查看）
    'system:logs',
    'system:analytics',

    // 儀表板（完整）
    'dashboard:view',
    'dashboard:stats',
  ],

  /**
   * 業務人員 - 一般員工
   * 可以：
   * - 查看和處理表單
   * - 創建行政任務（作為申請人）
   * - 上傳檔案
   * - 查看基本儀表板
   * 不可以：
   * - 管理用戶
   * - 刪除任何資料
   * - 修改系統設定
   * - 審批行政事務
   */
  STAFF: [
    // 用戶管理（僅查看自己）
    'user:read',

    // 內容管理（僅查看）
    'content:read',

    // 頁面管理（僅查看）
    'page:read',

    // 導航管理（僅查看）
    'nav:read',

    // 表單管理（受限）
    'form:read',
    'form:process',

    // 行政事務管理（僅創建和查看）
    'admin_task:create',
    'admin_task:read',

    // 檔案管理（受限）
    'file:upload',
    'file:read',

    // 儀表板（基本）
    'dashboard:view',
  ],
};


/**
 * 檢查用戶是否擁有特定權限
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  // 超級管理員擁有所有權限
  if ((userRole as string) === 'SUPER_ADMIN') {
    return true;
  }

  const permissions = RolePermissions[userRole];
  if (!permissions) {
    return false;
  }

  return permissions.includes(permission);
}

/**
 * 檢查用戶是否擁有任一權限
 */
export function hasAnyPermission(
  userRole: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission));
}

/**
 * 檢查用戶是否擁有所有權限
 */
export function hasAllPermissions(
  userRole: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission));
}

/**
 * 獲取角色的所有權限
 */
export function getRolePermissions(role: Role): Permission[] {
  return RolePermissions[role];
}

/**
 * 檢查角色層級（用於判斷是否可以管理其他用戶）
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    OWNER: 2,
    STAFF: 1,
  };

  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}

/**
 * 權限說明（用於後台顯示）
 */
export const RoleDescriptions: Record<Role, string> = {
  SUPER_ADMIN: '系統最高權限，可執行所有操作，包括系統設定和用戶管理',
  ADMIN: '管理員權限，可處理被分配的行政事務類型，審批案件',
  OWNER: '公司經營者權限，可管理內容、表單、合約，但不能修改系統核心設定',
  STAFF: '一般員工權限，可處理表單和簽署合約，僅有查看權限',
};

/**
 * 獲取角色的中文名稱
 */
export const RoleNames: Record<Role, string> = {
  SUPER_ADMIN: '超級管理員',
  ADMIN: '管理員',
  OWNER: '業主',
  STAFF: '業務人員',
};

/**
 * 權限定義（含中文說明）
 */
export interface PermissionDefinition {
  key: Permission;
  label: string;
  description: string;
  category: string;
}

/**
 * 權限分類
 */
export interface PermissionCategory {
  key: string;
  label: string;
  permissions: PermissionDefinition[];
}

/**
 * 所有可用權限的定義（用於權限管理頁面）
 */
export const AllPermissionDefinitions: PermissionCategory[] = [
  {
    key: 'user',
    label: '用戶管理',
    permissions: [
      { key: 'user:create', label: '新增用戶', description: '可以創建新的系統用戶帳號', category: 'user' },
      { key: 'user:read', label: '查看用戶', description: '可以查看用戶列表和詳細資料', category: 'user' },
      { key: 'user:update', label: '編輯用戶', description: '可以修改用戶的基本資料', category: 'user' },
      { key: 'user:delete', label: '刪除用戶', description: '可以刪除用戶帳號', category: 'user' },
      { key: 'user:manage_roles', label: '管理角色', description: '可以變更用戶的角色權限', category: 'user' },
    ],
  },
  {
    key: 'page',
    label: '頁面管理',
    permissions: [
      { key: 'page:create', label: '新增頁面', description: '可以創建新的網站頁面', category: 'page' },
      { key: 'page:read', label: '查看頁面', description: '可以查看頁面內容', category: 'page' },
      { key: 'page:update', label: '編輯頁面', description: '可以修改網站頁面內容', category: 'page' },
      { key: 'page:delete', label: '刪除頁面', description: '可以刪除網站頁面', category: 'page' },
      { key: 'page:publish', label: '發布頁面', description: '可以發布或取消發布頁面', category: 'page' },
    ],
  },
  {
    key: 'content',
    label: '內容管理',
    permissions: [
      { key: 'content:create', label: '新增內容', description: '可以創建新的內容區塊', category: 'content' },
      { key: 'content:read', label: '查看內容', description: '可以查看內容區塊', category: 'content' },
      { key: 'content:update', label: '編輯內容', description: '可以修改內容區塊', category: 'content' },
      { key: 'content:delete', label: '刪除內容', description: '可以刪除內容區塊', category: 'content' },
      { key: 'content:publish', label: '發布內容', description: '可以發布內容', category: 'content' },
    ],
  },
  {
    key: 'nav',
    label: '導航管理',
    permissions: [
      { key: 'nav:create', label: '新增導航', description: '可以創建新的導航選單項目', category: 'nav' },
      { key: 'nav:read', label: '查看導航', description: '可以查看導航設定', category: 'nav' },
      { key: 'nav:update', label: '編輯導航', description: '可以修改導航選單', category: 'nav' },
      { key: 'nav:delete', label: '刪除導航', description: '可以刪除導航項目', category: 'nav' },
    ],
  },
  {
    key: 'form',
    label: '表單管理',
    permissions: [
      { key: 'form:create', label: '新增表單', description: '可以創建新的表單', category: 'form' },
      { key: 'form:read', label: '查看表單', description: '可以查看表單資料', category: 'form' },
      { key: 'form:update', label: '編輯表單', description: '可以修改表單設定', category: 'form' },
      { key: 'form:delete', label: '刪除表單', description: '可以刪除表單', category: 'form' },
      { key: 'form:process', label: '處理表單', description: '可以處理提交的表單', category: 'form' },
      { key: 'form:export', label: '匯出表單', description: '可以匯出表單資料', category: 'form' },
    ],
  },
  {
    key: 'admin_task',
    label: '行政事務',
    permissions: [
      { key: 'admin_task:create', label: '新增任務', description: '可以創建新的行政任務', category: 'admin_task' },
      { key: 'admin_task:read', label: '查看任務', description: '可以查看行政任務', category: 'admin_task' },
      { key: 'admin_task:update', label: '編輯任務', description: '可以修改行政任務', category: 'admin_task' },
      { key: 'admin_task:delete', label: '刪除任務', description: '可以刪除行政任務', category: 'admin_task' },
      { key: 'admin_task:approve', label: '審批任務', description: '可以審批行政任務', category: 'admin_task' },
    ],
  },
  {
    key: 'file',
    label: '檔案管理',
    permissions: [
      { key: 'file:upload', label: '上傳檔案', description: '可以上傳檔案', category: 'file' },
      { key: 'file:read', label: '查看檔案', description: '可以查看檔案', category: 'file' },
      { key: 'file:delete', label: '刪除檔案', description: '可以刪除檔案', category: 'file' },
    ],
  },
  {
    key: 'system',
    label: '系統設定',
    permissions: [
      { key: 'system:config', label: '系統設定', description: '可以修改系統設定', category: 'system' },
      { key: 'system:logs', label: '查看日誌', description: '可以查看活動日誌', category: 'system' },
      { key: 'system:analytics', label: '數據分析', description: '可以查看數據分析報表', category: 'system' },
    ],
  },
  {
    key: 'dashboard',
    label: '儀表板',
    permissions: [
      { key: 'dashboard:view', label: '查看儀表板', description: '可以查看儀表板', category: 'dashboard' },
      { key: 'dashboard:stats', label: '查看統計', description: '可以查看統計數據', category: 'dashboard' },
    ],
  },
];

/**
 * 自訂權限結構
 */
export interface CustomPermissions {
  granted: Permission[];
  denied: Permission[];
}

/**
 * 檢查用戶是否擁有特定權限（支援自訂權限）
 */
export function hasPermissionWithCustom(
  userRole: Role,
  permission: Permission,
  customPermissions?: CustomPermissions | null
): boolean {
  // 超級管理員擁有所有權限
  if ((userRole as string) === 'SUPER_ADMIN') {
    return true;
  }

  // 檢查是否被明確禁止
  if (customPermissions?.denied?.includes(permission)) {
    return false;
  }

  // 檢查是否被額外授予
  if (customPermissions?.granted?.includes(permission)) {
    return true;
  }

  // 檢查角色默認權限
  const permissions = RolePermissions[userRole];
  if (!permissions) {
    return false;
  }

  return permissions.includes(permission);
}

/**
 * 獲取用戶的有效權限列表（考慮角色 + 自訂權限）
 */
export function getEffectivePermissions(
  userRole: Role,
  customPermissions?: CustomPermissions | null
): Permission[] {
  // 超級管理員擁有所有權限
  if ((userRole as string) === 'SUPER_ADMIN') {
    return RolePermissions.SUPER_ADMIN;
  }

  // 從角色權限開始
  const rolePermissions = new Set(RolePermissions[userRole] || []);

  // 添加額外授予的權限
  if (customPermissions?.granted) {
    customPermissions.granted.forEach(p => rolePermissions.add(p));
  }

  // 移除被禁止的權限
  if (customPermissions?.denied) {
    customPermissions.denied.forEach(p => rolePermissions.delete(p));
  }

  return Array.from(rolePermissions);
}
