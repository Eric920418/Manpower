import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  hasPermission,
  canManageRole,
  PermissionEnum,
  AllPermissionDefinitions,
  getEffectivePermissions,
  type CustomPermissions,
  type Permission
} from '../../src/lib/permissions';
import type { DataLoaders } from '../dataloaders';
import { validateInvitationCode, assignInvitationCodeToUser } from '../../src/lib/invitationCode';
import { prisma } from '../prismaClient';

// 格式化自訂權限
const formatCustomPermissions = (customPermissions: unknown): { granted: string[]; denied: string[] } | null => {
  if (!customPermissions) return null;
  if (typeof customPermissions !== 'object') return null;

  const cp = customPermissions as Record<string, unknown>;
  return {
    granted: Array.isArray(cp.granted) ? cp.granted.filter((p): p is string => typeof p === 'string') : [],
    denied: Array.isArray(cp.denied) ? cp.denied.filter((p): p is string => typeof p === 'string') : [],
  };
};

interface Context {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
  loaders?: DataLoaders; // ✅ 添加 DataLoaders 支援
  isIPAllowed?: boolean;
}

interface UserFilterInput {
  search?: string;
  role?: Role;
  isActive?: boolean;
  department?: string;
}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  department?: string;
  phone?: string;
  isActive?: boolean;
}

interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  role?: Role;
  department?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
}

