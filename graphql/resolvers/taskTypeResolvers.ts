import { prisma } from "../prismaClient";

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

// 格式化日期
const formatDate = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString();
};

// 問題觸發條件定義
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

// 提醒設定定義
interface ReminderSetting {
  answer: string;
  message: string;
}

// 補充說明設定定義
interface ExplanationSetting {
  answer: string;
  prompt: string;
}

// 問題類型定義
interface Question {
  id: string;
  label: string;
  type: "TEXT" | "RADIO" | "CHECKBOX";
  options?: string[];
  required?: boolean;
  triggers?: QuestionTrigger[];  // 改為陣列，每個選項可設定不同的後續任務
  reminders?: ReminderSetting[];  // 改為陣列，每個選項可設定不同的提醒
  explanations?: ExplanationSetting[];  // 改為陣列，每個選項可要求補充說明
}

// 格式化問題列表
const formatQuestions = (questions: unknown): Question[] => {
  if (!questions || !Array.isArray(questions)) return [];
  return questions.map((q: Question) => ({
    id: q.id || crypto.randomUUID(),
    label: q.label || "",
    type: q.type || "TEXT",
    options: q.options || [],
    required: q.required || false,
    triggers: q.triggers || [],
    reminders: q.reminders || [],
    explanations: q.explanations || [],
  }));
};

// 格式化任務類型（基本）
const formatTaskTypeBasic = (taskType: {
  id: number;
  code: string;
  label: string;
  description: string | null;
  order: number;
  isActive: boolean;
  questions?: unknown;
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  order: taskType.order,
  isActive: taskType.isActive,
  questions: formatQuestions(taskType.questions),
  positionX: taskType.positionX ?? null,
  positionY: taskType.positionY ?? null,
  outgoingFlows: [],
  incomingFlows: [],
  assignedAdmins: [],
  createdAt: formatDate(taskType.createdAt),
  updatedAt: formatDate(taskType.updatedAt),
});

// 流程關聯類型
interface FlowRelation {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: unknown;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  fromTaskType?: { id: number; code: string; label: string };
  toTaskType?: { id: number; code: string; label: string };
}

// 格式化任務類型（含分配資訊和流程）
interface TaskTypeWithAssignments {
  id: number;
  code: string;
  label: string;
  description: string | null;
  order: number;
  isActive: boolean;
  questions?: unknown;
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
  outgoingFlows?: FlowRelation[];
  incomingFlows?: FlowRelation[];
  assignedAdmins?: Array<{
    id: number;
    adminId: string;
    taskTypeId: number;
    assignedAt: Date;
    assignedBy: string | null;
    admin: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    };
  }>;
}

// 格式化流程
const formatFlow = (flow: FlowRelation) => ({
  id: flow.id,
  fromTaskTypeId: flow.fromTaskTypeId,
  toTaskTypeId: flow.toTaskTypeId,
  label: flow.label,
  condition: flow.condition,
  order: flow.order,
  createdAt: formatDate(flow.createdAt),
  updatedAt: formatDate(flow.updatedAt),
  fromTaskType: flow.fromTaskType ? {
    id: flow.fromTaskType.id,
    code: flow.fromTaskType.code,
    label: flow.fromTaskType.label,
  } : undefined,
  toTaskType: flow.toTaskType ? {
    id: flow.toTaskType.id,
    code: flow.toTaskType.code,
    label: flow.toTaskType.label,
  } : undefined,
});

const formatTaskType = (taskType: TaskTypeWithAssignments) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  order: taskType.order,
  isActive: taskType.isActive,
  questions: formatQuestions(taskType.questions),
  positionX: taskType.positionX ?? null,
  positionY: taskType.positionY ?? null,
  outgoingFlows: (taskType.outgoingFlows || []).map(formatFlow),
  incomingFlows: (taskType.incomingFlows || []).map(formatFlow),
  assignedAdmins: (taskType.assignedAdmins || []).map((assignment) => ({
    id: assignment.id,
    adminId: assignment.adminId,
    taskTypeId: assignment.taskTypeId,
    admin: {
      id: assignment.admin.id,
      name: assignment.admin.name,
      email: assignment.admin.email,
      role: assignment.admin.role,
    },
    taskType: null, // 避免循環引用，在需要時再填充
    assignedAt: formatDate(assignment.assignedAt),
    assignedBy: assignment.assignedBy,
  })),
  createdAt: formatDate(taskType.createdAt),
  updatedAt: formatDate(taskType.updatedAt),
});

