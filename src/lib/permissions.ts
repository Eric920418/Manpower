/**
 * RBAC 權限配置系統
 * 三級權限：超級管理員 > 業主 > 業務人員
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
  // 合約管理
  | 'contract:create'
  | 'contract:read'
  | 'contract:update'
  | 'contract:delete'
  | 'contract:sign'
  | 'contract:approve'
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
  // 合約管理
  CONTRACT_CREATE: 'contract:create' as const,
  CONTRACT_READ: 'contract:read' as const,
  CONTRACT_UPDATE: 'contract:update' as const,
  CONTRACT_DELETE: 'contract:delete' as const,
  CONTRACT_SIGN: 'contract:sign' as const,
  CONTRACT_APPROVE: 'contract:approve' as const,
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
    // 合約管理
    'contract:create',
    'contract:read',
    'contract:update',
    'contract:delete',
    'contract:sign',
    'contract:approve',
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
   * 業主 - 公司經營者
   * 可以：
   * - 管理所有內容和頁面
   * - 查看所有表單和合約
   * - 查看系統分析和日誌
   * - 管理一般用戶（不能管理超級管理員）
   * 不可以：
   * - 修改系統核心設定
   * - 刪除用戶
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

    // 合約管理（完整）
    'contract:create',
    'contract:read',
    'contract:update',
    'contract:delete',
    'contract:sign',
    'contract:approve',

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
   * - 查看合約（僅自己相關）
   * - 上傳檔案
   * - 查看基本儀表板
   * 不可以：
   * - 管理用戶
   * - 刪除任何資料
   * - 修改系統設定
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

    // 合約管理（受限）
    'contract:read',
    'contract:sign',

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
    SUPER_ADMIN: 3,
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
  OWNER: '公司經營者權限，可管理內容、表單、合約，但不能修改系統核心設定',
  STAFF: '一般員工權限，可處理表單和簽署合約，僅有查看權限',
};

/**
 * 獲取角色的中文名稱
 */
export const RoleNames: Record<Role, string> = {
  SUPER_ADMIN: '超級管理員',
  OWNER: '業主',
  STAFF: '業務人員',
};
