import { prisma } from "../prismaClient";
import type { Role, AssignmentRole } from "@prisma/client";
import { AdminTaskStatus } from "@prisma/client";
import { hasPermissionWithCustom, type CustomPermissions, type Permission } from "@/lib/permissions";

// Context 類型
interface Context {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
    customPermissions?: CustomPermissions | null;
  };
}

// 權限檢查
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new Error("未授權：請先登入");
  }
  return context.user;
};

// 檢查用戶是否擁有特定權限（支援自訂權限）
const requirePermission = (context: Context, permission: Permission) => {
  const user = requireAuth(context);
  const hasPermission = hasPermissionWithCustom(
    user.role as Role,
    permission,
    user.customPermissions
  );
  if (!hasPermission) {
    throw new Error(`權限不足：需要案件分配管理權限`);
  }
  return user;
};

// 格式化用戶資訊
const formatUser = (user: { id: string; name: string | null; email: string; role: string } | null) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

// 格式化日期
const formatDate = (date: Date | null | undefined) => {
  return date?.toISOString() ?? null;
};

// 格式化全局分配
const formatDefaultAssignment = (assignment: {
  id: number;
  taskTypeId: number;
  userId: string;
  role: AssignmentRole;
  createdAt: Date;
  createdBy: string | null;
  taskType?: { id: number; code: string; label: string } | null;
  user?: { id: string; name: string | null; email: string; role: string } | null;
  creator?: { id: string; name: string | null; email: string; role: string } | null;
}) => ({
  id: assignment.id,
  taskTypeId: assignment.taskTypeId,
  userId: assignment.userId,
  role: assignment.role,
  createdAt: formatDate(assignment.createdAt),
  createdBy: assignment.createdBy,
  taskType: assignment.taskType ? {
    id: assignment.taskType.id,
    code: assignment.taskType.code,
    label: assignment.taskType.label,
  } : null,
  user: formatUser(assignment.user ?? null),
  creator: formatUser(assignment.creator ?? null),
});

// Include 設定
const defaultAssignmentInclude = {
  taskType: {
    select: { id: true, code: true, label: true },
  },
  user: {
    select: { id: true, name: true, email: true, role: true },
  },
  creator: {
    select: { id: true, name: true, email: true, role: true },
  },
};