export const taskTypeResolvers = {
  Query: {
    // 獲取所有任務類型
    taskTypes: async (
      _: unknown,
      args: { includeInactive?: boolean },
      context: Context
    ) => {
      requireAuth(context);

      const where = args.includeInactive ? {} : { isActive: true };

      const taskTypes = await prisma.taskType.findMany({
        where,
        orderBy: { order: "asc" },
        include: {
          assignedAdmins: {
            include: {
              admin: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          outgoingFlows: {
            include: {
              toTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
          incomingFlows: {
            include: {
              fromTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return taskTypes.map(formatTaskType);
    },

    // 獲取單個任務類型
    taskType: async (_: unknown, args: { id: number }, context: Context) => {
      requireAuth(context);

      const taskType = await prisma.taskType.findUnique({
        where: { id: args.id },
        include: {
          assignedAdmins: {
            include: {
              admin: true,
            },
          },
          outgoingFlows: {
            include: {
              toTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
          incomingFlows: {
            include: {
              fromTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!taskType) return null;
      return formatTaskType(taskType);
    },

    // 獲取所有管理員及其分配的任務類型（僅 SUPER_ADMIN）
    adminsWithAssignments: async (_: unknown, __: unknown, context: Context) => {
      requireSuperAdmin(context);

      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        include: {
          assignedTaskTypes: {
            include: {
              taskType: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return admins.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        assignedTaskTypes: admin.assignedTaskTypes.map((assignment) =>
          formatTaskTypeBasic(assignment.taskType)
        ),
      }));
    },

    // 獲取當前管理員被分配的任務類型（ADMIN 角色用）
    myAssignedTaskTypes: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      // SUPER_ADMIN 可以看到所有任務類型
      if (user.role === "SUPER_ADMIN") {
        const taskTypes = await prisma.taskType.findMany({
          where: { isActive: true },
          orderBy: { order: "asc" },
        });
        return taskTypes.map(formatTaskTypeBasic);
      }

      // ADMIN 只能看到被分配的任務類型
      if (user.role === "ADMIN") {
        const assignments = await prisma.adminTaskTypeAssignment.findMany({
          where: { adminId: user.id },
          include: {
            taskType: true,
          },
        });

        return assignments
          .filter((a) => a.taskType.isActive)
          .map((a) => formatTaskTypeBasic(a.taskType));
      }

      return [];
    },
  },

  Mutation: {
    // 創建任務類型
    createTaskType: async (
      _: unknown,
      args: {
        input: {
          code: string;
          label: string;
          description?: string;
          order?: number;
          questions?: Array<{
            id?: string;
            label: string;
            type: "TEXT" | "RADIO" | "CHECKBOX";
            options?: string[];
            required?: boolean;
            triggers?: Array<{ answer: string; taskTypeId: number }>;
            reminders?: Array<{ answer: string; message: string }>;
            explanations?: Array<{ answer: string; prompt: string }>;
          }>;
          positionX?: number;
          positionY?: number;
        };
      },
      context: Context
    ) => {
      requireSuperAdmin(context);

      // 檢查 code 是否已存在
      const existing = await prisma.taskType.findUnique({
        where: { code: args.input.code },
      });

      if (existing) {
        throw new Error(`類型代碼 "${args.input.code}" 已存在`);
      }

      // 如果沒有指定 order，取最大值 + 1
      let order = args.input.order;
      if (order === undefined) {
        const maxOrder = await prisma.taskType.aggregate({
          _max: { order: true },
        });
        order = (maxOrder._max.order || 0) + 1;
      }

      // 處理問題列表，確保每個問題都有 id
      const questions = (args.input.questions || []).map((q) => ({
        id: q.id || crypto.randomUUID(),
        label: q.label,
        type: q.type,
        options: q.options || [],
        required: q.required || false,
        triggers: q.triggers || [],
        reminders: q.reminders || [],
        explanations: q.explanations || [],
      }));

      const taskType = await prisma.taskType.create({
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          order,
          questions,
          positionX: args.input.positionX,
          positionY: args.input.positionY,
        },
      });

      // 記錄活動日誌
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "create",
          entity: "task_type",
          entityId: taskType.id.toString(),
          details: {
            code: taskType.code,
            label: taskType.label,
          },
        },
      });

      return formatTaskTypeBasic(taskType);
    },

    // 更新任務類型
    updateTaskType: async (
      _: unknown,
      args: {
        input: {
          id: number;
          code?: string;
          label?: string;
          description?: string;
          order?: number;
          isActive?: boolean;
          questions?: Array<{
            id?: string;
            label: string;
            type: "TEXT" | "RADIO" | "CHECKBOX";
            options?: string[];
            required?: boolean;
            triggers?: Array<{ answer: string; taskTypeId: number }>;
            reminders?: Array<{ answer: string; message: string }>;
            explanations?: Array<{ answer: string; prompt: string }>;
          }>;
          positionX?: number;
          positionY?: number;
        };
      },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const existing = await prisma.taskType.findUnique({
        where: { id: args.input.id },
      });

      if (!existing) {
        throw new Error("找不到該任務類型");
      }

      // 如果更新 code，檢查是否重複
      if (args.input.code && args.input.code !== existing.code) {
        const duplicate = await prisma.taskType.findUnique({
          where: { code: args.input.code },
        });
        if (duplicate) {
          throw new Error(`類型代碼 "${args.input.code}" 已存在`);
        }
      }

      // 處理問題列表
      let questions;
      if (args.input.questions !== undefined) {
        questions = args.input.questions.map((q) => ({
          id: q.id || crypto.randomUUID(),
          label: q.label,
          type: q.type,
          options: q.options || [],
          required: q.required || false,
          triggers: q.triggers || [],
          reminders: q.reminders || [],
          explanations: q.explanations || [],
        }));
      }

      const taskType = await prisma.taskType.update({
        where: { id: args.input.id },
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          order: args.input.order,
          isActive: args.input.isActive,
          ...(questions !== undefined && { questions }),
          ...(args.input.positionX !== undefined && { positionX: args.input.positionX }),
          ...(args.input.positionY !== undefined && { positionY: args.input.positionY }),
        },
      });

      // === 雙向同步：問題 triggers → 流程連線 ===
      if (questions !== undefined) {
        // 獲取現有的流程連線
        const existingFlows = await prisma.taskTypeFlow.findMany({
          where: { fromTaskTypeId: args.input.id },
        });

        // 收集問題中所有的 triggers 設定
        const triggersFromQuestions: Array<{
          questionId: string;
          answer: string;
          targetTaskTypeId: number;
        }> = [];

        for (const q of questions) {
          // 現在支援多個 triggers
          if (q.triggers && q.triggers.length > 0) {
            for (const trigger of q.triggers) {
              if (trigger.taskTypeId) {
                triggersFromQuestions.push({
                  questionId: q.id,
                  answer: trigger.answer,
                  targetTaskTypeId: trigger.taskTypeId,
                });
              }
            }
          }
        }

        // 為每個 trigger 創建或更新流程連線
        for (const trigger of triggersFromQuestions) {
          // 檢查是否已存在相同目標和答案的流程
          const existingFlow = existingFlows.find(
            (f) => {
              const condition = f.condition as { questionId?: string; answer?: string } | null;
              return f.toTaskTypeId === trigger.targetTaskTypeId &&
                     condition?.questionId === trigger.questionId &&
                     condition?.answer === trigger.answer;
            }
          );

          if (existingFlow) {
            // 流程已存在，無需更新
          } else {
            // 檢查是否有相同目標但不同條件的流程
            const sameTargetFlow = existingFlows.find(
              (f) => f.toTaskTypeId === trigger.targetTaskTypeId
            );

            if (sameTargetFlow) {
              // 更新現有流程的條件
              await prisma.taskTypeFlow.update({
                where: { id: sameTargetFlow.id },
                data: {
                  condition: {
                    questionId: trigger.questionId,
                    answer: trigger.answer,
                  },
                },
              });
            } else {
              // 創建新的流程連線
              const maxOrder = await prisma.taskTypeFlow.aggregate({
                where: { fromTaskTypeId: args.input.id },
                _max: { order: true },
              });

              await prisma.taskTypeFlow.create({
                data: {
                  fromTaskTypeId: args.input.id,
                  toTaskTypeId: trigger.targetTaskTypeId,
                  condition: {
                    questionId: trigger.questionId,
                    answer: trigger.answer,
                  },
                  order: (maxOrder._max.order || 0) + 1,
                },
              });
            }
          }
        }

        // 注意：不自動刪除沒有 trigger 對應的流程，因為可能是在流程編輯器中手動創建的
      }

      // 記錄活動日誌
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entity: "task_type",
          entityId: taskType.id.toString(),
          details: {
            code: taskType.code,
            label: taskType.label,
            changes: {
              ...(args.input.code && { code: args.input.code }),
              ...(args.input.label && { label: args.input.label }),
              ...(args.input.isActive !== undefined && { isActive: args.input.isActive }),
              ...(args.input.questions && { questionsUpdated: true }),
            },
          },
        },
      });

      return formatTaskTypeBasic(taskType);
    },

    // 刪除任務類型（軟刪除）
    deleteTaskType: async (
      _: unknown,
      args: { id: number },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const existing = await prisma.taskType.findUnique({
        where: { id: args.id },
        include: { tasks: { take: 1 } },
      });

      if (!existing) {
        throw new Error("找不到該任務類型");
      }

      // 如果有關聯的任務，只能軟刪除
      if (existing.tasks.length > 0) {
        await prisma.taskType.update({
          where: { id: args.id },
          data: { isActive: false },
        });
      } else {
        // 沒有關聯任務，可以硬刪除
        await prisma.taskType.delete({
          where: { id: args.id },
        });
      }

      // 記錄活動日誌
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "delete",
          entity: "task_type",
          entityId: args.id.toString(),
          details: {
            code: existing.code,
            label: existing.label,
            softDelete: existing.tasks.length > 0,
          },
        },
      });

      return true;
    },

    // 批量更新排序
    reorderTaskTypes: async (
      _: unknown,
      args: { ids: number[] },
      context: Context
    ) => {
      requireSuperAdmin(context);

      // 批量更新排序
      await Promise.all(
        args.ids.map((id, index) =>
          prisma.taskType.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      const taskTypes = await prisma.taskType.findMany({
        where: { id: { in: args.ids } },
        orderBy: { order: "asc" },
      });

      return taskTypes.map(formatTaskTypeBasic);
    },

    // 分配任務類型給管理員（僅 SUPER_ADMIN）
    assignTaskTypeToAdmin: async (
      _: unknown,
      args: { adminId: string; taskTypeId: number },
      context: Context
    ) => {
      const user = requireSuperAdmin(context);

      // 驗證管理員存在且為 ADMIN 角色
      const admin = await prisma.user.findUnique({
        where: { id: args.adminId },
      });

      if (!admin) {
        throw new Error("找不到該用戶");
      }

      if (admin.role !== "ADMIN") {
        throw new Error("只能分配任務類型給管理員角色");
      }

      // 驗證任務類型存在
      const taskType = await prisma.taskType.findUnique({
        where: { id: args.taskTypeId },
      });

      if (!taskType) {
        throw new Error("找不到該任務類型");
      }

      // 創建分配關聯
      const assignment = await prisma.adminTaskTypeAssignment.create({
        data: {
          adminId: args.adminId,
          taskTypeId: args.taskTypeId,
          assignedBy: user.id,
        },
        include: {
          admin: true,
          taskType: true,
        },
      });

      return {
        id: assignment.id,
        adminId: assignment.adminId,
        taskTypeId: assignment.taskTypeId,
        admin: {
          id: assignment.admin.id,
          name: assignment.admin.name,
          email: assignment.admin.email,
          role: assignment.admin.role,
        },
        taskType: formatTaskTypeBasic(assignment.taskType),
        assignedAt: formatDate(assignment.assignedAt),
        assignedBy: assignment.assignedBy,
      };
    },

    // 移除管理員的任務類型分配（僅 SUPER_ADMIN）
    removeTaskTypeFromAdmin: async (
      _: unknown,
      args: { adminId: string; taskTypeId: number },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const assignment = await prisma.adminTaskTypeAssignment.findUnique({
        where: {
          adminId_taskTypeId: {
            adminId: args.adminId,
            taskTypeId: args.taskTypeId,
          },
        },
      });

      if (!assignment) {
        throw new Error("找不到該分配記錄");
      }

      await prisma.adminTaskTypeAssignment.delete({
        where: { id: assignment.id },
      });

      return true;
    },

    // 批量更新管理員的任務類型分配（僅 SUPER_ADMIN）
    updateAdminTaskTypes: async (
      _: unknown,
      args: { adminId: string; taskTypeIds: number[] },
      context: Context
    ) => {
      const user = requireSuperAdmin(context);

      // 驗證管理員存在且為 ADMIN 角色
      const admin = await prisma.user.findUnique({
        where: { id: args.adminId },
      });

      if (!admin) {
        throw new Error("找不到該用戶");
      }

      if (admin.role !== "ADMIN") {
        throw new Error("只能分配任務類型給管理員角色");
      }

      // 刪除現有的所有分配
      await prisma.adminTaskTypeAssignment.deleteMany({
        where: { adminId: args.adminId },
      });

      // 創建新的分配
      if (args.taskTypeIds.length > 0) {
        await prisma.adminTaskTypeAssignment.createMany({
          data: args.taskTypeIds.map((taskTypeId) => ({
            adminId: args.adminId,
            taskTypeId,
            assignedBy: user.id,
          })),
        });
      }

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entity: "admin_assignment",
          entityId: args.adminId,
          details: {
            adminEmail: admin.email,
            adminName: admin.name,
            taskTypeIds: args.taskTypeIds,
          },
        },
      });

      // 返回更新後的任務類型列表
      const taskTypes = await prisma.taskType.findMany({
        where: { id: { in: args.taskTypeIds } },
        orderBy: { order: "asc" },
      });

      return taskTypes.map(formatTaskTypeBasic);
    },
  },
};