export const userResolvers = {
  Query: {
    /**
     * 獲取用戶列表（分頁）
     */
    users: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        filter?: UserFilterInput;
      },
      context: Context
    ) => {
      // 權限檢查
      // 開發環境下：如果 IP 在白名單內，暫時允許訪問
      if (!context.user) {
        if (process.env.NODE_ENV !== 'development' || !context.isIPAllowed) {
          throw new Error('未授權：請先登入');
        }
        // 開發環境且 IP 允許，繼續執行
      } else if (!hasPermission(context.user.role, PermissionEnum.USER_READ)) {
        throw new Error('沒有權限查看用戶列表');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 10;
      const skip = (page - 1) * pageSize;

      // 建立查詢條件
      const where: any = {};

      if (args.filter) {
        // 搜尋（email 或 name）
        if (args.filter.search) {
          where.OR = [
            { email: { contains: args.filter.search, mode: 'insensitive' } },
            { name: { contains: args.filter.search, mode: 'insensitive' } },
          ];
        }

        // 角色篩選
        if (args.filter.role) {
          where.role = args.filter.role;
        }

        // 狀態篩選
        if (typeof args.filter.isActive === 'boolean') {
          where.isActive = args.filter.isActive;
        }

        // 部門篩選
        if (args.filter.department) {
          where.department = args.filter.department;
        }
      }

      // 查詢總數
      const total = await prisma.user.count({ where });

      // 查詢用戶 - 優化：使用 select 只取需要的欄位，避免傳輸密碼和大型 payload
      const users = await prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          invitationCode: true,
          invitationCount: true,
          position: true,
          bio: true,
          specialties: true,
          lineId: true,
          isPublic: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 格式化用戶資料（包含自訂權限）
      const safeUsers = users.map(user => ({
        ...user,
        customPermissions: formatCustomPermissions(user.customPermissions),
      }));

      return {
        users: safeUsers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * 獲取單個用戶
     */
    user: async (_: unknown, args: { id: string }, context: Context) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_READ)) {
        throw new Error('沒有權限查看用戶資訊');
      }

      // 優化：使用 select 排除密碼欄位
      const user = await prisma.user.findUnique({
        where: { id: args.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          invitationCode: true,
          invitationCount: true,
          position: true,
          bio: true,
          specialties: true,
          lineId: true,
          isPublic: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('用戶不存在');
      }

      return {
        ...user,
        customPermissions: formatCustomPermissions(user.customPermissions),
      };
    },

    /**
     * 獲取當前登入用戶
     */
    me: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      // 優化：使用 select 排除密碼欄位
      const user = await prisma.user.findUnique({
        where: { id: context.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          invitationCode: true,
          invitationCount: true,
          position: true,
          bio: true,
          specialties: true,
          lineId: true,
          isPublic: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('用戶不存在');
      }

      return {
        ...user,
        customPermissions: formatCustomPermissions(user.customPermissions),
      };
    },

    /**
     * 驗證邀請碼
     */
    validateInvitationCode: async (
      _: unknown,
      args: { code: string }
    ) => {
      const result = await validateInvitationCode(args.code);
      return result;
    },

    /**
     * 獲取所有業務人員列表（公開 API，用於表單選擇介紹人）
     */
    staffList: async () => {
      const staffMembers = await prisma.user.findMany({
        where: {
          role: 'STAFF',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // 確保 name 不為 null，使用 email 的前綴作為備用
      return staffMembers.map(staff => ({
        id: staff.id,
        name: staff.name || '未命名業務',
      }));
    },

    /**
     * 獲取所有公開業務人員完整資訊（公開展示頁面用）
     * 包含 STAFF 和 OWNER 角色，且 isActive 和 isPublic 為 true
     */
    staffMembers: async () => {
      const members = await prisma.user.findMany({
        where: {
          role: { in: ['STAFF', 'OWNER'] },
          isActive: true,
          isPublic: true,
        },
        select: {
          id: true,
          name: true,
          position: true,
          avatar: true,
          phone: true,
          email: true,
          lineId: true,
          bio: true,
          specialties: true,
          department: true,
        },
        orderBy: [
          { role: 'asc' }, // OWNER 排在前面
          { name: 'asc' },
        ],
      });

      return members.map(member => ({
        id: member.id,
        name: member.name || '未命名業務',
        position: member.position,
        avatar: member.avatar,
        phone: member.phone,
        email: member.email,
        lineId: member.lineId,
        bio: member.bio,
        specialties: member.specialties,
        department: member.department,
      }));
    },

    /**
     * 獲取所有可用權限列表（僅 SUPER_ADMIN）
     */
    availablePermissions: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (context.user.role !== 'SUPER_ADMIN') {
        throw new Error('權限不足：僅超級管理員可查看');
      }

      return AllPermissionDefinitions;
    },

    /**
     * 獲取用戶的有效權限列表
     */
    userEffectivePermissions: async (
      _: unknown,
      args: { userId: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (context.user.role !== 'SUPER_ADMIN') {
        throw new Error('權限不足：僅超級管理員可查看');
      }

      const user = await prisma.user.findUnique({
        where: { id: args.userId },
        select: {
          role: true,
          customPermissions: true,
        },
      });

      if (!user) {
        throw new Error('用戶不存在');
      }

      const customPerms = formatCustomPermissions(user.customPermissions) as CustomPermissions | null;
      return getEffectivePermissions(user.role, customPerms);
    },
  },

  Mutation: {
    /**
     * 創建用戶
     */
    createUser: async (
      _: unknown,
      args: { input: CreateUserInput },
      context: Context
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_CREATE)) {
        throw new Error('沒有權限創建用戶');
      }

      // 檢查是否可以創建該角色的用戶
      if (!canManageRole(context.user.role, args.input.role)) {
        throw new Error('您無法創建此角色的用戶');
      }

      // 檢查 email 是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: args.input.email },
      });

      if (existingUser) {
        throw new Error('此 Email 已被使用');
      }

      // 加密密碼
      const hashedPassword = await bcrypt.hash(args.input.password, 10);

      // 創建用戶
      const user = await prisma.user.create({
        data: {
          email: args.input.email,
          name: args.input.name,
          password: hashedPassword,
          role: args.input.role,
          department: args.input.department,
          phone: args.input.phone,
          isActive: args.input.isActive !== undefined ? args.input.isActive : true,
        },
      });

      // 為非 SUPER_ADMIN 用戶生成邀請碼
      if (user.role !== 'SUPER_ADMIN') {
        await assignInvitationCodeToUser(user.id);
      }

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'create',
          entity: 'user',
          entityId: user.id,
          details: {
            targetEmail: user.email,
            targetRole: user.role,
          },
        },
      });

      // 重新查詢用戶以獲取邀請碼
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      // 移除密碼欄位
      const { password, ...safeUser } = updatedUser!;
      return safeUser;
    },

    /**
     * 更新用戶
     */
    updateUser: async (
      _: unknown,
      args: { id: string; input: UpdateUserInput },
      context: Context
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_UPDATE)) {
        throw new Error('沒有權限更新用戶');
      }

      // 查詢目標用戶
      const targetUser = await prisma.user.findUnique({
        where: { id: args.id },
      });

      if (!targetUser) {
        throw new Error('用戶不存在');
      }

      // 檢查是否可以管理該用戶
      if (!canManageRole(context.user.role, targetUser.role)) {
        throw new Error('您無法編輯此用戶');
      }

      // 如果要更改角色，檢查權限
      if (args.input.role && args.input.role !== targetUser.role) {
        if (!canManageRole(context.user.role, args.input.role)) {
          throw new Error('您無法將用戶設置為此角色');
        }
      }

      // 如果要更改 email，檢查是否重複
      if (args.input.email && args.input.email !== targetUser.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: args.input.email },
        });

        if (existingUser) {
          throw new Error('此 Email 已被使用');
        }
      }

      // 準備更新數據
      const updateData: any = { ...args.input };

      // 如果有密碼，加密
      if (args.input.password) {
        updateData.password = await bcrypt.hash(args.input.password, 10);
      }

      // 更新用戶
      const user = await prisma.user.update({
        where: { id: args.id },
        data: updateData,
      });

      // 記錄操作日誌（排除敏感資訊）
      const { password, ...safeChanges } = args.input;
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'update',
          entity: 'user',
          entityId: user.id,
          details: {
            targetEmail: user.email,
            changes: safeChanges, // ✅ 不記錄密碼
          },
        },
      });

      // 移除密碼欄位
      const { password: _pwd, ...safeUser } = user;
      return safeUser;
    },

    /**
     * 刪除用戶
     */
    deleteUser: async (_: unknown, args: { id: string }, context: Context) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_DELETE)) {
        throw new Error('沒有權限刪除用戶');
      }

      // 不能刪除自己
      if (args.id === context.user.id) {
        throw new Error('不能刪除自己的帳號');
      }

      // 查詢目標用戶
      const targetUser = await prisma.user.findUnique({
        where: { id: args.id },
      });

      if (!targetUser) {
        throw new Error('用戶不存在');
      }

      // 檢查是否可以刪除該用戶
      if (!canManageRole(context.user.role, targetUser.role)) {
        throw new Error('您無法刪除此用戶');
      }

      // 記錄操作日誌（在刪除前）
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'delete',
          entity: 'user',
          entityId: targetUser.id,
          details: {
            targetEmail: targetUser.email,
            targetRole: targetUser.role,
          },
        },
      });

      // 刪除用戶
      await prisma.user.delete({
        where: { id: args.id },
      });

      return true;
    },

    /**
     * 啟用/停用用戶
     */
    toggleUserStatus: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_UPDATE)) {
        throw new Error('沒有權限更改用戶狀態');
      }

      // 不能停用自己
      if (args.id === context.user.id) {
        throw new Error('不能停用自己的帳號');
      }

      // 查詢目標用戶
      const targetUser = await prisma.user.findUnique({
        where: { id: args.id },
      });

      if (!targetUser) {
        throw new Error('用戶不存在');
      }

      // 檢查是否可以管理該用戶
      if (!canManageRole(context.user.role, targetUser.role)) {
        throw new Error('您無法更改此用戶的狀態');
      }

      // 切換狀態
      const user = await prisma.user.update({
        where: { id: args.id },
        data: { isActive: !targetUser.isActive },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'toggle_status',
          entity: 'user',
          entityId: user.id,
          details: {
            targetEmail: user.email,
            newStatus: user.isActive,
          },
        },
      });

      // 移除密碼欄位
      const { password, ...safeUser } = user;
      return safeUser;
    },

    /**
     * 重置密碼
     */
    resetUserPassword: async (
      _: unknown,
      args: { id: string; newPassword: string },
      context: Context
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, PermissionEnum.USER_UPDATE)) {
        throw new Error('沒有權限重置密碼');
      }

      // 查詢目標用戶
      const targetUser = await prisma.user.findUnique({
        where: { id: args.id },
      });

      if (!targetUser) {
        throw new Error('用戶不存在');
      }

      // 檢查是否可以管理該用戶
      if (!canManageRole(context.user.role, targetUser.role)) {
        throw new Error('您無法重置此用戶的密碼');
      }

      // 加密新密碼
      const hashedPassword = await bcrypt.hash(args.newPassword, 10);

      // 更新密碼
      await prisma.user.update({
        where: { id: args.id },
        data: { password: hashedPassword },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'reset_password',
          entity: 'user',
          entityId: args.id,
          details: {
            targetEmail: targetUser.email,
          },
        },
      });

      return true;
    },

    /**
     * 更新用戶權限（僅 SUPER_ADMIN）
     */
    updateUserPermissions: async (
      _: unknown,
      args: {
        userId: string;
        input: {
          granted: string[];
          denied: string[];
        };
      },
      context: Context
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (context.user.role !== 'SUPER_ADMIN') {
        throw new Error('權限不足：僅超級管理員可管理用戶權限');
      }

      // 查詢目標用戶
      const targetUser = await prisma.user.findUnique({
        where: { id: args.userId },
      });

      if (!targetUser) {
        throw new Error('用戶不存在');
      }

      // 不能修改 SUPER_ADMIN 的權限
      if (targetUser.role === 'SUPER_ADMIN') {
        throw new Error('無法修改超級管理員的權限');
      }

      // 驗證權限代碼是否有效
      const allPermissionKeys = AllPermissionDefinitions.flatMap(cat =>
        cat.permissions.map(p => p.key)
      );

      const invalidGranted = args.input.granted.filter(p => !allPermissionKeys.includes(p as Permission));
      const invalidDenied = args.input.denied.filter(p => !allPermissionKeys.includes(p as Permission));

      if (invalidGranted.length > 0) {
        throw new Error(`無效的權限代碼：${invalidGranted.join(', ')}`);
      }
      if (invalidDenied.length > 0) {
        throw new Error(`無效的權限代碼：${invalidDenied.join(', ')}`);
      }

      // 更新用戶權限
      const customPermissions = {
        granted: args.input.granted,
        denied: args.input.denied,
      };

      const user = await prisma.user.update({
        where: { id: args.userId },
        data: {
          customPermissions: customPermissions,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          phone: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          invitationCode: true,
          invitationCount: true,
          position: true,
          bio: true,
          specialties: true,
          lineId: true,
          isPublic: true,
          customPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'update_permissions',
          entity: 'user',
          entityId: args.userId,
          details: {
            targetEmail: targetUser.email,
            targetRole: targetUser.role,
            granted: args.input.granted,
            denied: args.input.denied,
          },
        },
      });

      return {
        ...user,
        customPermissions: formatCustomPermissions(user.customPermissions),
      };
    },
  },
};
