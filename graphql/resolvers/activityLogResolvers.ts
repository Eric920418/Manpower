import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// 認證檢查
interface Context {
  user?: {
    id: string;
    role: string;
    customPermissions?: CustomPermissions | null;
  };
}

// 檢查系統日誌權限（支援自訂權限）
const requireSystemLogsPermission = (context: Context) => {
  if (!context.user) {
    throw new Error("未授權：請先登入");
  }

  const hasPermission = hasPermissionWithCustom(
    context.user.role as Role,
    'system:logs',
    context.user.customPermissions
  );

  if (!hasPermission) {
    throw new Error("權限不足：需要「查看日誌」權限");
  }

  return context.user;
};

// 格式化日期
const formatDate = (date: Date) => date.toISOString();

// 格式化用戶
const formatUser = (user: { id: string; name: string | null; email: string; role: string }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const activityLogResolvers = {
  Query: {
    // 獲取活動日誌列表
    activityLogs: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        userId?: string;
        action?: string;
        entity?: string;
        startDate?: string;
        endDate?: string;
      },
      context: Context
    ) => {
      requireSystemLogsPermission(context);

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      // 構建查詢條件
      const where: {
        userId?: string;
        action?: string;
        entity?: string;
        createdAt?: { gte?: Date; lte?: Date };
      } = {};

      if (args.userId) where.userId = args.userId;
      if (args.action) where.action = args.action;
      if (args.entity) where.entity = args.entity;

      if (args.startDate || args.endDate) {
        where.createdAt = {};
        if (args.startDate) {
          where.createdAt.gte = new Date(args.startDate);
        }
        if (args.endDate) {
          // 設置為當天結束
          const endDate = new Date(args.endDate);
          endDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = endDate;
        }
      }

      const [items, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            user: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.activityLog.count({ where }),
      ]);

      return {
        items: items.map((log) => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          user: formatUser(log.user),
          createdAt: formatDate(log.createdAt),
        })),
        total,
        page,
        pageSize,
      };
    },

    // 獲取活動統計
    activityStats: async (_: unknown, __: unknown, context: Context) => {
      requireSystemLogsPermission(context);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalToday, totalThisWeek, totalThisMonth, byAction, byEntity] =
        await Promise.all([
          // 今日總數
          prisma.activityLog.count({
            where: { createdAt: { gte: todayStart } },
          }),
          // 本週總數
          prisma.activityLog.count({
            where: { createdAt: { gte: weekStart } },
          }),
          // 本月總數
          prisma.activityLog.count({
            where: { createdAt: { gte: monthStart } },
          }),
          // 按操作類型統計
          prisma.activityLog.groupBy({
            by: ["action"],
            _count: { action: true },
            orderBy: { _count: { action: "desc" } },
            take: 10,
          }),
          // 按實體類型統計
          prisma.activityLog.groupBy({
            by: ["entity"],
            _count: { entity: true },
            orderBy: { _count: { entity: "desc" } },
            take: 10,
          }),
        ]);

      return {
        totalToday,
        totalThisWeek,
        totalThisMonth,
        byAction: byAction.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
        byEntity: byEntity.map((item) => ({
          entity: item.entity,
          count: item._count.entity,
        })),
      };
    },
  },
};
