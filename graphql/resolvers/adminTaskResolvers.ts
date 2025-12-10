import { prisma } from "../prismaClient";
import type { AdminTaskStatus, ApprovalRoute, Prisma } from "@prisma/client";

// 生成任務編號
const generateTaskNo = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `AT-${dateStr}-`;

  // 查找今天最後一個任務編號
  const lastTask = await prisma.adminTask.findFirst({
    where: {
      taskNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      taskNo: "desc",
    },
  });

  let nextNum = 1;
  if (lastTask) {
    const lastNum = parseInt(lastTask.taskNo.split("-").pop() || "0", 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
};

// Context 類型
interface Context {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

// 權限檢查
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new Error("未授權：請先登入");
  }
  return context.user;
};

const requireSuperAdmin = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("權限不足：需要超級管理員權限");
  }
  return user;
};

// 檢查是否為管理員（SUPER_ADMIN 或 ADMIN）
const requireAdmin = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    throw new Error("權限不足：需要管理員權限");
  }
  return user;
};

// 獲取管理員被分配的任務類型 ID 列表
const getAdminAssignedTaskTypeIds = async (userId: string): Promise<number[]> => {
  const assignments = await prisma.adminTaskTypeAssignment.findMany({
    where: { adminId: userId },
    select: { taskTypeId: true },
  });
  return assignments.map((a) => a.taskTypeId);
};

// 格式化日期
const formatDate = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString();
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

// 問題觸發條件定義
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

// 問題類型定義
interface Question {
  id: string;
  label: string;
  type: "TEXT" | "RADIO" | "CHECKBOX";
  options?: string[];
  required?: boolean;
  trigger?: QuestionTrigger;
}

// 格式化問題列表
const formatQuestions = (questions: unknown): Question[] => {
  if (!questions || !Array.isArray(questions)) return [];
  return questions.map((q: Question) => ({
    id: q.id || "",
    label: q.label || "",
    type: q.type || "TEXT",
    options: q.options || [],
    required: q.required || false,
    trigger: q.trigger || undefined,
  }));
};

// 流程關聯格式化
interface OutgoingFlow {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: unknown;
  order: number;
  toTaskType?: {
    id: number;
    code: string;
    label: string;
    description: string | null;
    order: number;
    isActive: boolean;
  };
}

const formatOutgoingFlow = (flow: OutgoingFlow) => ({
  id: flow.id,
  fromTaskTypeId: flow.fromTaskTypeId,
  toTaskTypeId: flow.toTaskTypeId,
  label: flow.label,
  condition: flow.condition || null,
  order: flow.order,
  toTaskType: flow.toTaskType ? {
    id: flow.toTaskType.id,
    code: flow.toTaskType.code,
    label: flow.toTaskType.label,
    description: flow.toTaskType.description,
    order: flow.toTaskType.order,
    isActive: flow.toTaskType.isActive,
  } : null,
});

// 格式化任務類型
const formatTaskType = (taskType: { id: number; code: string; label: string; description: string | null; order: number; isActive: boolean; questions?: unknown; outgoingFlows?: OutgoingFlow[]; createdAt: Date; updatedAt: Date }) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  order: taskType.order,
  isActive: taskType.isActive,
  questions: formatQuestions(taskType.questions),
  outgoingFlows: taskType.outgoingFlows?.map(formatOutgoingFlow) || [],
  createdAt: formatDate(taskType.createdAt),
  updatedAt: formatDate(taskType.updatedAt),
});

// 簡化的任務格式（用於父子關聯避免循環）
interface SimpleTask {
  id: number;
  taskNo: string;
  title: string;
  status: string;
  taskType: { id: number; code: string; label: string; description: string | null; order: number; isActive: boolean; questions?: unknown; outgoingFlows?: OutgoingFlow[]; createdAt: Date; updatedAt: Date };
  applicant: { id: string; name: string | null; email: string; role: string };
  createdAt: Date;
}

