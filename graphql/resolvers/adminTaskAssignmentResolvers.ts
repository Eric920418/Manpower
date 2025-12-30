import { prisma } from "../prismaClient";
import type { AdminTaskStatus, Role, AssignmentRole } from "@prisma/client";
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

// 格式化分配資訊
const formatAssignment = (assignment: {
  id: number;
  taskId: number;
  userId: string;
  role: AssignmentRole;
  assignedAt: Date;
  assignedBy: string | null;
  notes: string | null;
  user: { id: string; name: string | null; email: string; role: string };
  assigner?: { id: string; name: string | null; email: string; role: string } | null;
  task?: unknown;
}) => {
  return {
    id: assignment.id,
    taskId: assignment.taskId,
    userId: assignment.userId,
    role: assignment.role,
    assignedAt: assignment.assignedAt.toISOString(),
    assignedBy: assignment.assignedBy,
    notes: assignment.notes,
    user: formatUser(assignment.user),
    assigner: assignment.assigner ? formatUser(assignment.assigner) : null,
    task: assignment.task,
  };
};

// 分配的 include 配置
const assignmentInclude = {
  user: {
    select: { id: true, name: true, email: true, role: true },
  },
  assigner: {
    select: { id: true, name: true, email: true, role: true },
  },
};

export const adminTaskAssignmentResolvers = {
  Query: {
    // 獲取案件的所有分配
    taskAssignments: async (
      _: unknown,
      args: { taskId: number },
      context: Context
    ) => {
      requireAuth(context);

      const assignments = await prisma.adminTaskAssignment.findMany({
        where: { taskId: args.taskId },
        include: assignmentInclude,
        orderBy: { assignedAt: "asc" },
      });

      return assignments.map(formatAssignment);
    },

    // 獲取用戶被分配的所有案件
    userTaskAssignments: async (
      _: unknown,
      args: {
        userId: string;
        status?: AdminTaskStatus;
        page?: number;
        pageSize?: number;
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 只有 SUPER_ADMIN 可以查看其他用戶的分配
      if (user.role !== "SUPER_ADMIN" && user.id !== args.userId) {
        throw new Error("權限不足：只能查看自己的分配");
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // 先獲取分配的任務 ID
      const assignedTaskIds = await prisma.adminTaskAssignment.findMany({
        where: { userId: args.userId },
        select: { taskId: true },
        distinct: ["taskId"],
      });

      const taskIds = assignedTaskIds.map((a) => a.taskId);

      if (taskIds.length === 0) {
        return {
          items: [],
          pageInfo: { total: 0, page, pageSize, totalPages: 0 },
        };
      }

      // 構建任務查詢條件
      const taskWhere: { id: { in: number[] }; status?: AdminTaskStatus } = {
        id: { in: taskIds },
      };
      if (args.status) {
        taskWhere.status = args.status;
      }

      const [total, tasks] = await Promise.all([
        prisma.adminTask.count({ where: taskWhere }),
        prisma.adminTask.findMany({
          where: taskWhere,
          include: {
            taskType: true,
            applicant: { select: { id: true, name: true, email: true, role: true } },
            processor: { select: { id: true, name: true, email: true, role: true } },
            approver: { select: { id: true, name: true, email: true, role: true } },
            attachments: true,
            approvalRecords: {
              include: { approver: { select: { id: true, name: true, email: true, role: true } } },
              orderBy: { createdAt: "desc" },
            },
            assignments: {
              include: assignmentInclude,
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
      ]);

      // 格式化任務
      const formattedTasks = tasks.map((task) => ({
        ...task,
        applicationDate: task.applicationDate.toISOString(),
        deadline: task.deadline?.toISOString() || null,
        receivedAt: task.receivedAt?.toISOString() || null,
        completedAt: task.completedAt?.toISOString() || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        applicant: formatUser(task.applicant),
        processor: formatUser(task.processor),
        approver: formatUser(task.approver),
        assignments: task.assignments.map(formatAssignment),
        assignees: task.assignments.map((a) => formatUser(a.user)),
        approvalRecords: task.approvalRecords.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          approver: formatUser(r.approver),
        })),
      }));

      return {
        items: formattedTasks,
        pageInfo: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    // 獲取所有用戶的分配摘要
    allUserAssignmentSummaries: async (_: unknown, __: unknown, context: Context) => {
      requirePermission(context, "task_assignment:read");

      // 獲取所有 ADMIN 用戶（不包含 SUPER_ADMIN）
      const users = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      // 獲取所有分配的統計
      const summaries = await Promise.all(
        users.map(async (user) => {
          const [totalTasks, pendingTasks, processingTasks, pendingReviewTasks] = await Promise.all([
            prisma.adminTaskAssignment.count({ where: { userId: user.id } }),
            prisma.adminTaskAssignment.count({
              where: {
                userId: user.id,
                task: { status: "PENDING" },
              },
            }),
            prisma.adminTaskAssignment.count({
              where: {
                userId: user.id,
                task: { status: "APPROVED" },
              },
            }),
            prisma.adminTaskAssignment.count({
              where: {
                userId: user.id,
                role: "REVIEWER",
                task: { status: "PENDING_REVIEW" },
              },
            }),
          ]);

          return {
            user: formatUser(user),
            totalTasks,
            pendingTasks,
            processingTasks,
            pendingReviewTasks,
          };
        })
      );

      return summaries;
    },

    // 獲取當前用戶被分配的案件
    myAssignedTasks: async (
      _: unknown,
      args: {
        status?: AdminTaskStatus;
        page?: number;
        pageSize?: number;
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 重用 userTaskAssignments 的邏輯
      return adminTaskAssignmentResolvers.Query.userTaskAssignments(
        _,
        { ...args, userId: user.id },
        context
      );
    },

    // 獲取可分配的用戶列表（不包含 SUPER_ADMIN，因為他們不需要被分配）
    assignableUsers: async (_: unknown, __: unknown, context: Context) => {
      requireAuth(context);

      const users = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      });

      return users.map(formatUser);
    },
  },

  Mutation: {
    // 分配案件給用戶
    assignTask: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          userId: string;
          role: AssignmentRole;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務存在
      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });
      if (!task) {
        throw new Error("任務不存在");
      }

      // 確認用戶存在且為管理員
      const targetUser = await prisma.user.findUnique({
        where: { id: args.input.userId },
      });
      if (!targetUser) {
        throw new Error("用戶不存在");
      }
      if (targetUser.role !== "ADMIN" && targetUser.role !== "SUPER_ADMIN") {
        throw new Error("只能將任務分配給管理員");
      }

      // 創建分配
      const assignment = await prisma.adminTaskAssignment.create({
        data: {
          taskId: args.input.taskId,
          userId: args.input.userId,
          role: args.input.role,
          assignedBy: currentUser.id,
          notes: args.input.notes,
        },
        include: assignmentInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "create",
          entity: "task_assignment",
          entityId: assignment.id.toString(),
          details: {
            taskId: args.input.taskId,
            taskNo: task.taskNo,
            role: args.input.role,
            assignedUserId: args.input.userId,
            assignedUserEmail: targetUser.email,
          },
        },
      });

      return formatAssignment(assignment);
    },

    // 批量分配案件
    bulkAssignTask: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          assignments: Array<{
            userId: string;
            role: AssignmentRole;
            notes?: string;
          }>;
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務存在
      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });
      if (!task) {
        throw new Error("任務不存在");
      }

      const results: Awaited<ReturnType<typeof formatAssignment>>[] = [];

      for (const assignmentInput of args.input.assignments) {
        // 確認用戶存在
        const targetUser = await prisma.user.findUnique({
          where: { id: assignmentInput.userId },
        });
        if (!targetUser) {
          continue; // 跳過不存在的用戶
        }

        try {
          const assignment = await prisma.adminTaskAssignment.create({
            data: {
              taskId: args.input.taskId,
              userId: assignmentInput.userId,
              role: assignmentInput.role,
              assignedBy: currentUser.id,
              notes: assignmentInput.notes,
            },
            include: assignmentInclude,
          });
          results.push(formatAssignment(assignment));
        } catch {
          // 忽略重複分配的錯誤
        }
      }

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "bulk_create",
          entity: "task_assignment",
          entityId: args.input.taskId.toString(),
          details: {
            taskId: args.input.taskId,
            taskNo: task.taskNo,
            assignmentsCount: results.length,
          },
        },
      });

      return results;
    },

    // 移除案件分配
    removeTaskAssignment: async (
      _: unknown,
      args: { assignmentId: number },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      const assignment = await prisma.adminTaskAssignment.findUnique({
        where: { id: args.assignmentId },
        include: {
          task: true,
          user: { select: { id: true, email: true } },
        },
      });

      if (!assignment) {
        throw new Error("分配不存在");
      }

      await prisma.adminTaskAssignment.delete({
        where: { id: args.assignmentId },
      });

      // 記錄活動日誌（保存完整資料快照以便復原）
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "delete",
          entity: "task_assignment",
          entityId: args.assignmentId.toString(),
          details: {
            // 顯示用的摘要資訊
            taskId: assignment.taskId,
            taskNo: assignment.task.taskNo,
            removedUserId: assignment.userId,
            removedUserEmail: assignment.user.email,
            // 完整的資料快照（用於復原）
            snapshot: {
              taskId: assignment.taskId,
              userId: assignment.userId,
              role: assignment.role,
              notes: assignment.notes,
              assignedBy: assignment.assignedBy,
            },
          },
        },
      });

      return true;
    },

    // 更新分配設定
    updateTaskAssignment: async (
      _: unknown,
      args: {
        input: {
          assignmentId: number;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      const assignment = await prisma.adminTaskAssignment.findUnique({
        where: { id: args.input.assignmentId },
      });

      if (!assignment) {
        throw new Error("分配不存在");
      }

      const updateData: { notes?: string } = {};
      if (args.input.notes !== undefined) {
        updateData.notes = args.input.notes;
      }

      const updated = await prisma.adminTaskAssignment.update({
        where: { id: args.input.assignmentId },
        data: updateData,
        include: assignmentInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "update",
          entity: "task_assignment",
          entityId: args.input.assignmentId.toString(),
          details: {
            changes: updateData,
          },
        },
      });

      return formatAssignment(updated);
    },

    // 批量更新案件的所有分配（覆蓋模式）
    replaceTaskAssignments: async (
      _: unknown,
      args: {
        taskId: number;
        assignments: Array<{
          userId: string;
          role: AssignmentRole;
          notes?: string;
        }>;
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務存在
      const task = await prisma.adminTask.findUnique({
        where: { id: args.taskId },
      });
      if (!task) {
        throw new Error("任務不存在");
      }

      // 刪除現有分配
      await prisma.adminTaskAssignment.deleteMany({
        where: { taskId: args.taskId },
      });

      // 創建新分配
      const results: Awaited<ReturnType<typeof formatAssignment>>[] = [];

      for (const assignmentInput of args.assignments) {
        try {
          const assignment = await prisma.adminTaskAssignment.create({
            data: {
              taskId: args.taskId,
              userId: assignmentInput.userId,
              role: assignmentInput.role,
              assignedBy: currentUser.id,
              notes: assignmentInput.notes,
            },
            include: assignmentInclude,
          });
          results.push(formatAssignment(assignment));
        } catch {
          // 忽略錯誤
        }
      }

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "replace",
          entity: "task_assignment",
          entityId: args.taskId.toString(),
          details: {
            taskId: args.taskId,
            taskNo: task.taskNo,
            newAssignmentsCount: results.length,
            assignments: args.assignments,
          },
        },
      });

      return results;
    },

    // 設定案件的負責人和複審人（便捷方法）
    setTaskAssignments: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          handlerIds: string[];
          reviewerIds: string[];
        };
      },
      context: Context
    ) => {
      const currentUser = requirePermission(context, "task_assignment:assign");

      // 確認任務存在
      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });
      if (!task) {
        throw new Error("任務不存在");
      }

      // 刪除現有分配
      await prisma.adminTaskAssignment.deleteMany({
        where: { taskId: args.input.taskId },
      });

      // 創建新分配
      const results: Awaited<ReturnType<typeof formatAssignment>>[] = [];

      // 添加負責人
      for (const userId of args.input.handlerIds) {
        try {
          const assignment = await prisma.adminTaskAssignment.create({
            data: {
              taskId: args.input.taskId,
              userId,
              role: "HANDLER",
              assignedBy: currentUser.id,
            },
            include: assignmentInclude,
          });
          results.push(formatAssignment(assignment));
        } catch {
          // 忽略錯誤
        }
      }

      // 添加複審人
      for (const userId of args.input.reviewerIds) {
        try {
          const assignment = await prisma.adminTaskAssignment.create({
            data: {
              taskId: args.input.taskId,
              userId,
              role: "REVIEWER",
              assignedBy: currentUser.id,
            },
            include: assignmentInclude,
          });
          results.push(formatAssignment(assignment));
        } catch {
          // 忽略錯誤
        }
      }

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "set_assignments",
          entity: "task_assignment",
          entityId: args.input.taskId.toString(),
          details: {
            taskId: args.input.taskId,
            taskNo: task.taskNo,
            handlerIds: args.input.handlerIds,
            reviewerIds: args.input.reviewerIds,
          },
        },
      });

      return results;
    },
  },
};
