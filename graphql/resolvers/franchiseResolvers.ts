import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// Context 類型
interface Context {
  user?: {
    id: string;
    role: Role;
    customPermissions?: CustomPermissions | null;
  };
}

// 權限檢查 - 僅 SUPER_ADMIN 可管理加盟店
function checkSuperAdmin(context: Context): void {
  if (!context.user) {
    throw new Error("未登入");
  }
  if (context.user.role !== "SUPER_ADMIN") {
    throw new Error("權限不足：僅超級管理員可管理加盟店");
  }
}

// 格式化加盟店資料
function formatFranchise(franchise: any, userCount: number = 0) {
  return {
    ...franchise,
    userCount,
    createdAt: franchise.createdAt.toISOString(),
    updatedAt: franchise.updatedAt.toISOString(),
  };
}

export const franchiseResolvers = {
  Query: {
    // 獲取加盟店列表（分頁）
    franchises: async (
      _: any,
      args: {
        page?: number;
        pageSize?: number;
        filter?: {
          search?: string;
          isActive?: boolean;
        };
      },
      context: Context
    ) => {
      checkSuperAdmin(context);

      const page = args.page || 1;
      const pageSize = args.pageSize || 10;
      const skip = (page - 1) * pageSize;

      // 建立查詢條件
      const where: any = {};

      if (args.filter) {
        if (args.filter.search) {
          where.OR = [
            { name: { contains: args.filter.search, mode: "insensitive" } },
            { code: { contains: args.filter.search, mode: "insensitive" } },
            { address: { contains: args.filter.search, mode: "insensitive" } },
          ];
        }

        if (typeof args.filter.isActive === "boolean") {
          where.isActive = args.filter.isActive;
        }
      }

      // 查詢總數
      const total = await prisma.franchise.count({ where });

      // 查詢加盟店（包含用戶數量）
      const franchises = await prisma.franchise.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      return {
        franchises: franchises.map((f) =>
          formatFranchise(f, f._count.users)
        ),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    // 獲取單個加盟店
    franchise: async (_: any, args: { id: number }, context: Context) => {
      checkSuperAdmin(context);

      const franchise = await prisma.franchise.findUnique({
        where: { id: args.id },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      if (!franchise) {
        throw new Error("找不到該加盟店");
      }

      return formatFranchise(franchise, franchise._count.users);
    },

    // 獲取加盟店選項列表（用於下拉選單，需要登入但不需要 SUPER_ADMIN）
    franchiseOptions: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error("未登入");
      }

      const franchises = await prisma.franchise.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: "asc" },
      });

      return franchises;
    },
  },

  Mutation: {
    // 創建加盟店
    createFranchise: async (
      _: any,
      args: {
        input: {
          name: string;
          code: string;
          address?: string;
          phone?: string;
          email?: string;
          description?: string;
          isActive?: boolean;
        };
      },
      context: Context
    ) => {
      checkSuperAdmin(context);

      // 檢查代碼是否已存在
      const existing = await prisma.franchise.findUnique({
        where: { code: args.input.code },
      });

      if (existing) {
        throw new Error("加盟店代碼已存在");
      }

      const franchise = await prisma.franchise.create({
        data: {
          name: args.input.name,
          code: args.input.code,
          address: args.input.address || null,
          phone: args.input.phone || null,
          email: args.input.email || null,
          description: args.input.description || null,
          isActive: args.input.isActive !== undefined ? args.input.isActive : true,
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user!.id,
          action: "create",
          entity: "franchise",
          entityId: franchise.id.toString(),
          details: {
            name: franchise.name,
            code: franchise.code,
          },
        },
      });

      return formatFranchise(franchise, 0);
    },

    // 更新加盟店
    updateFranchise: async (
      _: any,
      args: {
        id: number;
        input: {
          name?: string;
          code?: string;
          address?: string;
          phone?: string;
          email?: string;
          description?: string;
          isActive?: boolean;
        };
      },
      context: Context
    ) => {
      checkSuperAdmin(context);

      // 檢查加盟店是否存在
      const existing = await prisma.franchise.findUnique({
        where: { id: args.id },
      });

      if (!existing) {
        throw new Error("找不到該加盟店");
      }

      // 如果要更改代碼，檢查是否重複
      if (args.input.code && args.input.code !== existing.code) {
        const codeExists = await prisma.franchise.findUnique({
          where: { code: args.input.code },
        });

        if (codeExists) {
          throw new Error("加盟店代碼已存在");
        }
      }

      const franchise = await prisma.franchise.update({
        where: { id: args.id },
        data: args.input,
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user!.id,
          action: "update",
          entity: "franchise",
          entityId: franchise.id.toString(),
          details: {
            changes: args.input,
          },
        },
      });

      return formatFranchise(franchise, franchise._count.users);
    },

    // 刪除加盟店
    deleteFranchise: async (
      _: any,
      args: { id: number },
      context: Context
    ) => {
      checkSuperAdmin(context);

      // 檢查是否有用戶關聯
      const franchise = await prisma.franchise.findUnique({
        where: { id: args.id },
        include: {
          _count: {
            select: { users: true, manpowerRequests: true },
          },
        },
      });

      if (!franchise) {
        throw new Error("找不到該加盟店");
      }

      if (franchise._count.users > 0) {
        throw new Error(
          `無法刪除：該加盟店還有 ${franchise._count.users} 個用戶關聯`
        );
      }

      if (franchise._count.manpowerRequests > 0) {
        throw new Error(
          `無法刪除：該加盟店還有 ${franchise._count.manpowerRequests} 筆人力需求關聯`
        );
      }

      // 記錄活動日誌（刪除前）
      await prisma.activityLog.create({
        data: {
          userId: context.user!.id,
          action: "delete",
          entity: "franchise",
          entityId: franchise.id.toString(),
          details: {
            name: franchise.name,
            code: franchise.code,
            snapshot: franchise,
          },
        },
      });

      await prisma.franchise.delete({
        where: { id: args.id },
      });

      return true;
    },

    // 切換加盟店狀態
    toggleFranchiseStatus: async (
      _: any,
      args: { id: number },
      context: Context
    ) => {
      checkSuperAdmin(context);

      const existing = await prisma.franchise.findUnique({
        where: { id: args.id },
      });

      if (!existing) {
        throw new Error("找不到該加盟店");
      }

      const franchise = await prisma.franchise.update({
        where: { id: args.id },
        data: { isActive: !existing.isActive },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user!.id,
          action: "toggle_status",
          entity: "franchise",
          entityId: franchise.id.toString(),
          details: {
            name: franchise.name,
            newStatus: franchise.isActive,
          },
        },
      });

      return formatFranchise(franchise, franchise._count.users);
    },
  },
};