const formatSimpleTask = (task: SimpleTask) => ({
  id: task.id,
  taskNo: task.taskNo,
  title: task.title,
  status: task.status,
  taskType: formatTaskType(task.taskType),
  applicant: formatUser(task.applicant),
  createdAt: formatDate(task.createdAt),
});

// 格式化任務
const formatTask = (task: Prisma.AdminTaskGetPayload<{
  include: {
    taskType: true;
    applicant: true;
    processor: true;
    approver: true;
    attachments: true;
    approvalRecords: { include: { approver: true } };
    parentTask: { include: { taskType: true; applicant: true } };
    childTasks: { include: { taskType: true; applicant: true } };
  };
}>) => ({
  id: task.id,
  taskNo: task.taskNo,
  taskType: formatTaskType(task.taskType),
  title: task.title,
  // 任務關聯
  parentTaskId: task.parentTaskId,
  parentTask: task.parentTask ? formatSimpleTask(task.parentTask as SimpleTask) : null,
  childTasks: (task.childTasks || []).map((child) => formatSimpleTask(child as SimpleTask)),
  groupId: task.groupId,
  // 關聯人員
  applicant: formatUser(task.applicant),
  applicantName: task.applicantName,
  processor: formatUser(task.processor),
  processorName: task.processorName,
  approver: formatUser(task.approver),
  applicationDate: formatDate(task.applicationDate),
  deadline: formatDate(task.deadline),
  receivedAt: formatDate(task.receivedAt),
  completedAt: formatDate(task.completedAt),
  status: task.status,
  approvalRoute: task.approvalRoute,
  approvalMark: task.approvalMark,
  payload: task.payload,
  notes: task.notes,
  attachments: task.attachments.map((att) => ({
    id: att.id,
    filename: att.filename,
    originalName: att.originalName,
    mimeType: att.mimeType,
    size: att.size,
    path: att.path,
    url: att.url,
    uploadedBy: att.uploadedBy,
    createdAt: formatDate(att.createdAt),
  })),
  approvalRecords: task.approvalRecords.map((record) => ({
    id: record.id,
    taskId: record.taskId,
    action: record.action,
    comment: record.comment,
    approver: formatUser(record.approver),
    createdAt: formatDate(record.createdAt),
  })),
  createdAt: formatDate(task.createdAt),
  updatedAt: formatDate(task.updatedAt),
});