export const taskTypeDefaultAssignmentResolvers = {
  Query: {
    // 獲取所有全局分配設定
    taskTypeDefaultAssignments: async (_: unknown, __: unknown, context: Context) => {
      requirePermission(context, "task_assignment:read");

      const assignments = await prisma.taskTypeDefaultAssignment.findMany({
        include: defaultAssignmentInclude,
        orderBy: { taskTypeId: "asc" },
      });

      return assignments.map(formatDefaultAssignment);
    },

    // 獲取特定類型的全局分配
    taskTypeDefaultAssignmentsByType: async (
      _: unknown,
      args: { taskTypeId: number },
      context: Context
    ) => {
      requirePermission(context, "task_assignment:read");

      const assignments = await prisma.taskTypeDefaultAssignment.findMany({
        where: { taskTypeId: args.taskTypeId },
        include: defaultAssignmentInclude,
      });

      return assignments.map(formatDefaultAssignment);
    },

    // 獲取所有類型的分配摘要
    allTaskTypeAssignmentSummaries: async (_: unknown, __: unknown, context: Context) => {
      requirePermission(context, "task_assignment:read");

      // 獲取所有啟用的任務類型
      const taskTypes = await prisma.taskType.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      // 獲取所有全局分配
      const allAssignments = await prisma.taskTypeDefaultAssignment.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // 組合摘要資料
      const summaries = taskTypes.map((taskType) => {
        const typeAssignments = allAssignments.filter((a) => a.taskTypeId === taskType.id);

        // 分別獲取負責人和複審人
        const handlers = typeAssignments
          .filter((a) => a.role === "HANDLER")
          .map((a) => formatUser(a.user))
          .filter((u) => u !== null);

        const reviewers = typeAssignments
          .filter((a) => a.role === "REVIEWER")
          .map((a) => formatUser(a.user))
          .filter((u) => u !== null);

        return {
          taskType: {
            id: taskType.id,
            code: taskType.code,
            label: taskType.label,
          },
          handlers,
          reviewers,
          assignments: typeAssignments.map((a) => ({
            id: a.id,
            taskTypeId: a.taskTypeId,
            userId: a.userId,
            role: a.role,
            createdAt: formatDate(a.createdAt),
            createdBy: a.createdBy,
          })),
        };
      });

      return summaries;
    },
  },

  Mutation: {
    // 新增全局分配
    addTaskTypeDefaultAssignment: async (
      _: unknown,
      args: {
        input: {
          taskTypeId: number;
          userId: string;
          role: AssignmentRole;
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務類型存在
      const taskType = await prisma.taskType.findUnique({
        where: { id: args.input.taskTypeId },
      });
      if (!taskType) {
        throw new Error("任務類型不存在");
      }

      // 確認用戶存在且為管理員
      const targetUser = await prisma.user.findUnique({
        where: { id: args.input.userId },
      });
      if (!targetUser) {
        throw new Error("用戶不存在");
      }
      if (targetUser.role !== "ADMIN") {
        throw new Error("只能分配給管理員角色的用戶");
      }

      // 檢查是否已存在相同分配
      const existing = await prisma.taskTypeDefaultAssignment.findFirst({
        where: {
          taskTypeId: args.input.taskTypeId,
          userId: args.input.userId,
          role: args.input.role,
        },
      });
      if (existing) {
        throw new Error("該分配已存在");
      }

      const assignment = await prisma.taskTypeDefaultAssignment.create({
        data: {
          taskTypeId: args.input.taskTypeId,
          userId: args.input.userId,
          role: args.input.role,
          createdBy: currentUser.id,
        },
        include: defaultAssignmentInclude,
      });

      // 實時同步：將新分配套用到該類型所有現有任務（排除已駁回和已複審）
      const existingTasks = await prisma.adminTask.findMany({
        where: {
          taskTypeId: args.input.taskTypeId,
          status: {
            notIn: [AdminTaskStatus.REJECTED, AdminTaskStatus.REVIEWED],
          },
        },
        select: { id: true },
      });

      let syncedCount = 0;
      for (const task of existingTasks) {
        // 檢查是否已存在相同分配
        const existingAssignment = await prisma.adminTaskAssignment.findFirst({
          where: {
            taskId: task.id,
            userId: args.input.userId,
            role: args.input.role,
          },
        });

        if (!existingAssignment) {
          await prisma.adminTaskAssignment.create({
            data: {
              taskId: task.id,
              userId: args.input.userId,
              role: args.input.role,
              assignedBy: currentUser.id,
              notes: "依全局分配設定自動同步",
            },
          });
          syncedCount++;
        }
      }

      // 記錄活動日誌
      if (syncedCount > 0) {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: "sync_global_assignment_add",
            entity: "task_assignment",
            entityId: assignment.id.toString(),
            details: {
              taskTypeId: args.input.taskTypeId,
              userId: args.input.userId,
              role: args.input.role,
              syncedTaskCount: syncedCount,
            },
          },
        });
      }

      return formatDefaultAssignment(assignment);
    },

    // 移除全局分配
    removeTaskTypeDefaultAssignment: async (
      _: unknown,
      args: { id: number },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      const assignment = await prisma.taskTypeDefaultAssignment.findUnique({
        where: { id: args.id },
      });
      if (!assignment) {
        throw new Error("分配不存在");
      }

      // 實時同步：從該類型所有現有任務中移除對應分配（排除已駁回和已複審）
      const deleteResult = await prisma.adminTaskAssignment.deleteMany({
        where: {
          userId: assignment.userId,
          role: assignment.role,
          task: {
            taskTypeId: assignment.taskTypeId,
            status: {
              notIn: [AdminTaskStatus.REJECTED, AdminTaskStatus.REVIEWED],
            },
          },
        },
      });

      // 刪除全局分配設定
      await prisma.taskTypeDefaultAssignment.delete({
        where: { id: args.id },
      });

      // 記錄活動日誌
      if (deleteResult.count > 0) {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: "sync_global_assignment_remove",
            entity: "task_assignment",
            entityId: args.id.toString(),
            details: {
              taskTypeId: assignment.taskTypeId,
              userId: assignment.userId,
              role: assignment.role,
              removedFromTaskCount: deleteResult.count,
            },
          },
        });
      }

      return true;
    },

    // 將全局分配套用到現有案件
    applyGlobalAssignmentsToExistingTasks: async (
      _: unknown,
      args: { taskTypeId?: number },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 獲取要套用的任務類型
      const taskTypeFilter = args.taskTypeId ? { id: args.taskTypeId } : { isActive: true };
      const taskTypes = await prisma.taskType.findMany({
        where: taskTypeFilter,
        select: { id: true, label: true },
      });

      if (taskTypes.length === 0) {
        throw new Error("找不到任務類型");
      }

      // 獲取所有全局分配設定
      const defaultAssignments = await prisma.taskTypeDefaultAssignment.findMany({
        where: args.taskTypeId ? { taskTypeId: args.taskTypeId } : {},
      });

      if (defaultAssignments.length === 0) {
        return {
          success: true,
          message: "沒有全局分配設定可套用",
          updatedTaskCount: 0,
          newAssignmentCount: 0,
        };
      }

      // 按任務類型分組
      const assignmentsByType = new Map<number, typeof defaultAssignments>();
      for (const da of defaultAssignments) {
        if (!assignmentsByType.has(da.taskTypeId)) {
          assignmentsByType.set(da.taskTypeId, []);
        }
        assignmentsByType.get(da.taskTypeId)!.push(da);
      }

      let updatedTaskCount = 0;
      let newAssignmentCount = 0;

      // 為每個任務類型處理現有案件
      for (const [taskTypeId, typeAssignments] of assignmentsByType) {
        // 找到該類型所有未完成的案件
        const tasks = await prisma.adminTask.findMany({
          where: {
            taskTypeId,
            status: {
              notIn: [AdminTaskStatus.COMPLETED, AdminTaskStatus.REJECTED],
            },
          },
          select: { id: true },
        });

        for (const task of tasks) {
          // 檢查並添加缺少的分配
          for (const da of typeAssignments) {
            const existingAssignment = await prisma.adminTaskAssignment.findFirst({
              where: {
                taskId: task.id,
                userId: da.userId,
                role: da.role,
              },
            });

            if (!existingAssignment) {
              await prisma.adminTaskAssignment.create({
                data: {
                  taskId: task.id,
                  userId: da.userId,
                  role: da.role,
                  assignedBy: currentUser.id,
                  notes: "依全局分配設定補充分配",
                },
              });
              newAssignmentCount++;
            }
          }
          updatedTaskCount++;
        }
      }

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "apply_global_assignments",
          entity: "task_assignment",
          entityId: args.taskTypeId?.toString() || "all",
          details: {
            taskTypeId: args.taskTypeId || "all",
            updatedTaskCount,
            newAssignmentCount,
          },
        },
      });

      return {
        success: true,
        message: `已將全局分配套用到 ${updatedTaskCount} 個案件，新增 ${newAssignmentCount} 筆分配`,
        updatedTaskCount,
        newAssignmentCount,
      };
    },

    // 批量設定某類型的全局分配（覆蓋現有設定）+ 實時雙向同步
    setTaskTypeDefaultAssignments: async (
      _: unknown,
      args: {
        input: {
          taskTypeId: number;
          handlerIds: string[];
          reviewerIds: string[];
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務類型存在
      const taskType = await prisma.taskType.findUnique({
        where: { id: args.input.taskTypeId },
      });
      if (!taskType) {
        throw new Error("任務類型不存在");
      }

      // 獲取舊的全局分配設定（用於比對差異）
      const oldAssignments = await prisma.taskTypeDefaultAssignment.findMany({
        where: { taskTypeId: args.input.taskTypeId },
      });

      // 計算新的分配組合
      const newHandlers = new Set(args.input.handlerIds);
      const newReviewers = new Set(args.input.reviewerIds);

      // 計算舊的分配組合
      const oldHandlers = new Set(oldAssignments.filter(a => a.role === "HANDLER").map(a => a.userId));
      const oldReviewers = new Set(oldAssignments.filter(a => a.role === "REVIEWER").map(a => a.userId));

      // 計算需要新增和移除的分配
      const handlersToAdd = [...newHandlers].filter(id => !oldHandlers.has(id));
      const handlersToRemove = [...oldHandlers].filter(id => !newHandlers.has(id));
      const reviewersToAdd = [...newReviewers].filter(id => !oldReviewers.has(id));
      const reviewersToRemove = [...oldReviewers].filter(id => !newReviewers.has(id));

      // 使用事務處理全局分配設定
      const result = await prisma.$transaction(async (tx) => {
        // 刪除該類型的所有現有分配
        await tx.taskTypeDefaultAssignment.deleteMany({
          where: { taskTypeId: args.input.taskTypeId },
        });

        // 創建負責人分配
        const handlerAssignments = args.input.handlerIds.map((userId) => ({
          taskTypeId: args.input.taskTypeId,
          userId,
          role: "HANDLER" as const,
          createdBy: currentUser.id,
        }));

        // 創建複審人分配
        const reviewerAssignments = args.input.reviewerIds.map((userId) => ({
          taskTypeId: args.input.taskTypeId,
          userId,
          role: "REVIEWER" as const,
          createdBy: currentUser.id,
        }));

        const newAssignments = [...handlerAssignments, ...reviewerAssignments];

        if (newAssignments.length > 0) {
          await tx.taskTypeDefaultAssignment.createMany({
            data: newAssignments,
          });
        }

        // 返回新創建的分配
        return tx.taskTypeDefaultAssignment.findMany({
          where: { taskTypeId: args.input.taskTypeId },
          include: defaultAssignmentInclude,
        });
      });

      // 實時同步到現有任務（在事務外執行，避免長時間鎖定）
      // 找出該類型所有任務（排除已駁回和已複審）
      const existingTasks = await prisma.adminTask.findMany({
        where: {
          taskTypeId: args.input.taskTypeId,
          status: {
            notIn: [AdminTaskStatus.REJECTED, AdminTaskStatus.REVIEWED],
          },
        },
        select: { id: true },
      });

      let addedCount = 0;
      let removedCount = 0;

      // 處理需要移除的分配
      for (const userId of handlersToRemove) {
        const deleteResult = await prisma.adminTaskAssignment.deleteMany({
          where: {
            userId,
            role: "HANDLER",
            taskId: { in: existingTasks.map(t => t.id) },
          },
        });
        removedCount += deleteResult.count;
      }

      for (const userId of reviewersToRemove) {
        const deleteResult = await prisma.adminTaskAssignment.deleteMany({
          where: {
            userId,
            role: "REVIEWER",
            taskId: { in: existingTasks.map(t => t.id) },
          },
        });
        removedCount += deleteResult.count;
      }

      // 處理需要新增的分配
      for (const task of existingTasks) {
        for (const userId of handlersToAdd) {
          const existing = await prisma.adminTaskAssignment.findFirst({
            where: { taskId: task.id, userId, role: "HANDLER" },
          });
          if (!existing) {
            await prisma.adminTaskAssignment.create({
              data: {
                taskId: task.id,
                userId,
                role: "HANDLER",
                assignedBy: currentUser.id,
                notes: "依全局分配設定自動同步",
              },
            });
            addedCount++;
          }
        }

        for (const userId of reviewersToAdd) {
          const existing = await prisma.adminTaskAssignment.findFirst({
            where: { taskId: task.id, userId, role: "REVIEWER" },
          });
          if (!existing) {
            await prisma.adminTaskAssignment.create({
              data: {
                taskId: task.id,
                userId,
                role: "REVIEWER",
                assignedBy: currentUser.id,
                notes: "依全局分配設定自動同步",
              },
            });
            addedCount++;
          }
        }
      }

      // 記錄活動日誌
      if (addedCount > 0 || removedCount > 0) {
        await prisma.activityLog.create({
          data: {
            userId: currentUser.id,
            action: "sync_global_assignment_batch",
            entity: "task_assignment",
            entityId: args.input.taskTypeId.toString(),
            details: {
              taskTypeId: args.input.taskTypeId,
              handlersToAdd,
              handlersToRemove,
              reviewersToAdd,
              reviewersToRemove,
              affectedTaskCount: existingTasks.length,
              addedAssignmentCount: addedCount,
              removedAssignmentCount: removedCount,
            },
          },
        });
      }

      return result.map(formatDefaultAssignment);
    },
  },
};
