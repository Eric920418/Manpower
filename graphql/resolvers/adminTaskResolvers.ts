import { prisma } from "../prismaClient";
import type { AdminTaskStatus, ApprovalRoute, Prisma, Role } from "@prisma/client";
import { hasPermissionWithCustom, Permission, CustomPermissions } from "@/lib/permissions";

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

// 檢查用戶是否擁有特定權限（支援自訂權限）
const requirePermission = (context: Context, permission: Permission) => {
  const user = requireAuth(context);
  console.log(`[Permission Check] User: ${user.id}, Role: ${user.role}, Permission: ${permission}, CustomPermissions: ${JSON.stringify(user.customPermissions)}`);
  const hasPermission = hasPermissionWithCustom(
    user.role as Role,
    permission,
    user.customPermissions
  );
  console.log(`[Permission Check] Result: ${hasPermission}`);
  if (!hasPermission) {
    throw new Error(`權限不足：需要 ${permission} 權限`);
  }
  return user;
};

// 獲取管理員被分配的案件 ID 列表
const getAdminAssignedTaskIds = async (userId: string): Promise<number[]> => {
  const assignments = await prisma.adminTaskAssignment.findMany({
    where: { userId },
    select: { taskId: true },
    distinct: ["taskId"],
  });
  return assignments.map((a) => a.taskId);
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

// 格式化分配資訊
interface AssignmentData {
  id: number;
  taskId: number;
  userId: string;
  role: string;
  assignedAt: Date;
  assignedBy: string | null;
  notes: string | null;
  user: { id: string; name: string | null; email: string; role: string };
  assigner: { id: string; name: string | null; email: string; role: string } | null;
}

const formatAssignment = (assignment: AssignmentData) => ({
  id: assignment.id,
  taskId: assignment.taskId,
  userId: assignment.userId,
  role: assignment.role,
  assignedAt: formatDate(assignment.assignedAt),
  assignedBy: assignment.assignedBy,
  notes: assignment.notes,
  user: formatUser(assignment.user),
  assigner: assignment.assigner ? formatUser(assignment.assigner) : null,
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
    assignments: { include: { user: true; assigner: true } };
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
  // 複審確認
  reviewedAt: formatDate(task.reviewedAt),
  reviewedBy: task.reviewedBy,
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
    // 要求修改專用欄位
    revisionReason: record.revisionReason,
    revisionDetail: record.revisionDetail,
    revisionDeadline: record.revisionDeadline ? formatDate(record.revisionDeadline) : null,
    approver: formatUser(record.approver),
    createdAt: formatDate(record.createdAt),
  })),
  // 案件分配
  assignments: (task.assignments || []).map((a) => formatAssignment(a as AssignmentData)),
  handlers: (task.assignments || []).filter((a) => a.role === "HANDLER").map((a) => formatUser(a.user)),
  reviewers: (task.assignments || []).filter((a) => a.role === "REVIEWER").map((a) => formatUser(a.user)),
  createdAt: formatDate(task.createdAt),
  updatedAt: formatDate(task.updatedAt),
});

// 包含關聯的查詢選項（完整版 - 用於單一任務詳情）
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
  // 案件分配（新機制）
  assignments: {
    include: {
      user: true,
      assigner: true,
    },
    orderBy: [{ role: "asc" as const }, { assignedAt: "asc" as const }],
  },
};