// 包含關聯的查詢選項
const taskInclude = {
  taskType: {
    include: {
      outgoingFlows: {
        include: {
          toTaskType: true,
        },
      },
    },
  },
  applicant: true,
  processor: true,
  approver: true,
  attachments: {
    orderBy: { createdAt: "desc" as const },
  },
  approvalRecords: {
    include: { approver: true },
    orderBy: { createdAt: "desc" as const },
  },
  // 父子任務關聯
  parentTask: {
    include: {
      taskType: true,
      applicant: true,
    },
  },
  childTasks: {
    include: {
      taskType: true,
      applicant: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export const adminTaskResolvers = {
  Query: {
    // 獲取行政任務列表（分頁）
    adminTasks: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        status?: AdminTaskStatus;
        taskTypeId?: number;
        applicantId?: string;
        processorId?: string;
        approverId?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: string;
      },
      context: Context
    ) => {
      const user = requireAdmin(context);

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const where: Prisma.AdminTaskWhereInput = {};

      // ADMIN 角色只能看到被分配的任務類型
      if (user.role === "ADMIN") {
        const assignedTaskTypeIds = await getAdminAssignedTaskTypeIds(user.id);
        if (assignedTaskTypeIds.length === 0) {
          // 沒有被分配任何任務類型，返回空列表
          return {
            items: [],
            pageInfo: { total: 0, page, pageSize, totalPages: 0 },
          };
        }
        where.taskTypeId = { in: assignedTaskTypeIds };
      }

      if (args.status) where.status = args.status;
      if (args.taskTypeId) {
        // 如果是 ADMIN，確保只能查詢被分配的任務類型
        if (user.role === "ADMIN") {
          const assignedTaskTypeIds = await getAdminAssignedTaskTypeIds(user.id);
          if (!assignedTaskTypeIds.includes(args.taskTypeId)) {
            return {
              items: [],
              pageInfo: { total: 0, page, pageSize, totalPages: 0 },
            };
          }
        }
        where.taskTypeId = args.taskTypeId;
      }
      if (args.applicantId) where.applicantId = args.applicantId;
      if (args.processorId) where.processorId = args.processorId;
      if (args.approverId) where.approverId = args.approverId;

      if (args.search) {
        where.OR = [
          { taskNo: { contains: args.search, mode: "insensitive" } },
          { title: { contains: args.search, mode: "insensitive" } },
          { notes: { contains: args.search, mode: "insensitive" } },
        ];
      }

      const sortBy = args.sortBy || "applicationDate";
      const sortOrder = args.sortOrder === "asc" ? "asc" : "desc";

      const [items, total] = await Promise.all([
        prisma.adminTask.findMany({
          where,
          include: taskInclude,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: pageSize,
        }),
        prisma.adminTask.count({ where }),
      ]);

      return {
        items: items.map(formatTask),
        pageInfo: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    // 獲取單個行政任務
    adminTask: async (_: unknown, args: { id: number }, context: Context) => {
      requireAuth(context);

      const task = await prisma.adminTask.findUnique({
        where: { id: args.id },
        include: taskInclude,
      });

      if (!task) return null;
      return formatTask(task);
    },

    // 獲取行政任務統計
    adminTaskStats: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAdmin(context);

      const now = new Date();

      // ADMIN 角色只統計被分配的任務類型
      let taskTypeFilter: Prisma.AdminTaskWhereInput = {};
      if (user.role === "ADMIN") {
        const assignedTaskTypeIds = await getAdminAssignedTaskTypeIds(user.id);
        if (assignedTaskTypeIds.length === 0) {
          return { total: 0, pending: 0, processing: 0, pendingDocuments: 0, approved: 0, rejected: 0, completed: 0, overdue: 0 };
        }
        taskTypeFilter = { taskTypeId: { in: assignedTaskTypeIds } };
      }

      const [total, pending, processing, pendingDocuments, approved, rejected, completed, overdue] = await Promise.all([
        prisma.adminTask.count({ where: taskTypeFilter }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PENDING" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PROCESSING" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PENDING_DOCUMENTS" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "APPROVED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "REJECTED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "COMPLETED" } }),
        prisma.adminTask.count({
          where: {
            ...taskTypeFilter,
            status: { in: ["PENDING", "PROCESSING", "PENDING_DOCUMENTS"] },
            deadline: { lt: now },
          },
        }),
      ]);

      return { total, pending, processing, pendingDocuments, approved, rejected, completed, overdue };
    },

    // 按類型統計
    adminTaskStatsByType: async (_: unknown, __: unknown, context: Context) => {
      requireSuperAdmin(context);

      // 獲取所有啟用的任務類型
      const taskTypes = await prisma.taskType.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      const stats = await Promise.all(
        taskTypes.map(async (taskType) => {
          const [count, completed, pending] = await Promise.all([
            prisma.adminTask.count({ where: { taskTypeId: taskType.id } }),
            prisma.adminTask.count({ where: { taskTypeId: taskType.id, status: "COMPLETED" } }),
            prisma.adminTask.count({ where: { taskTypeId: taskType.id, status: "PENDING" } }),
          ]);
          return { taskType: formatTaskType(taskType), count, completed, pending };
        })
      );

      return stats.filter((s) => s.count > 0);
    },

    // 獲取待審批的任務
    pendingApprovalTasks: async (
      _: unknown,
      args: { page?: number; pageSize?: number },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const where: Prisma.AdminTaskWhereInput = {
        status: "PROCESSING",
      };

      const [items, total] = await Promise.all([
        prisma.adminTask.findMany({
          where,
          include: taskInclude,
          orderBy: { applicationDate: "asc" },
          skip,
          take: pageSize,
        }),
        prisma.adminTask.count({ where }),
      ]);

      return {
        items: items.map(formatTask),
        pageInfo: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    // 獲取我的任務
    myAdminTasks: async (
      _: unknown,
      args: {
        role?: string;
        status?: AdminTaskStatus;
        page?: number;
        pageSize?: number;
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const where: Prisma.AdminTaskWhereInput = {};

      // 根據角色過濾
      if (args.role === "applicant") {
        where.applicantId = user.id;
      } else if (args.role === "processor") {
        where.processorId = user.id;
      } else if (args.role === "approver") {
        where.approverId = user.id;
      } else {
        // 預設顯示所有與我相關的任務
        where.OR = [
          { applicantId: user.id },
          { processorId: user.id },
          { approverId: user.id },
        ];
      }

      if (args.status) where.status = args.status;

      const [items, total] = await Promise.all([
        prisma.adminTask.findMany({
          where,
          include: taskInclude,
          orderBy: { applicationDate: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.adminTask.count({ where }),
      ]);

      return {
        items: items.map(formatTask),
        pageInfo: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },
  },

  Mutation: {
    // 創建行政任務
    createAdminTask: async (
      _: unknown,
      args: {
        input: {
          taskTypeId: number;
          title: string;
          applicantName?: string;
          processorName?: string;
          deadline?: string;
          approvalRoute?: ApprovalRoute;
          payload: Record<string, unknown>;
          notes?: string;
          parentTaskId?: number;
          groupId?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 驗證任務類型存在
      const taskType = await prisma.taskType.findUnique({
        where: { id: args.input.taskTypeId },
      });
      if (!taskType) {
        throw new Error("找不到該任務類型");
      }

      const taskNo = await generateTaskNo();

      // 處理群組 ID：如果有父任務且沒有指定群組 ID，繼承父任務的群組 ID 或創建新群組
      let groupId = args.input.groupId;
      if (args.input.parentTaskId && !groupId) {
        const parentTask = await prisma.adminTask.findUnique({
          where: { id: args.input.parentTaskId },
          select: { groupId: true },
        });
        if (parentTask?.groupId) {
          groupId = parentTask.groupId;
        } else {
          // 為父任務和當前任務創建新群組
          groupId = crypto.randomUUID();
          await prisma.adminTask.update({
            where: { id: args.input.parentTaskId },
            data: { groupId },
          });
        }
      }

      const task = await prisma.adminTask.create({
        data: {
          taskNo,
          taskTypeId: args.input.taskTypeId,
          title: args.input.title,
          applicantId: user.id,
          applicantName: args.input.applicantName || null,
          processorName: args.input.processorName || null,
          deadline: args.input.deadline ? new Date(args.input.deadline) : null,
          approvalRoute: args.input.approvalRoute || "V_ROUTE",
          payload: args.input.payload as Prisma.InputJsonValue,
          notes: args.input.notes,
          parentTaskId: args.input.parentTaskId || null,
          groupId: groupId || null,
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "create",
          entity: "admin_task",
          entityId: task.id.toString(),
          details: {
            taskNo: task.taskNo,
            taskTypeId: task.taskTypeId,
            title: task.title,
            parentTaskId: args.input.parentTaskId,
            groupId,
          },
        },
      });

      return formatTask(task);
    },

    // 更新行政任務
    updateAdminTask: async (
      _: unknown,
      args: {
        input: {
          id: number;
          title?: string;
          taskTypeId?: number;
          applicantName?: string;
          processorName?: string;
          deadline?: string;
          processorId?: string;
          approverId?: string;
          approvalRoute?: ApprovalRoute;
          payload?: Record<string, unknown>;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const existingTask = await prisma.adminTask.findUnique({
        where: { id: args.input.id },
      });

      if (!existingTask) {
        throw new Error("找不到該行政任務");
      }

      // 檢查權限：只有申請人、SUPER_ADMIN 可以編輯
      if (existingTask.applicantId !== user.id && user.role !== "SUPER_ADMIN") {
        throw new Error("權限不足：只有申請人或管理員可以編輯任務");
      }

      const updateData: Prisma.AdminTaskUpdateInput = {};

      if (args.input.title !== undefined) updateData.title = args.input.title;
      if (args.input.taskTypeId !== undefined) {
        updateData.taskType = { connect: { id: args.input.taskTypeId } };
      }
      if (args.input.applicantName !== undefined) updateData.applicantName = args.input.applicantName;
      if (args.input.processorName !== undefined) updateData.processorName = args.input.processorName;
      if (args.input.deadline !== undefined) {
        updateData.deadline = args.input.deadline ? new Date(args.input.deadline) : null;
      }
      if (args.input.processorId !== undefined) {
        updateData.processor = args.input.processorId
          ? { connect: { id: args.input.processorId } }
          : { disconnect: true };
      }
      if (args.input.approverId !== undefined) {
        updateData.approver = args.input.approverId
          ? { connect: { id: args.input.approverId } }
          : { disconnect: true };
      }
      if (args.input.approvalRoute !== undefined) {
        updateData.approvalRoute = args.input.approvalRoute;
      }
      if (args.input.payload !== undefined) {
        updateData.payload = args.input.payload as Prisma.InputJsonValue;
      }
      if (args.input.notes !== undefined) updateData.notes = args.input.notes;

      const task = await prisma.adminTask.update({
        where: { id: args.input.id },
        data: updateData,
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entity: "admin_task",
          entityId: task.id.toString(),
          details: { changes: Object.keys(updateData) },
        },
      });

      return formatTask(task);
    },

    // 刪除行政任務
    deleteAdminTask: async (_: unknown, args: { id: number }, context: Context) => {
      const user = requireSuperAdmin(context);

      const task = await prisma.adminTask.findUnique({
        where: { id: args.id },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 刪除相關的待處理提醒（sourceTaskId 或 completedTaskId 指向此任務）
      await prisma.pendingTaskReminder.deleteMany({
        where: {
          OR: [
            { sourceTaskId: args.id },
            { completedTaskId: args.id },
          ],
        },
      });

      await prisma.adminTask.delete({
        where: { id: args.id },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "delete",
          entity: "admin_task",
          entityId: args.id.toString(),
          details: { taskNo: task.taskNo },
        },
      });

      return true;
    },

    // 審批操作
    approveTask: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          action: string; // approve, reject, pending_documents, request_revision
          comment?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAdmin(context);

      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // ADMIN 角色只能審批被分配的任務類型
      if (user.role === "ADMIN") {
        const assignedTaskTypeIds = await getAdminAssignedTaskTypeIds(user.id);
        if (!assignedTaskTypeIds.includes(task.taskTypeId)) {
          throw new Error("權限不足：您沒有權限審批此任務類型");
        }
      }

      // 創建審批記錄
      await prisma.approvalRecord.create({
        data: {
          taskId: args.input.taskId,
          action: args.input.action,
          comment: args.input.comment,
          approverId: user.id,
        },
      });

      // 更新任務狀態
      let newStatus: AdminTaskStatus = task.status;
      let approvalMark: string | null = null;

      if (args.input.action === "approve") {
        newStatus = "APPROVED";
        approvalMark = "V";
      } else if (args.input.action === "reject") {
        newStatus = "REJECTED";
        approvalMark = "-";
      } else if (args.input.action === "pending_documents") {
        newStatus = "PENDING_DOCUMENTS";
        approvalMark = "?";
      } else if (args.input.action === "request_revision") {
        newStatus = "PENDING";
        approvalMark = null;
      }

      const updatedTask = await prisma.adminTask.update({
        where: { id: args.input.taskId },
        data: {
          status: newStatus,
          approvalMark,
          approverId: user.id,
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: args.input.action,
          entity: "admin_task",
          entityId: args.input.taskId.toString(),
          details: {
            action: args.input.action,
            comment: args.input.comment,
            newStatus,
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 更新任務狀態
    updateTaskStatus: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          status: AdminTaskStatus;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查權限：完成人或 SUPER_ADMIN 可以更新狀態
      if (task.processorId !== user.id && user.role !== "SUPER_ADMIN") {
        throw new Error("權限不足：只有完成人或管理員可以更新任務狀態");
      }

      const updateData: Prisma.AdminTaskUpdateInput = {
        status: args.input.status,
      };

      if (args.input.notes !== undefined) {
        updateData.notes = args.input.notes;
      }

      // 如果狀態改為 PROCESSING，記錄受理時間
      if (args.input.status === "PROCESSING" && !task.receivedAt) {
        updateData.receivedAt = new Date();
      }

      // 如果狀態改為 COMPLETED，記錄完成時間
      if (args.input.status === "COMPLETED" && !task.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedTask = await prisma.adminTask.update({
        where: { id: args.input.taskId },
        data: updateData,
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update_status",
          entity: "admin_task",
          entityId: args.input.taskId.toString(),
          details: {
            oldStatus: task.status,
            newStatus: args.input.status,
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 分配完成人
    assignProcessor: async (
      _: unknown,
      args: { taskId: number; processorId: string },
      context: Context
    ) => {
      const user = requireSuperAdmin(context);

      const task = await prisma.adminTask.update({
        where: { id: args.taskId },
        data: {
          processorId: args.processorId,
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "assign_processor",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: { processorId: args.processorId },
        },
      });

      return formatTask(task);
    },

    // 分配審批人
    assignApprover: async (
      _: unknown,
      args: { taskId: number; approverId: string },
      context: Context
    ) => {
      const user = requireSuperAdmin(context);

      const task = await prisma.adminTask.update({
        where: { id: args.taskId },
        data: {
          approverId: args.approverId,
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "assign_approver",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: { approverId: args.approverId },
        },
      });

      return formatTask(task);
    },

    // 上傳附件（簡化版，實際上傳邏輯在 API 路由處理）
    uploadTaskAttachment: async (
      _: unknown,
      args: {
        taskId: number;
        file: {
          filename: string;
          originalName: string;
          mimeType: string;
          size: number;
          path: string;
          url?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      const attachment = await prisma.adminTaskAttachment.create({
        data: {
          taskId: args.taskId,
          filename: args.file.filename,
          originalName: args.file.originalName,
          mimeType: args.file.mimeType,
          size: args.file.size,
          path: args.file.path,
          url: args.file.url,
          uploadedBy: user.id,
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "upload_attachment",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: {
            attachmentId: attachment.id,
            filename: args.file.originalName,
            size: args.file.size,
            mimeType: args.file.mimeType,
          },
        },
      });

      return {
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        path: attachment.path,
        url: attachment.url,
        uploadedBy: attachment.uploadedBy,
        createdAt: formatDate(attachment.createdAt),
      };
    },

    // 刪除附件
    deleteTaskAttachment: async (
      _: unknown,
      args: { attachmentId: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 先獲取附件資訊
      const attachment = await prisma.adminTaskAttachment.findUnique({
        where: { id: args.attachmentId },
      });

      if (!attachment) {
        throw new Error("找不到該附件");
      }

      await prisma.adminTaskAttachment.delete({
        where: { id: args.attachmentId },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "delete_attachment",
          entity: "admin_task",
          entityId: attachment.taskId.toString(),
          details: {
            attachmentId: args.attachmentId,
            filename: attachment.originalName,
          },
        },
      });

      return true;
    },
  },
};
