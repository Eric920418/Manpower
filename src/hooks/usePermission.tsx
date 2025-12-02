/**
 * 權限檢查 Hook
 * 用於前端組件的權限控制
 * 支援角色權限 + 自定義權限（granted/denied）
 */

import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import {
  Permission,
  hasPermissionWithCustom,
  canManageRole,
  CustomPermissions,
} from '@/lib/permissions';

export function usePermission() {
  const { data: session } = useSession();
  const user = session?.user as {
    role?: Role;
    customPermissions?: CustomPermissions | null;
  } | undefined;

  const userRole = user?.role;
  const customPermissions = user?.customPermissions;

  return {
    /**
     * 檢查是否擁有特定權限
     * 考慮角色權限 + 自定義權限（granted/denied）
     */
    can: (permission: Permission): boolean => {
      if (!userRole) return false;
      return hasPermissionWithCustom(userRole, permission, customPermissions);
    },

    /**
     * 檢查是否擁有任一權限
     */
    canAny: (permissions: Permission[]): boolean => {
      if (!userRole) return false;
      return permissions.some((p) => hasPermissionWithCustom(userRole, p, customPermissions));
    },

    /**
     * 檢查是否擁有所有權限
     */
    canAll: (permissions: Permission[]): boolean => {
      if (!userRole) return false;
      return permissions.every((p) => hasPermissionWithCustom(userRole, p, customPermissions));
    },

    /**
     * 檢查是否可以管理特定角色的用戶
     */
    canManage: (targetRole: Role): boolean => {
      if (!userRole) return false;
      return canManageRole(userRole, targetRole);
    },

    /**
     * 檢查是否為超級管理員
     */
    isSuperAdmin: (): boolean => {
      return userRole === Role.SUPER_ADMIN;
    },

    /**
     * 檢查是否為管理員
     */
    isAdmin: (): boolean => {
      return userRole === Role.ADMIN;
    },

    /**
     * 檢查是否為管理員或以上（ADMIN 或 SUPER_ADMIN）
     */
    isAdminOrAbove: (): boolean => {
      return userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;
    },

    /**
     * 檢查是否為業主
     */
    isOwner: (): boolean => {
      return userRole === Role.OWNER;
    },

    /**
     * 檢查是否為業務人員
     */
    isStaff: (): boolean => {
      return userRole === Role.STAFF;
    },

    /**
     * 獲取當前用戶角色
     */
    getRole: (): Role | undefined => {
      return userRole;
    },

    /**
     * 獲取當前用戶的自定義權限
     */
    getCustomPermissions: (): CustomPermissions | null | undefined => {
      return customPermissions;
    },
  };
}

/**
 * 權限守衛組件
 * 用於條件式渲染需要特定權限的內容
 */
interface PermissionGuardProps {
  permission: Permission | Permission[];
  requireAll?: boolean; // 是否需要所有權限（預設為 false）
  fallback?: React.ReactNode; // 無權限時顯示的內容
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, canAny, canAll } = usePermission();

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? canAll(permission)
      : canAny(permission)
    : can(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 角色守衛組件
 * 用於條件式渲染特定角色才能看到的內容
 */
interface RoleGuardProps {
  roles: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { getRole } = usePermission();
  const userRole = getRole();

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const hasAccess = userRole && allowedRoles.includes(userRole);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
