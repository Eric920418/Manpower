import { prisma } from "../prismaClient";
import type { Role } from "@prisma/client";

interface Context {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
  isIPAllowed?: boolean;
}

// 權限檢查
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new Error("未授權：請先登入");
  }
  return context.user;
};

// 格式化日期
const formatDate = (date: Date): string => date.toISOString();

export const dashboardResolvers = {
  Query: {
    dashboardData: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // 取得當月起始日
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 業務人員只能看到自己的數據
      const isStaff = user.role === "STAFF";
      const staffFilter = isStaff ? { invitedBy: user.id } : {};

      // 並行查詢所有統計數據
      const [
        // 用戶統計
        totalUsers,
        activeUsers,
        staffCount,
        ownerCount,

        // 人力需求統計
        totalManpowerRequests,
        pendingManpowerRequests,
        processingManpowerRequests,
        completedManpowerRequests,

        // 行政任務統計（只有 SUPER_ADMIN 能看完整數據）
        totalAdminTasks,
        pendingAdminTasks,
        processingAdminTasks,
        completedAdminTasks,
        overdueAdminTasks,

        // 本月統計
        monthlyNewRequests,
        monthlyCompletedRequests,
        monthlyNewTasks,
        monthlyCompletedTasks,

        // 最近活動
        recentActivities,

        // 最近人力需求
        recentManpowerRequests,

        // 最近行政任務
        recentAdminTasks,
      ] = await Promise.all([
        // 用戶統計
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: "STAFF" } }),
        prisma.user.count({ where: { role: "OWNER" } }),

        // 人力需求統計
        prisma.manpowerRequest.count({ where: staffFilter }),
        prisma.manpowerRequest.count({ where: { ...staffFilter, status: "pending" } }),
        prisma.manpowerRequest.count({ where: { ...staffFilter, status: "processing" } }),
        prisma.manpowerRequest.count({ where: { ...staffFilter, status: "completed" } }),

        // 行政任務統計
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count()
          : prisma.adminTask.count({ where: { OR: [{ applicantId: user.id }, { processorId: user.id }] } }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({ where: { status: "PENDING" } })
          : prisma.adminTask.count({ where: { status: "PENDING", OR: [{ applicantId: user.id }, { processorId: user.id }] } }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({ where: { status: "PROCESSING" } })
          : prisma.adminTask.count({ where: { status: "PROCESSING", OR: [{ applicantId: user.id }, { processorId: user.id }] } }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({ where: { status: "COMPLETED" } })
          : prisma.adminTask.count({ where: { status: "COMPLETED", OR: [{ applicantId: user.id }, { processorId: user.id }] } }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({
              where: {
                status: { in: ["PENDING", "PROCESSING"] },
                deadline: { lt: now },
              },
            })
          : Promise.resolve(0),

        // 本月統計
        prisma.manpowerRequest.count({
          where: {
            ...staffFilter,
            createdAt: { gte: monthStart },
          },
        }),
        prisma.manpowerRequest.count({
          where: {
            ...staffFilter,
            status: "completed",
            processedAt: { gte: monthStart },
          },
        }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({ where: { createdAt: { gte: monthStart } } })
          : prisma.adminTask.count({
              where: {
                createdAt: { gte: monthStart },
                OR: [{ applicantId: user.id }, { processorId: user.id }]
              }
            }),
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.count({
              where: {
                status: "COMPLETED",
                completedAt: { gte: monthStart }
              }
            })
          : prisma.adminTask.count({
              where: {
                status: "COMPLETED",
                completedAt: { gte: monthStart },
                OR: [{ applicantId: user.id }, { processorId: user.id }]
              }
            }),

        // 最近活動（最近 10 筆）
        prisma.activityLog.findMany({
          where: user.role === "SUPER_ADMIN" ? {} : { userId: user.id },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { name: true },
            },
          },
        }),

        // 最近人力需求（最近 5 筆）
        prisma.manpowerRequest.findMany({
          where: staffFilter,
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            requestNo: true,
            companyName: true,
            contactPerson: true,
            status: true,
            createdAt: true,
          },
        }),

        // 最近行政任務（最近 5 筆）
        user.role === "SUPER_ADMIN"
          ? prisma.adminTask.findMany({
              take: 5,
              orderBy: { createdAt: "desc" },
              include: {
                taskType: { select: { label: true } },
                applicant: { select: { name: true } },
              },
            })
          : prisma.adminTask.findMany({
              where: { OR: [{ applicantId: user.id }, { processorId: user.id }] },
              take: 5,
              orderBy: { createdAt: "desc" },
              include: {
                taskType: { select: { label: true } },
                applicant: { select: { name: true } },
              },
            }),
      ]);

      return {
        stats: {
          totalUsers,
          activeUsers,
          staffCount,
          ownerCount,
          totalManpowerRequests,
          pendingManpowerRequests,
          processingManpowerRequests,
          completedManpowerRequests,
          totalAdminTasks,
          pendingAdminTasks,
          processingAdminTasks,
          completedAdminTasks,
          overdueAdminTasks,
          monthlyNewRequests,
          monthlyCompletedRequests,
          monthlyNewTasks,
          monthlyCompletedTasks,
        },
        recentActivities: recentActivities.map((activity) => ({
          id: activity.id,
          userId: activity.userId,
          userName: activity.user?.name || "未知用戶",
          action: activity.action,
          entity: activity.entity,
          entityId: activity.entityId,
          details: activity.details,
          createdAt: formatDate(activity.createdAt),
        })),
        recentManpowerRequests: recentManpowerRequests.map((req) => ({
          id: req.id,
          requestNo: req.requestNo,
          companyName: req.companyName,
          contactPerson: req.contactPerson,
          status: req.status,
          createdAt: formatDate(req.createdAt),
        })),
        recentAdminTasks: recentAdminTasks.map((task) => ({
          id: task.id,
          taskNo: task.taskNo,
          title: task.title,
          status: task.status,
          taskTypeName: task.taskType?.label || "未知類型",
          applicantName: task.applicantName || task.applicant?.name || "未知",
          createdAt: formatDate(task.createdAt),
        })),
      };
    },
  },
};