// 簡化版包含選項（用於列表查詢 - 減少資料傳輸量）
const taskListInclude = {
  taskType: {
    select: {
      id: true,
      code: true,
      label: true,
      description: true,
      order: true,
      isActive: true,
      questions: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  applicant: {
    select: { id: true, name: true, email: true, role: true },
  },
  processor: {
    select: { id: true, name: true, email: true, role: true },
  },
  approver: {
    select: { id: true, name: true, email: true, role: true },
  },
  // 列表不需要載入附件和審批記錄的完整資料
  _count: {
    select: {
      attachments: true,
      approvalRecords: true,
      childTasks: true,
    },
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
        status?: string;  // 支援 AdminTaskStatus 枚舉值及特殊篩選值
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
      // 使用權限檢查，允許有 admin_task:read 權限的用戶訪問
      const user = requirePermission(context, "admin_task:read");

      const page = args.page || 1;
      const pageSize = Math.min(args.pageSize || 20, 100);
      const skip = (page - 1) * pageSize;

      const where: Prisma.AdminTaskWhereInput = {};

      // 根據角色設定不同的資料訪問範圍
      if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
        // SUPER_ADMIN 和 ADMIN 可以看到所有任務
      } else {
        // OWNER/STAFF 可以看到：1. 自己創建的任務 2. 被分配給自己的任務
        const assignedTaskIds = await getAdminAssignedTaskIds(user.id);
        // 使用 AND 來確保權限過濾不會被其他條件覆蓋
        where.AND = [
          {
            OR: [
              { applicantId: user.id },
              ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
            ],
          },
        ];
      }

      // 特殊篩選：待複審打勾（已完成 + 有複審人 + 尚未複審確認）
      if ((args.status as string) === "AWAITING_REVIEW_CHECK") {
        where.status = "COMPLETED";
        where.reviewedAt = null;
        where.assignments = {
          some: { role: "REVIEWER" },
        };
      } else if ((args.status as string) === "OVERDUE") {
        // 特殊篩選：逾期的（截止日期已過 + 狀態非已複審/已退回）
        where.deadline = { lt: new Date() };
        where.status = {
          in: ["PENDING", "PENDING_DOCUMENTS", "PENDING_REVIEW", "REVISION_REQUESTED", "APPROVED", "COMPLETED"],
        };
      } else if (args.status) {
        where.status = args.status as AdminTaskStatus;
      }
      if (args.taskTypeId) {
        // 對於 ADMIN，已經透過案件分配限制了可見範圍，這裡只需要額外篩選類型
        where.taskTypeId = args.taskTypeId;
      }
      if (args.applicantId) where.applicantId = args.applicantId;
      if (args.processorId) where.processorId = args.processorId;
      if (args.approverId) where.approverId = args.approverId;

      if (args.search) {
        // 搜尋條件使用 OR，並加入到 AND 陣列中（如果存在的話）
        const searchCondition = {
          OR: [
            { taskNo: { contains: args.search, mode: "insensitive" as const } },
            { title: { contains: args.search, mode: "insensitive" as const } },
            { notes: { contains: args.search, mode: "insensitive" as const } },
          ],
        };
        if (where.AND) {
          (where.AND as any[]).push(searchCondition);
        } else {
          where.AND = [searchCondition];
        }
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
      // 使用權限檢查，允許有 admin_task:read 權限的用戶訪問
      const user = requirePermission(context, "admin_task:read");

      const now = new Date();

      // 根據角色設定不同的統計範圍
      let taskTypeFilter: Prisma.AdminTaskWhereInput = {};
      if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
        // SUPER_ADMIN 和 ADMIN 統計所有任務
      } else {
        // OWNER/STAFF 統計：1. 自己創建的任務 2. 被分配給自己的任務
        const assignedTaskIds = await getAdminAssignedTaskIds(user.id);
        taskTypeFilter = {
          OR: [
            { applicantId: user.id },
            ...(assignedTaskIds.length > 0 ? [{ id: { in: assignedTaskIds } }] : []),
          ],
        };
      }

      const [total, pending, pendingDocuments, pendingReview, revisionRequested, approved, rejected, completed, reviewed, overdue] = await Promise.all([
        prisma.adminTask.count({ where: taskTypeFilter }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PENDING" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PENDING_DOCUMENTS" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "PENDING_REVIEW" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "REVISION_REQUESTED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "APPROVED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "REJECTED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "COMPLETED" } }),
        prisma.adminTask.count({ where: { ...taskTypeFilter, status: "REVIEWED" } }),
        prisma.adminTask.count({
          where: {
            ...taskTypeFilter,
            status: { in: ["PENDING", "PENDING_DOCUMENTS", "PENDING_REVIEW", "REVISION_REQUESTED"] },
            deadline: { lt: now },
          },
        }),
      ]);

      return { total, pending, processing: 0, pendingDocuments, pendingReview, revisionRequested, approved, rejected, completed, reviewed, overdue };
    },

    // 按類型統計（優化：使用 groupBy 替代 N+1 查詢）
    adminTaskStatsByType: async (_: unknown, __: unknown, context: Context) => {
      requireSuperAdmin(context);

      // 並行查詢：任務類型 + 統計資料
      const [taskTypes, grouped] = await Promise.all([
        prisma.taskType.findMany({
          where: { isActive: true },
          orderBy: { order: "asc" },
        }),
        prisma.adminTask.groupBy({
          by: ["taskTypeId", "status"],
          _count: { id: true },
        }),
      ]);

      // 建立統計映射表
      const statsMap = new Map<number, { count: number; completed: number; pending: number }>();

      for (const item of grouped) {
        const existing = statsMap.get(item.taskTypeId) || { count: 0, completed: 0, pending: 0 };
        existing.count += item._count.id;
        if (item.status === "COMPLETED") {
          existing.completed += item._count.id;
        } else if (item.status === "PENDING") {
          existing.pending += item._count.id;
        }
        statsMap.set(item.taskTypeId, existing);
      }

      // 組合結果
      const stats = taskTypes
        .map((taskType) => {
          const stat = statsMap.get(taskType.id) || { count: 0, completed: 0, pending: 0 };
          return {
            taskType: formatTaskType(taskType),
            count: stat.count,
            completed: stat.completed,
            pending: stat.pending,
          };
        })
        .filter((s) => s.count > 0);

      return stats;
    },

    // 獲取待審批的任務（已批准，負責人處理中的任務）
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
        status: "APPROVED",
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

    // 檢查待修改的案件（申請人收到要求修改通知）
    checkRevisionRequests: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // 查找當前用戶作為申請人的案件，且狀態為要求修改
      const tasksWithRevisionRequest = await prisma.adminTask.findMany({
        where: {
          applicantId: user.id,
          status: "REVISION_REQUESTED", // 要求修改的專用狀態
          approvalRecords: {
            some: {
              action: "request_revision",
            },
          },
        },
        include: {
          approvalRecords: {
            where: {
              action: "request_revision",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            include: {
              approver: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // 過濾出最新審批記錄是 request_revision 的案件
      const notifications = [];
      for (const task of tasksWithRevisionRequest) {
        // 取得該任務的最新審批記錄
        const latestRecord = await prisma.approvalRecord.findFirst({
          where: { taskId: task.id },
          orderBy: { createdAt: "desc" },
          include: { approver: true },
        });

        // 只有當最新記錄是 request_revision 時才顯示
        if (latestRecord && latestRecord.action === "request_revision") {
          notifications.push({
            taskId: task.id,
            taskNo: task.taskNo,
            title: task.title,
            revisionReason: latestRecord.revisionReason,
            revisionDetail: latestRecord.revisionDetail,
            revisionDeadline: latestRecord.revisionDeadline
              ? formatDate(latestRecord.revisionDeadline)
              : null,
            requestedBy: formatUser(latestRecord.approver),
            requestedAt: formatDate(latestRecord.createdAt),
          });
        }
      }

      return notifications;
    },

    // 檢查待補件的任務
    checkPendingDocuments: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // 查找當前用戶相關的待補件任務
      // 可能是申請人、處理人或分配人員
      const pendingDocumentsTasks = await prisma.adminTask.findMany({
        where: {
          status: "PENDING_DOCUMENTS",
          OR: [
            { applicantId: user.id },
            { processorId: user.id },
            { approverId: user.id },
            { assignments: { some: { userId: user.id } } },
          ],
        },
        include: {
          taskType: true,
          approvalRecords: {
            where: {
              action: "pending_documents",
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return pendingDocumentsTasks.map((task) => ({
        taskId: task.id,
        taskNo: task.taskNo,
        title: task.title,
        taskTypeName: task.taskType?.label || "未知任務類型",
        pendingReason: task.approvalRecords[0]?.comment || null,
        createdAt: formatDate(task.createdAt),
        updatedAt: formatDate(task.updatedAt),
      }));
    },

    // 檢查待處理的任務（分配給當前用戶）
    checkPendingTasks: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // 查找分配給當前用戶的待處理任務
      const pendingTasks = await prisma.adminTask.findMany({
        where: {
          status: "PENDING",
          OR: [
            { processorId: user.id },
            { approverId: user.id },
            { assignments: { some: { userId: user.id } } },
          ],
        },
        include: {
          taskType: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // 最多顯示 10 筆
      });

      return pendingTasks.map((task) => ({
        taskId: task.id,
        taskNo: task.taskNo,
        title: task.title,
        taskTypeName: task.taskType?.label || "未知任務類型",
        applicantName: task.applicantName,
        deadline: task.deadline ? formatDate(task.deadline) : null,
        createdAt: formatDate(task.createdAt),
      }));
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
      // 使用權限檢查，允許有 admin_task:create 權限的用戶創建任務
      const user = requirePermission(context, "admin_task:create");

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

      // 自動分配：根據全局分配設定建立案件分配記錄
      const defaultAssignments = await prisma.taskTypeDefaultAssignment.findMany({
        where: { taskTypeId: args.input.taskTypeId },
      });

      let autoAssignedCount = 0;
      if (defaultAssignments.length > 0) {
        const assignmentData = defaultAssignments.map((da) => ({
          taskId: task.id,
          userId: da.userId,
          role: da.role, // 包含角色（HANDLER 或 REVIEWER）
          assignedBy: null as string | null, // 系統自動分配
          notes: "依全局分配設定自動分配",
        }));

        await prisma.adminTaskAssignment.createMany({
          data: assignmentData,
        });
        autoAssignedCount = defaultAssignments.length;
      }

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
            autoAssignedCount,
          },
        },
      });

      // 如果有自動分配，重新載入任務以包含分配資訊
      if (autoAssignedCount > 0) {
        const updatedTask = await prisma.adminTask.findUnique({
          where: { id: task.id },
          include: taskInclude,
        });
        return formatTask(updatedTask!);
      }

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

      // 檢查權限：申請人、SUPER_ADMIN、被分配的 ADMIN 可以編輯
      let canEdit = false;
      if (existingTask.applicantId === user.id) {
        canEdit = true;
      } else if (user.role === "SUPER_ADMIN") {
        canEdit = true;
      } else if (user.role === "ADMIN") {
        // 檢查是否被分配到此案件
        const assignment = await prisma.adminTaskAssignment.findFirst({
          where: {
            taskId: existingTask.id,
            userId: user.id,
          },
        });
        if (assignment) {
          canEdit = true;
        }
      }

      if (!canEdit) {
        throw new Error("權限不足：只有申請人或被分配的管理員可以編輯任務");
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
      const user = requirePermission(context, "admin_task:delete");

      // 取得完整的任務資料作為刪除前備份
      const task = await prisma.adminTask.findUnique({
        where: { id: args.id },
        include: {
          taskType: { select: { id: true, code: true, label: true } },
          applicant: { select: { id: true, name: true, email: true } },
          processor: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          attachments: true,
          approvalRecords: {
            include: {
              approver: { select: { id: true, name: true, email: true } },
            },
          },
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
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

      // 記錄活動日誌（保存完整的任務資料快照以便復原）
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "delete",
          entity: "admin_task",
          entityId: args.id.toString(),
          details: {
            // 顯示用的摘要資訊
            taskNo: task.taskNo,
            title: task.title,
            taskType: task.taskType.label,
            applicantName: task.applicant.name || task.applicant.email,
            status: task.status,
            // 完整的資料快照（用於復原）
            snapshot: {
              taskNo: task.taskNo,
              taskTypeId: task.taskTypeId,
              title: task.title,
              parentTaskId: task.parentTaskId,
              groupId: task.groupId,
              applicantId: task.applicantId,
              applicantName: task.applicantName,
              processorId: task.processorId,
              processorName: task.processorName,
              approverId: task.approverId,
              applicationDate: task.applicationDate,
              deadline: task.deadline,
              receivedAt: task.receivedAt,
              completedAt: task.completedAt,
              status: task.status,
              approvalRoute: task.approvalRoute,
              approvalMark: task.approvalMark,
              payload: task.payload,
              notes: task.notes,
              attachments: task.attachments.map(a => ({
                filename: a.filename,
                originalName: a.originalName,
                mimeType: a.mimeType,
                size: a.size,
                path: a.path,
                url: a.url,
              })),
              approvalRecords: task.approvalRecords.map(r => ({
                action: r.action,
                comment: r.comment,
                revisionReason: r.revisionReason,
                revisionDetail: r.revisionDetail,
                revisionDeadline: r.revisionDeadline,
                approverId: r.approverId,
                approverName: r.approver.name || r.approver.email,
              })),
              assignments: task.assignments.map(a => ({
                userId: a.userId,
                userName: a.user.name || a.user.email,
                role: a.role,
                notes: a.notes,
              })),
            },
          },
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
          // 要求修改專用欄位
          revisionReason?: string;
          revisionDetail?: string;
          revisionDeadline?: string;
        };
      },
      context: Context
    ) => {
      // 檢查 admin_task:approve 權限（支援自訂權限）
      const user = requirePermission(context, "admin_task:approve");

      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // SUPER_ADMIN 和 ADMIN 可以審批任何案件
      // OWNER/STAFF 只能審批被分配給自己的案件或自己創建的案件
      if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        // 檢查是否為創建者
        const isCreator = task.applicantId === user.id;

        // 檢查是否被分配
        const assignment = await prisma.adminTaskAssignment.findFirst({
          where: {
            taskId: task.id,
            userId: user.id,
          },
        });

        if (!isCreator && !assignment) {
          throw new Error("權限不足：您未被分配此案件且非創建者");
        }
      }

      // 創建審批記錄
      await prisma.approvalRecord.create({
        data: {
          taskId: args.input.taskId,
          action: args.input.action,
          comment: args.input.comment,
          approverId: user.id,
          // 要求修改專用欄位
          revisionReason: args.input.action === "request_revision" ? args.input.revisionReason : null,
          revisionDetail: args.input.action === "request_revision" ? args.input.revisionDetail : null,
          revisionDeadline: args.input.action === "request_revision" && args.input.revisionDeadline
            ? new Date(args.input.revisionDeadline)
            : null,
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
        newStatus = "REVISION_REQUESTED";
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

      // 如果狀態改為 APPROVED（負責人認領），記錄受理時間
      if (args.input.status === "APPROVED" && !task.receivedAt) {
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
      const user = requirePermission(context, "task_assignment:assign");

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
      const user = requirePermission(context, "task_assignment:assign");

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

    // 提交複審（負責人完成處理後提交給複審人）
    submitForReview: async (
      _: unknown,
      args: { taskId: number; notes?: string },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 獲取任務
      const task = await prisma.adminTask.findUnique({
        where: { id: args.taskId },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查是否為負責人（HANDLER）
      const isHandler = task.assignments.some(
        (a) => a.userId === user.id && a.role === "HANDLER"
      );
      const isSuperAdmin = user.role === "SUPER_ADMIN";

      if (!isHandler && !isSuperAdmin) {
        throw new Error("權限不足：只有負責人可以提交複審");
      }

      // 檢查任務狀態是否可提交複審（必須是已批准）
      if (task.status !== "APPROVED" && task.status !== "PENDING") {
        throw new Error("任務狀態不允許提交複審");
      }

      // 檢查是否有複審人
      const hasReviewer = task.assignments.some((a) => a.role === "REVIEWER");
      if (!hasReviewer) {
        throw new Error("此案件尚未分配複審人");
      }

      // 更新任務狀態為待複審
      const updatedTask = await prisma.adminTask.update({
        where: { id: args.taskId },
        data: { status: "PENDING_REVIEW" },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "submit_for_review",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: {
            taskNo: task.taskNo,
            notes: args.notes,
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 複審操作（複審人審核案件）
    reviewTask: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          action: string; // approve 或 reject
          comment?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 獲取任務
      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查是否為複審人（REVIEWER）
      const isReviewer = task.assignments.some(
        (a) => a.userId === user.id && a.role === "REVIEWER"
      );
      const isSuperAdmin = user.role === "SUPER_ADMIN";

      if (!isReviewer && !isSuperAdmin) {
        throw new Error("權限不足：只有複審人可以審核此案件");
      }

      // 檢查任務狀態是否為待複審
      if (task.status !== "PENDING_REVIEW") {
        throw new Error("任務狀態不是待複審，無法進行複審");
      }

      // 根據操作更新狀態
      let newStatus: AdminTaskStatus;
      if (args.input.action === "approve") {
        newStatus = "COMPLETED"; // 複審通過後狀態變成已完成
      } else if (args.input.action === "reject") {
        newStatus = "APPROVED"; // 駁回後回到已批准，讓負責人修改
      } else {
        throw new Error("無效的複審操作");
      }

      // 更新任務狀態
      const updatedTask = await prisma.adminTask.update({
        where: { id: args.input.taskId },
        data: {
          status: newStatus,
          approverId: args.input.action === "approve" ? user.id : undefined,
          completedAt: args.input.action === "approve" ? new Date() : undefined,
        },
        include: taskInclude,
      });

      // 創建審批記錄
      await prisma.approvalRecord.create({
        data: {
          taskId: args.input.taskId,
          action: args.input.action === "approve" ? "review_approve" : "review_reject",
          comment: args.input.comment,
          approverId: user.id,
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: args.input.action === "approve" ? "review_approve" : "review_reject",
          entity: "admin_task",
          entityId: args.input.taskId.toString(),
          details: {
            taskNo: task.taskNo,
            action: args.input.action,
            comment: args.input.comment,
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 重新送出案件（申請人修改後重新提交）
    resubmitTask: async (
      _: unknown,
      args: {
        input: {
          taskId: number;
          payload?: Record<string, unknown>;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 獲取任務
      const task = await prisma.adminTask.findUnique({
        where: { id: args.input.taskId },
        include: {
          approvalRecords: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查是否為申請人
      if (task.applicantId !== user.id && user.role !== "SUPER_ADMIN") {
        throw new Error("權限不足：只有申請人可以重新送出案件");
      }

      // 檢查狀態是否允許重新送出（要求修改 或 待補件）
      if (task.status !== "REVISION_REQUESTED" && task.status !== "PENDING_DOCUMENTS") {
        throw new Error("案件狀態不允許重新送出，只有「要求修改」或「待補件」的案件可以重新送出");
      }

      // 更新任務
      const updateData: Prisma.AdminTaskUpdateInput = {
        status: "PENDING", // 重新送出後狀態變回待處理
        approvalMark: null, // 清除審批標記
      };

      // 如果有更新 payload
      if (args.input.payload !== undefined) {
        updateData.payload = args.input.payload as Prisma.InputJsonValue;
      }

      // 如果有更新備註
      if (args.input.notes !== undefined) {
        updateData.notes = args.input.notes;
      }

      const updatedTask = await prisma.adminTask.update({
        where: { id: args.input.taskId },
        data: updateData,
        include: taskInclude,
      });

      // 創建審批記錄（記錄重新送出）
      await prisma.approvalRecord.create({
        data: {
          taskId: args.input.taskId,
          action: "resubmit",
          comment: args.input.notes || "申請人已修改並重新送出",
          approverId: user.id,
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "resubmit",
          entity: "admin_task",
          entityId: args.input.taskId.toString(),
          details: {
            taskNo: task.taskNo,
            previousStatus: task.status,
            newStatus: "PENDING",
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 完成確認打勾（只有負責人可操作，將已批准改為已完成）
    toggleCompleteCheck: async (
      _: unknown,
      args: { taskId: number; checked: boolean },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 獲取任務
      const task = await prisma.adminTask.findUnique({
        where: { id: args.taskId },
        include: {
          assignments: {
            where: { role: "HANDLER" },
            select: { userId: true },
          },
        },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查是否為負責人（只有負責人可以打勾）
      const isHandler = task.assignments.some((a) => a.userId === user.id);
      const isSuperAdmin = user.role === "SUPER_ADMIN";

      if (!isHandler && !isSuperAdmin) {
        throw new Error("權限不足：只有被指定的負責人可以進行完成確認");
      }

      // 檢查狀態：打勾時必須是已批准，取消時必須是已完成
      if (args.checked && task.status !== "APPROVED") {
        throw new Error("只有已批准狀態的案件才能標記為完成");
      }
      if (!args.checked && task.status !== "COMPLETED") {
        throw new Error("只有已完成狀態的案件才能取消完成標記");
      }

      // 更新完成確認狀態
      const updatedTask = await prisma.adminTask.update({
        where: { id: args.taskId },
        data: {
          // 打勾時狀態改為已完成，取消打勾時改回已批准
          status: args.checked ? "COMPLETED" : "APPROVED",
          completedAt: args.checked ? new Date() : null,
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: args.checked ? "complete_check" : "complete_uncheck",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: {
            taskNo: task.taskNo,
            checked: args.checked,
          },
        },
      });

      return formatTask(updatedTask);
    },

    // 複審確認打勾（只有複審人可操作）
    toggleReviewCheck: async (
      _: unknown,
      args: { taskId: number; checked: boolean },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 獲取任務
      const task = await prisma.adminTask.findUnique({
        where: { id: args.taskId },
        include: {
          assignments: {
            where: { role: "REVIEWER" },
            select: { userId: true },
          },
        },
      });

      if (!task) {
        throw new Error("找不到該行政任務");
      }

      // 檢查是否為複審人（只有複審人可以打勾）
      const isReviewer = task.assignments.some((a) => a.userId === user.id);
      const isSuperAdmin = user.role === "SUPER_ADMIN";

      if (!isReviewer && !isSuperAdmin) {
        throw new Error("權限不足：只有被指定的複審人可以進行複審確認");
      }

      // 更新複審確認狀態，打勾時狀態改為已複審，取消時改回已完成
      const updatedTask = await prisma.adminTask.update({
        where: { id: args.taskId },
        data: {
          reviewedAt: args.checked ? new Date() : null,
          reviewedBy: args.checked ? user.id : null,
          // 打勾時狀態改為已複審，取消打勾時改回已完成
          status: args.checked ? "REVIEWED" : "COMPLETED",
        },
        include: taskInclude,
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: args.checked ? "review_check" : "review_uncheck",
          entity: "admin_task",
          entityId: args.taskId.toString(),
          details: {
            taskNo: task.taskNo,
            checked: args.checked,
          },
        },
      });

      return formatTask(updatedTask);
    },
  },
};
