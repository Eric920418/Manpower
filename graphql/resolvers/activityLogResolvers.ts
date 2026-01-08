import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role, Prisma, ApprovalRoute, AdminTaskStatus, AssignmentRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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

// 實體類型中文對照
const getEntityLabel = (entity: string): string => {
  const labels: Record<string, string> = {
    user: "用戶",
    admin_task: "行政任務",
    task_type: "任務類型",
    navigation: "導航選單",
    manpower_request: "人力需求",
    task_assignment: "任務分配",
  };
  return labels[entity] || entity;
};

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
        search?: string;
      },
      context: Context
    ) => {
      requireSystemLogsPermission(context);

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 99999);
      const skip = (page - 1) * pageSize;

      // 構建查詢條件
      const where: Prisma.ActivityLogWhereInput = {};

      if (args.userId) where.userId = args.userId;
      if (args.action) where.action = args.action;
      if (args.entity) where.entity = args.entity;

      if (args.startDate || args.endDate) {
        where.createdAt = {};
        if (args.startDate) {
          (where.createdAt as Prisma.DateTimeFilter).gte = new Date(args.startDate);
        }
        if (args.endDate) {
          // 設置為當天結束
          const endDate = new Date(args.endDate);
          endDate.setHours(23, 59, 59, 999);
          (where.createdAt as Prisma.DateTimeFilter).lte = endDate;
        }
      }

      // 搜尋任務編號或任務名稱（在 details JSON 中）
      if (args.search) {
        where.OR = [
          {
            details: {
              path: ["taskNo"],
              string_contains: args.search,
            },
          },
          {
            details: {
              path: ["title"],
              string_contains: args.search,
            },
          },
        ];
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
          // 按操作類型統計（取全部）
          prisma.activityLog.groupBy({
            by: ["action"],
            _count: { action: true },
            orderBy: { _count: { action: "desc" } },
          }),
          // 按實體類型統計（取全部）
          prisma.activityLog.groupBy({
            by: ["entity"],
            _count: { entity: true },
            orderBy: { _count: { entity: "desc" } },
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

  Mutation: {
    // 復原刪除的項目
    restoreDeletedItem: async (
      _: unknown,
      args: { logId: number },
      context: Context
    ) => {
      // 只有超級管理員可以復原
      if (!context.user) {
        throw new Error("未授權：請先登入");
      }

      if (context.user.role !== "SUPER_ADMIN") {
        throw new Error("權限不足：只有超級管理員可以復原刪除的項目");
      }

      // 獲取活動日誌
      const log = await prisma.activityLog.findUnique({
        where: { id: args.logId },
      });

      if (!log) {
        return { success: false, message: "找不到該活動日誌", restoredId: null };
      }

      if (log.action !== "delete") {
        return { success: false, message: "此日誌不是刪除操作，無法復原", restoredId: null };
      }

      const details = log.details as Record<string, unknown> | null;
      if (!details?.snapshot) {
        return { success: false, message: "此刪除日誌沒有包含資料快照，無法復原", restoredId: null };
      }

      const snapshot = details.snapshot as Record<string, unknown>;

      try {
        let restoredId: string | null = null;

        switch (log.entity) {
          case "admin_task": {
            // 檢查任務編號是否已存在，如果已存在則生成新編號
            let taskNo = snapshot.taskNo as string;
            const existingTask = await prisma.adminTask.findUnique({
              where: { taskNo },
            });

            if (existingTask) {
              // 生成新的任務編號
              const today = new Date();
              const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
              const prefix = `AT-${dateStr}-`;

              const lastTask = await prisma.adminTask.findFirst({
                where: { taskNo: { startsWith: prefix } },
                orderBy: { taskNo: "desc" },
              });

              let nextNum = 1;
              if (lastTask) {
                const lastNum = parseInt(lastTask.taskNo.slice(-4), 10);
                nextNum = lastNum + 1;
              }
              taskNo = `${prefix}${nextNum.toString().padStart(4, "0")}`;
            }

            // 復原行政任務
            const restoredTask = await prisma.adminTask.create({
              data: {
                taskNo,
                taskTypeId: snapshot.taskTypeId as number,
                title: snapshot.title as string,
                parentTaskId: snapshot.parentTaskId as number | null,
                groupId: snapshot.groupId as string | null,
                applicantId: snapshot.applicantId as string,
                applicantName: snapshot.applicantName as string | null,
                processorId: snapshot.processorId as string | null,
                processorName: snapshot.processorName as string | null,
                approverId: snapshot.approverId as string | null,
                applicationDate: snapshot.applicationDate ? new Date(snapshot.applicationDate as string) : new Date(),
                deadline: snapshot.deadline ? new Date(snapshot.deadline as string) : null,
                receivedAt: snapshot.receivedAt ? new Date(snapshot.receivedAt as string) : null,
                completedAt: snapshot.completedAt ? new Date(snapshot.completedAt as string) : null,
                reviewedAt: snapshot.reviewedAt ? new Date(snapshot.reviewedAt as string) : null,
                reviewedBy: snapshot.reviewedBy as string | null,
                status: snapshot.status as AdminTaskStatus,
                approvalRoute: snapshot.approvalRoute as ApprovalRoute,
                approvalMark: snapshot.approvalMark as string | null,
                payload: snapshot.payload as Prisma.InputJsonValue || {},
                notes: snapshot.notes as string | null,
                remarks: snapshot.remarks as string | null,
                remarksHistory: snapshot.remarksHistory as Prisma.InputJsonValue || [],
              },
            });
            restoredId = restoredTask.id.toString();

            // 記錄復原操作
            const originalTaskNo = snapshot.taskNo as string;
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "admin_task",
                entityId: restoredId,
                details: {
                  taskNo: restoredTask.taskNo,
                  title: restoredTask.title,
                  originalLogId: args.logId,
                  ...(originalTaskNo !== restoredTask.taskNo && { originalTaskNo }),
                },
              },
            });

            // 回傳成功訊息（包含新編號提示）
            const message = originalTaskNo !== restoredTask.taskNo
              ? `任務已復原，原編號 ${originalTaskNo} 已存在，已分配新編號 ${restoredTask.taskNo}`
              : `任務 ${restoredTask.taskNo} 已成功復原`;

            return { success: true, message, restoredId };
          }

          case "user": {
            // 檢查 email 是否已存在
            const existingUser = await prisma.user.findUnique({
              where: { email: snapshot.email as string },
            });
            if (existingUser) {
              return { success: false, message: `信箱 ${snapshot.email} 已存在，無法復原`, restoredId: null };
            }

            // 復原用戶（需要生成新密碼）
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const restoredUser = await prisma.user.create({
              data: {
                email: snapshot.email as string,
                password: hashedPassword,
                name: snapshot.name as string | null,
                role: snapshot.role as Role,
                department: snapshot.department as string | null,
                phone: snapshot.phone as string | null,
                isActive: false, // 復原後預設為停用，需要管理員重新啟用並重置密碼
                avatar: snapshot.avatar as string | null,
                invitationCode: snapshot.invitationCode as string | null,
              },
            });
            restoredId = restoredUser.id;

            // 記錄復原操作
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "user",
                entityId: restoredId,
                details: {
                  email: restoredUser.email,
                  name: restoredUser.name,
                  role: restoredUser.role,
                  originalLogId: args.logId,
                  note: "帳號已復原但處於停用狀態，請重新啟用並重置密碼",
                },
              },
            });
            break;
          }

          case "navigation": {
            // 復原導航項目
            const restoredNav = await prisma.navigation.create({
              data: {
                label: snapshot.label as string,
                url: snapshot.url as string,
                order: snapshot.order as number || 0,
                isActive: snapshot.isActive as boolean ?? true,
                parentId: snapshot.parentId as number | null,
                icon: snapshot.icon as string | null,
                target: (snapshot.target as string) || undefined,
              },
            });
            restoredId = restoredNav.id.toString();

            // 記錄復原操作
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "navigation",
                entityId: restoredId,
                details: {
                  label: restoredNav.label,
                  url: restoredNav.url,
                  originalLogId: args.logId,
                },
              },
            });
            break;
          }

          case "task_type": {
            // 檢查 code 是否已存在
            const existingTaskType = await prisma.taskType.findUnique({
              where: { code: snapshot.code as string },
            });
            if (existingTaskType) {
              // 如果是軟刪除的（isActive: false），則重新啟用
              if (!existingTaskType.isActive) {
                await prisma.taskType.update({
                  where: { id: existingTaskType.id },
                  data: { isActive: true },
                });
                restoredId = existingTaskType.id.toString();
              } else {
                return { success: false, message: `任務類型代碼 ${snapshot.code} 已存在，無法復原`, restoredId: null };
              }
            } else {
              // 完全復原
              const restoredTaskType = await prisma.taskType.create({
                data: {
                  code: snapshot.code as string,
                  label: snapshot.label as string,
                  description: snapshot.description as string | null,
                  order: snapshot.order as number || 0,
                  isActive: true,
                  questions: snapshot.questions as Prisma.InputJsonValue || [],
                  positionX: snapshot.positionX as number | null,
                  positionY: snapshot.positionY as number | null,
                },
              });
              restoredId = restoredTaskType.id.toString();
            }

            // 記錄復原操作
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "task_type",
                entityId: restoredId,
                details: {
                  code: String(snapshot.code),
                  label: String(snapshot.label),
                  originalLogId: args.logId,
                },
              },
            });
            break;
          }

          case "task_assignment": {
            // 檢查任務是否還存在
            const task = await prisma.adminTask.findUnique({
              where: { id: snapshot.taskId as number },
            });
            if (!task) {
              return { success: false, message: "關聯的任務已不存在，無法復原分配", restoredId: null };
            }

            // 檢查用戶是否還存在
            const user = await prisma.user.findUnique({
              where: { id: snapshot.userId as string },
            });
            if (!user) {
              return { success: false, message: "關聯的用戶已不存在，無法復原分配", restoredId: null };
            }

            // 復原任務分配
            const restoredAssignment = await prisma.adminTaskAssignment.create({
              data: {
                taskId: snapshot.taskId as number,
                userId: snapshot.userId as string,
                role: snapshot.role as AssignmentRole,
                notes: snapshot.notes as string | null,
                assignedBy: snapshot.assignedBy as string | null,
              },
            });
            restoredId = restoredAssignment.id.toString();

            // 記錄復原操作
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "task_assignment",
                entityId: restoredId,
                details: {
                  taskId: restoredAssignment.taskId,
                  userId: restoredAssignment.userId,
                  originalLogId: args.logId,
                },
              },
            });
            break;
          }

          case "manpower_request": {
            // 復原人力需求
            const restoredRequest = await prisma.manpowerRequest.create({
              data: {
                requestNo: snapshot.requestNo as string,
                selectedResumeIds: snapshot.selectedResumeIds as Prisma.InputJsonValue || [],
                companyName: snapshot.companyName as string | null,
                contactPerson: snapshot.contactPerson as string,
                contactPhone: snapshot.contactPhone as string,
                contactEmail: snapshot.contactEmail as string | null,
                lineId: snapshot.lineId as string | null,
                qualifications: (snapshot.qualifications as Prisma.InputJsonValue) || undefined,
                positionTitle: snapshot.positionTitle as string | null,
                jobDescription: snapshot.jobDescription as string | null,
                quantity: (snapshot.quantity as number) || 1,
                salaryRange: snapshot.salaryRange as string | null,
                expectedStartDate: snapshot.expectedStartDate ? new Date(snapshot.expectedStartDate as string) : null,
                workLocation: snapshot.workLocation as string | null,
                additionalRequirements: snapshot.additionalRequirements as string | null,
                status: (snapshot.status as string) || "pending",
                invitationCode: snapshot.invitationCode as string | null,
                invitedBy: snapshot.invitedBy as string | null,
                notes: snapshot.notes as string | null,
              },
            });
            restoredId = restoredRequest.id.toString();

            // 記錄復原操作
            await prisma.activityLog.create({
              data: {
                userId: context.user.id,
                action: "restore",
                entity: "manpower_request",
                entityId: restoredId,
                details: {
                  requestNo: restoredRequest.requestNo,
                  contactPerson: restoredRequest.contactPerson,
                  originalLogId: args.logId,
                },
              },
            });
            break;
          }

          default:
            return { success: false, message: `不支援復原 ${log.entity} 類型的項目`, restoredId: null };
        }

        return {
          success: true,
          message: `已成功復原${getEntityLabel(log.entity)}`,
          restoredId,
        };
      } catch (error) {
        console.error("復原失敗:", error);
        return {
          success: false,
          message: `復原失敗：${error instanceof Error ? error.message : "未知錯誤"}`,
          restoredId: null,
        };
      }
    },
  },
};
